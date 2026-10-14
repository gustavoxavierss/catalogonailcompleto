create table public.backend_nonces(nonce uuid primary key, created_at timestamptz not null default now());
alter table public.backend_nonces enable row level security;
revoke all on public.backend_nonces from public,anon,authenticated;
grant all on public.backend_nonces to service_role;
create index backend_nonces_created on public.backend_nonces(created_at);
create function public.claim_backend_nonce(p_nonce uuid) returns boolean language plpgsql set search_path='' as $$
begin
delete from public.backend_nonces where created_at < now() - interval '2 minutes';
insert into public.backend_nonces(nonce) values(p_nonce) on conflict do nothing;
return found;
end $$;
revoke all on function public.claim_backend_nonce(uuid) from public,anon,authenticated;
grant execute on function public.claim_backend_nonce(uuid) to service_role;
