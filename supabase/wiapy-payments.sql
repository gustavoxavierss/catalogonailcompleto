-- Applied to the isolated nail_catalog schema, never to the hotel's public schema.
alter table nail_catalog.orders add column plan text not null default 'single' check(plan in ('single','monthly','monthly_access'));
alter table nail_catalog.orders add column checkout_id text;
alter table nail_catalog.orders add column subscription_id text;
alter table nail_catalog.orders drop constraint orders_amount_check;
alter table nail_catalog.orders add constraint orders_amount_plan_check check((plan='monthly_access' and amount=0) or (plan<>'monthly_access' and amount>0));
drop index nail_catalog.orders_one_active_version;
create unique index orders_one_active_single on nail_catalog.orders(version_id) where plan='single' and status in ('pending','processing','paid');
create unique index orders_one_monthly_revision on nail_catalog.orders(version_id) where plan='monthly_access' and status='paid';
create table nail_catalog.subscriptions(
 gateway_id text primary key, user_id uuid not null references auth.users on delete cascade,
 catalog_id uuid not null, source_order_id uuid not null references nail_catalog.orders,
 active boolean not null default false, expires_at timestamptz, last_event_at timestamptz not null,
 foreign key(catalog_id,user_id) references nail_catalog.catalogs(id,user_id)
);
alter table nail_catalog.subscriptions enable row level security;
revoke all on nail_catalog.subscriptions from public,anon,authenticated;
grant all on nail_catalog.subscriptions to service_role;
grant select on nail_catalog.subscriptions to authenticated;
create policy subscription_owner_read on nail_catalog.subscriptions for select to authenticated using((select auth.uid())=user_id);
create index subscriptions_owner on nail_catalog.subscriptions(user_id,catalog_id,expires_at);
alter table nail_catalog.orders add constraint orders_subscription_fk foreign key(subscription_id) references nail_catalog.subscriptions(gateway_id) deferrable initially deferred;
update nail_catalog.app_settings set value=value || '{"monthlyPriceCents":1599}'::jsonb where id=1;

create function nail_catalog.begin_wiapy_checkout(p_catalog uuid,p_user uuid,p_plan text,p_checkout text) returns nail_catalog.orders language plpgsql set search_path='' as $$
declare c nail_catalog.catalogs; v uuid; o nail_catalog.orders; price integer;
begin
if p_plan not in ('single','monthly') then raise exception 'INVALID_PLAN'; end if;
select * into c from nail_catalog.catalogs where id=p_catalog and user_id=p_user for update;
if not found then raise exception 'NOT_FOUND'; end if;
select (value->>case when p_plan='monthly' then 'monthlyPriceCents' else 'priceCents' end)::integer into price from nail_catalog.app_settings where id=1;
insert into nail_catalog.catalog_versions(catalog_id,user_id,revision,snapshot) values(c.id,p_user,c.revision,c.document) on conflict(catalog_id,revision) do nothing;
select id into v from nail_catalog.catalog_versions where catalog_id=c.id and revision=c.revision;
select * into o from nail_catalog.orders where version_id=v and plan=p_plan and status in ('pending','processing','paid') and (expires_at is null or expires_at>now()) order by created_at desc limit 1;
if found then return o; end if;
update nail_catalog.orders set status='expired',updated_at=now() where version_id=v and plan=p_plan and status in ('pending','processing') and expires_at<=now();
insert into nail_catalog.orders(user_id,catalog_id,version_id,amount,currency,plan,checkout_id,expires_at) values(p_user,c.id,v,price,'BRL',p_plan,p_checkout,now()+interval '24 hours') returning * into o;
insert into nail_catalog.analytics_events(name,user_id,catalog_id,order_id) values('checkout_started',p_user,c.id,o.id);
return o;
end $$;

create function nail_catalog.confirm_wiapy_payment(p_event text,p_order uuid,p_transaction text,p_checkout text,p_amount integer,p_status nail_catalog.payment_status,p_occurred timestamptz,p_hash text,p_plan text,p_subscription text,p_until timestamptz) returns uuid language plpgsql set search_path='' as $$
declare o nail_catalog.orders; sub nail_catalog.subscriptions; source uuid;
begin
-- Serialize a transaction even before an order has been bound to it.
perform pg_advisory_xact_lock(hashtextextended(p_transaction,0));
select * into o from nail_catalog.orders where gateway_transaction_id=p_transaction for update;
if not found and p_order is not null then select * into o from nail_catalog.orders where id=p_order for update; end if;
if o.id is null and p_subscription is not null then
 select * into sub from nail_catalog.subscriptions where gateway_id=p_subscription for update;
 select * into o from nail_catalog.orders where id=sub.source_order_id for update;
end if;
if o.id is null or o.plan<>p_plan or o.checkout_id<>p_checkout or o.amount<>p_amount or o.currency<>'BRL' then raise exception 'PAYMENT_MISMATCH'; end if;
if p_occurred > now() + interval '5 minutes' then raise exception 'INVALID_EVENT_TIME'; end if;
if p_order is not null and p_order<>o.id and not exists(select 1 from nail_catalog.subscriptions where gateway_id=p_subscription and source_order_id=p_order and user_id=o.user_id and catalog_id=o.catalog_id) then raise exception 'ORDER_REFERENCE_MISMATCH'; end if;
if p_plan='monthly' then
 if p_subscription is null then raise exception 'SUBSCRIPTION_REQUIRED'; end if;
 select * into sub from nail_catalog.subscriptions where gateway_id=p_subscription for update;
 if found and (sub.user_id<>o.user_id or sub.catalog_id<>o.catalog_id) then raise exception 'SUBSCRIPTION_OWNER_MISMATCH'; end if;
 if p_status='paid' and (p_until is null or p_until<=p_occurred) then raise exception 'SUBSCRIPTION_PERIOD_REQUIRED'; end if;
end if;
if o.gateway_transaction_id is not null and o.gateway_transaction_id<>p_transaction then
 if p_plan<>'monthly' or sub.gateway_id is null or o.subscription_id is distinct from p_subscription then raise exception 'TRANSACTION_ALREADY_BOUND'; end if;
 source:=o.id;
 insert into nail_catalog.orders(user_id,catalog_id,version_id,amount,currency,plan,checkout_id,subscription_id) values(o.user_id,o.catalog_id,o.version_id,p_amount,'BRL','monthly',p_checkout,p_subscription) returning * into o;
end if;
insert into nail_catalog.webhook_events(id,gateway,order_id,payload_hash) values(p_event,'wiapy',o.id,p_hash) on conflict do nothing;
if not found then return o.id; end if;
if (o.last_event_at is not null and p_occurred<o.last_event_at) or o.status='refunded' or (o.status='paid' and p_status not in ('paid','refunded')) then return o.id; end if;
if source is null and o.gateway_transaction_id is null and p_occurred<o.created_at-interval '5 minutes' then raise exception 'PAYMENT_PREDATES_ORDER'; end if;
update nail_catalog.orders set gateway='wiapy',gateway_transaction_id=p_transaction,status=p_status,last_event_at=p_occurred,subscription_id=p_subscription,paid_at=case when p_status='paid' then coalesce(paid_at,now()) else paid_at end,updated_at=now() where id=o.id;
insert into nail_catalog.payments(order_id,user_id,transaction_id,amount,status) values(o.id,o.user_id,p_transaction,p_amount,p_status) on conflict(order_id) do update set status=excluded.status,updated_at=now();
if p_plan='monthly' then
 insert into nail_catalog.subscriptions(gateway_id,user_id,catalog_id,source_order_id,active,expires_at,last_event_at) values(p_subscription,o.user_id,o.catalog_id,o.id,p_status='paid',p_until,p_occurred)
 on conflict(gateway_id) do update set active=case when p_status='refunded' then false when p_status='paid' then true else nail_catalog.subscriptions.active end,expires_at=case when p_status='paid' then p_until else nail_catalog.subscriptions.expires_at end,last_event_at=p_occurred where nail_catalog.subscriptions.last_event_at<=p_occurred;
end if;
if p_status='paid' then insert into nail_catalog.pdf_jobs(order_id) values(o.id) on conflict do nothing; end if;
if o.status is distinct from p_status then insert into nail_catalog.analytics_events(name,user_id,catalog_id,order_id) values(case p_status when 'paid' then 'payment_approved' when 'failed' then 'payment_failed' else 'payment_'||p_status::text end,o.user_id,o.catalog_id,o.id); end if;
return o.id;
end $$;

create function nail_catalog.monthly_catalog_order(p_catalog uuid,p_user uuid) returns uuid language plpgsql set search_path='' as $$
declare c nail_catalog.catalogs; sub nail_catalog.subscriptions; v uuid; result uuid;
begin
select * into c from nail_catalog.catalogs where id=p_catalog and user_id=p_user for update;
if not found then raise exception 'NOT_FOUND'; end if;
select * into sub from nail_catalog.subscriptions where catalog_id=p_catalog and user_id=p_user and active and expires_at>now() order by expires_at desc limit 1;
if not found then return null; end if;
insert into nail_catalog.catalog_versions(catalog_id,user_id,revision,snapshot) values(c.id,p_user,c.revision,c.document) on conflict(catalog_id,revision) do nothing;
select id into v from nail_catalog.catalog_versions where catalog_id=c.id and revision=c.revision;
select id into result from nail_catalog.orders where version_id=v and plan='monthly_access' and status='paid';
if result is not null then update nail_catalog.orders set subscription_id=sub.gateway_id where id=result; return result; end if;
insert into nail_catalog.orders(user_id,catalog_id,version_id,amount,currency,status,plan,subscription_id,gateway,paid_at) values(p_user,c.id,v,0,'BRL','paid','monthly_access',sub.gateway_id,'wiapy',now()) returning id into result;
insert into nail_catalog.pdf_jobs(order_id) values(result) on conflict do nothing;
return result;
end $$;
revoke all on function nail_catalog.begin_wiapy_checkout(uuid,uuid,text,text),nail_catalog.confirm_wiapy_payment(text,uuid,text,text,integer,nail_catalog.payment_status,timestamptz,text,text,text,timestamptz),nail_catalog.monthly_catalog_order(uuid,uuid) from public,anon,authenticated;
grant execute on function nail_catalog.begin_wiapy_checkout(uuid,uuid,text,text),nail_catalog.confirm_wiapy_payment(text,uuid,text,text,integer,nail_catalog.payment_status,timestamptz,text,text,text,timestamptz),nail_catalog.monthly_catalog_order(uuid,uuid) to service_role;

