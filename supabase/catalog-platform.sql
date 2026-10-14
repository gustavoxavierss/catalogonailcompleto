create schema if not exists nail_catalog;
grant usage on schema nail_catalog to anon,authenticated,service_role;
-- Supabase PostgreSQL. All business writes go through the authenticated backend.
create type nail_catalog.payment_status as enum ('pending','processing','paid','failed','cancelled','refunded','expired');
create table nail_catalog.profiles(id uuid primary key references auth.users on delete cascade,name text not null,email text not null,terms_version text not null default '2026-10-13',accepted_at timestamptz not null default now(),created_at timestamptz not null default now());
create table nail_catalog.admin_users(user_id uuid primary key references auth.users on delete cascade);
create table nail_catalog.app_settings(id integer primary key check(id=1),value jsonb not null,updated_at timestamptz not null default now());
insert into nail_catalog.app_settings(id,value) values(1,'{"name":"Meu Catálogo Nail","priceCents":1990,"currency":"BRL","supportEmail":"","supportWhatsapp":"","logo":""}');
create table nail_catalog.catalogs(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,document jsonb not null,revision integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,user_id));
create index catalogs_owner on nail_catalog.catalogs(user_id,updated_at desc);
create table nail_catalog.categories(id uuid primary key,catalog_id uuid not null,user_id uuid not null,name text not null,position integer not null,foreign key(catalog_id,user_id) references nail_catalog.catalogs(id,user_id) on delete cascade,unique(id,catalog_id,user_id));
create table nail_catalog.services(id uuid primary key,catalog_id uuid not null,user_id uuid not null,category_id uuid,name text not null,description text not null,price integer not null check(price>=0),promotion integer check(promotion>=0 and promotion<price),duration text,note text,position integer not null,foreign key(catalog_id,user_id) references nail_catalog.catalogs(id,user_id) on delete cascade,foreign key(category_id,catalog_id,user_id) references nail_catalog.categories(id,catalog_id,user_id),unique(id,catalog_id,user_id));
create table nail_catalog.assets(id uuid primary key,user_id uuid not null,catalog_id uuid not null,path text not null unique,bytes integer not null check(bytes>0),created_at timestamptz not null default now(),foreign key(catalog_id,user_id) references nail_catalog.catalogs(id,user_id) on delete cascade);
create table nail_catalog.service_images(id uuid primary key,service_id uuid not null,catalog_id uuid not null,user_id uuid not null,path text not null,position integer not null,foreign key(service_id,catalog_id,user_id) references nail_catalog.services(id,catalog_id,user_id) on delete cascade);
create table nail_catalog.social_links(id uuid primary key,catalog_id uuid not null,user_id uuid not null,kind text not null,label text,value text,visible boolean not null default true,foreign key(catalog_id,user_id) references nail_catalog.catalogs(id,user_id) on delete cascade);
create table nail_catalog.catalog_versions(id uuid primary key default gen_random_uuid(),catalog_id uuid not null,user_id uuid not null,revision integer not null,snapshot jsonb not null,created_at timestamptz not null default now(),foreign key(catalog_id,user_id) references nail_catalog.catalogs(id,user_id),unique(catalog_id,revision),unique(id,catalog_id,user_id));
create table nail_catalog.orders(id uuid primary key default gen_random_uuid(),user_id uuid not null,catalog_id uuid not null,version_id uuid not null,amount integer not null check(amount>0),currency text not null check(currency='BRL'),status nail_catalog.payment_status not null default 'pending',gateway text not null default 'qiapay',gateway_order_id text unique,gateway_transaction_id text unique,checkout_url text,expires_at timestamptz,paid_at timestamptz,last_event_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(version_id,catalog_id,user_id) references nail_catalog.catalog_versions(id,catalog_id,user_id),unique(id,user_id));
create unique index orders_one_active_version on nail_catalog.orders(version_id) where status in ('pending','processing','paid');
alter table nail_catalog.orders add column checkout_claimed_at timestamptz;
create index orders_owner on nail_catalog.orders(user_id,catalog_id,created_at desc);
create table nail_catalog.payments(id uuid primary key default gen_random_uuid(),order_id uuid not null unique references nail_catalog.orders,user_id uuid not null references auth.users,transaction_id text not null unique,amount integer not null,status nail_catalog.payment_status not null,updated_at timestamptz not null default now());
create table nail_catalog.webhook_events(id text primary key,gateway text not null,order_id uuid not null references nail_catalog.orders,payload_hash text not null,created_at timestamptz not null default now());
create table nail_catalog.pdf_files(id uuid primary key default gen_random_uuid(),order_id uuid not null unique,user_id uuid not null,path text not null unique,created_at timestamptz not null default now(),foreign key(order_id,user_id) references nail_catalog.orders(id,user_id));
create table nail_catalog.pdf_jobs(order_id uuid primary key references nail_catalog.orders,status text not null default 'pending' check(status in ('pending','processing','done','failed')),attempts integer not null default 0,locked_at timestamptz,updated_at timestamptz not null default now());
create table nail_catalog.analytics_events(id bigint generated always as identity primary key,name text not null,user_id uuid not null references auth.users,catalog_id uuid references nail_catalog.catalogs,order_id uuid references nail_catalog.orders,created_at timestamptz not null default now());
create index analytics_funnel on nail_catalog.analytics_events(name,created_at);
create table nail_catalog.rate_limits(key text primary key,count integer not null,window_at timestamptz not null);
do $$ declare t text; begin
foreach t in array array['profiles','admin_users','app_settings','catalogs','categories','services','assets','service_images','social_links','catalog_versions','orders','payments','webhook_events','pdf_files','pdf_jobs','analytics_events','rate_limits'] loop
execute format('alter table nail_catalog.%I enable row level security',t);
execute format('revoke all on nail_catalog.%I from anon, authenticated',t);
execute format('grant all on nail_catalog.%I to service_role',t);
end loop;
foreach t in array array['catalogs','categories','services','assets','service_images','social_links','catalog_versions','orders','payments','pdf_files'] loop
execute format('grant select on nail_catalog.%I to authenticated',t);
execute format('create policy owner_read on nail_catalog.%I for select to authenticated using ((select auth.uid()) = user_id)',t);
execute format('create index on nail_catalog.%I(user_id)',t);
end loop; end $$;
grant select on nail_catalog.profiles to authenticated;
create policy profile_read on nail_catalog.profiles for select to authenticated using((select auth.uid())=id);
grant usage,select on all sequences in schema nail_catalog to service_role;

create function nail_catalog.save_catalog(p_id uuid,p_user uuid,p_revision integer,p_doc jsonb) returns integer language plpgsql set search_path='' as $$
declare current_revision integer; cat jsonb; svc jsonb; img jsonb; link jsonb; pos integer; ipos integer;
begin
select revision into current_revision from nail_catalog.catalogs where id=p_id and user_id=p_user for update;
if not found then raise exception 'NOT_FOUND'; end if;
if current_revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
delete from nail_catalog.service_images where catalog_id=p_id;
delete from nail_catalog.services where catalog_id=p_id;
delete from nail_catalog.categories where catalog_id=p_id;
delete from nail_catalog.social_links where catalog_id=p_id;
pos:=0;
for cat in select * from jsonb_array_elements(p_doc->'categories') loop
insert into nail_catalog.categories values((cat->>'id')::uuid,p_id,p_user,cat->>'name',pos);pos:=pos+1;end loop;
pos:=0;
for svc in select * from jsonb_array_elements(p_doc->'services') loop
insert into nail_catalog.services values((svc->>'id')::uuid,p_id,p_user,(svc->>'categoryId')::uuid,svc->>'name',svc->>'description',(svc->>'price')::integer,(svc->>'promotion')::integer,svc->>'duration',svc->>'note',pos);pos:=pos+1;ipos:=0;
for img in select * from jsonb_array_elements(svc->'images') loop
insert into nail_catalog.service_images values((img->>'id')::uuid,(svc->>'id')::uuid,p_id,p_user,img->>'path',ipos);ipos:=ipos+1;end loop;
end loop;
for link in select * from jsonb_array_elements(p_doc->'contacts') loop
insert into nail_catalog.social_links values((link->>'id')::uuid,p_id,p_user,link->>'kind',link->>'label',link->>'value',(link->>'visible')::boolean);end loop;
update nail_catalog.catalogs set document=p_doc,revision=revision+1,updated_at=now() where id=p_id;
return current_revision+1;
end $$;

create function nail_catalog.begin_checkout(p_catalog uuid,p_user uuid) returns nail_catalog.orders language plpgsql set search_path='' as $$
declare c nail_catalog.catalogs; v uuid; o nail_catalog.orders; price integer;
begin
select * into c from nail_catalog.catalogs where id=p_catalog and user_id=p_user for update;
if not found then raise exception 'NOT_FOUND';end if;
select (value->>'priceCents')::integer into price from nail_catalog.app_settings where id=1;
insert into nail_catalog.catalog_versions(catalog_id,user_id,revision,snapshot) values(c.id,p_user,c.revision,c.document) on conflict(catalog_id,revision) do nothing;
select id into v from nail_catalog.catalog_versions where catalog_id=c.id and revision=c.revision;
select * into o from nail_catalog.orders where version_id=v and status in ('pending','processing','paid');
if found then return o;end if;
insert into nail_catalog.orders(user_id,catalog_id,version_id,amount,currency) values(p_user,c.id,v,price,'BRL') returning * into o;
insert into nail_catalog.analytics_events(name,user_id,catalog_id,order_id) values('checkout_started',p_user,c.id,o.id);
return o;
end $$;

create function nail_catalog.confirm_payment(p_event text,p_order uuid,p_transaction text,p_gateway_order text,p_amount integer,p_currency text,p_status nail_catalog.payment_status,p_occurred timestamptz,p_hash text) returns boolean language plpgsql set search_path='' as $$
declare o nail_catalog.orders;
begin
select * into o from nail_catalog.orders where id=p_order for update;
if not found or o.gateway_transaction_id is distinct from p_transaction or o.gateway_order_id is distinct from p_gateway_order or o.amount<>p_amount or o.currency<>p_currency then raise exception 'PAYMENT_MISMATCH';end if;
insert into nail_catalog.webhook_events(id,gateway,order_id,payload_hash) values(p_event,o.gateway,o.id,p_hash) on conflict do nothing;
if not found then return false;end if;
if o.last_event_at is not null and p_occurred<o.last_event_at then return false;end if;
if o.status='refunded' or (o.status='paid' and p_status not in ('paid','refunded')) then return false;end if;
update nail_catalog.orders set status=p_status,last_event_at=p_occurred,paid_at=case when p_status='paid' then coalesce(paid_at,now()) else paid_at end,updated_at=now() where id=o.id;
insert into nail_catalog.payments(order_id,user_id,transaction_id,amount,status) values(o.id,o.user_id,p_transaction,p_amount,p_status) on conflict(order_id) do update set status=excluded.status,updated_at=now();
if p_status='paid' then insert into nail_catalog.pdf_jobs(order_id) values(o.id) on conflict do nothing;end if;
if o.status is distinct from p_status then insert into nail_catalog.analytics_events(name,user_id,catalog_id,order_id) values(case p_status when 'paid' then 'payment_approved' when 'failed' then 'payment_failed' else 'payment_'||p_status::text end,o.user_id,o.catalog_id,o.id);end if;
return true;
end $$;

create function nail_catalog.take_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin
insert into nail_catalog.rate_limits values(p_key,1,now()) on conflict(key) do update set count=case when nail_catalog.rate_limits.window_at<now()-make_interval(secs=>p_seconds) then 1 else nail_catalog.rate_limits.count+1 end,window_at=case when nail_catalog.rate_limits.window_at<now()-make_interval(secs=>p_seconds) then now() else nail_catalog.rate_limits.window_at end returning count into n;
return n<=p_limit;
end $$;
revoke execute on all functions in schema nail_catalog from public,anon,authenticated;
grant execute on all functions in schema nail_catalog to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalog-images','catalog-images',false,4194304,array['image/jpeg']),('catalog-pdfs','catalog-pdfs',false,52428800,array['application/pdf']) on conflict(id) do nothing;
-- No browser storage policies: downloads/uploads are authorized by server routes.

create function nail_catalog.claim_pdf_job(p_order uuid) returns boolean language plpgsql set search_path='' as $$
begin
update nail_catalog.pdf_jobs set status='processing',attempts=attempts+1,locked_at=now(),updated_at=now() where order_id=p_order and (status in ('pending','failed') or (status='processing' and locked_at<now()-interval '5 minutes')) and exists(select 1 from nail_catalog.orders where id=p_order and status='paid');
return found;
end $$;
revoke all on function nail_catalog.claim_pdf_job(uuid) from public,anon,authenticated;
grant execute on function nail_catalog.claim_pdf_job(uuid) to service_role;

create function nail_catalog.admin_summary() returns jsonb language sql set search_path='' as $$
select jsonb_build_object('users',(select count(*) from nail_catalog.profiles),'catalogs',(select count(*) from nail_catalog.catalogs),'pending',(select count(*) from nail_catalog.orders where status in ('pending','processing')),'paid',(select count(*) from nail_catalog.orders where status='paid'),'revenue',(select coalesce(sum(amount),0) from nail_catalog.orders where status='paid'),'pdfs',(select count(*) from nail_catalog.pdf_files),'funnel',(select jsonb_object_agg(event,n) from (select e.event,count(distinct a.user_id) n from unnest(array['catalog_created','catalog_completed','checkout_started','payment_approved','pdf_downloaded']) e(event) left join nail_catalog.analytics_events a on a.name=e.event group by e.event) f));
$$;
create function nail_catalog.admin_payments(p_query text,p_offset integer) returns table(id uuid,name text,email text,catalog_name text,amount integer,gateway text,status nail_catalog.payment_status,created_at timestamptz,gateway_transaction_id text) language sql set search_path='' as $$
select o.id,p.name,p.email,coalesce(nullif(v.snapshot->>'business',''),v.snapshot->>'professional'),o.amount,o.gateway,o.status,o.created_at,o.gateway_transaction_id from nail_catalog.orders o left join nail_catalog.profiles p on p.id=o.user_id join nail_catalog.catalog_versions v on v.id=o.version_id where p_query='' or strpos(lower(concat_ws(' ',p.name,p.email,o.id::text,o.gateway_transaction_id)),lower(p_query))>0 order by o.created_at desc limit 30 offset greatest(p_offset,0);
$$;
revoke all on function nail_catalog.admin_summary(),nail_catalog.admin_payments(text,integer) from public,anon,authenticated;
grant execute on function nail_catalog.admin_summary(),nail_catalog.admin_payments(text,integer) to service_role;

create function nail_catalog.claim_checkout(p_order uuid,p_user uuid) returns boolean language plpgsql set search_path='' as $$
begin
update nail_catalog.orders set checkout_claimed_at=now() where id=p_order and user_id=p_user and status='pending' and checkout_claimed_at is null and gateway_transaction_id is null;
return found;
end $$;
revoke all on function nail_catalog.claim_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function nail_catalog.claim_checkout(uuid,uuid) to service_role;

create table nail_catalog.backend_nonces(nonce uuid primary key, created_at timestamptz not null default now());
alter table nail_catalog.backend_nonces enable row level security;
revoke all on nail_catalog.backend_nonces from public,anon,authenticated;
grant all on nail_catalog.backend_nonces to service_role;
create index backend_nonces_created on nail_catalog.backend_nonces(created_at);
create function nail_catalog.claim_backend_nonce(p_nonce uuid) returns boolean language plpgsql set search_path='' as $$
begin
delete from nail_catalog.backend_nonces where created_at < now() - interval '2 minutes';
insert into nail_catalog.backend_nonces(nonce) values(p_nonce) on conflict do nothing;
return found;
end $$;
revoke all on function nail_catalog.claim_backend_nonce(uuid) from public,anon,authenticated;
grant execute on function nail_catalog.claim_backend_nonce(uuid) to service_role;


