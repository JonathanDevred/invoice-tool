begin;
create table public.gpf_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=10485760),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.gpf_workspaces enable row level security;
revoke all on public.gpf_workspaces from anon, authenticated;
grant select,insert,update on public.gpf_workspaces to authenticated;
create policy own_workspace_select on public.gpf_workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy own_workspace_insert on public.gpf_workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy own_workspace_update on public.gpf_workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.gpf_purchases (
 session_id text primary key check(session_id ~ '^cs_[A-Za-z0-9_]{10,240}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index gpf_purchases_owner on public.gpf_purchases(user_id,created_at desc);
alter table public.gpf_purchases enable row level security;
revoke all on public.gpf_purchases from anon, authenticated;
grant select,insert on public.gpf_purchases to authenticated;
create policy own_purchase_select on public.gpf_purchases for select to authenticated using ((select auth.uid())=user_id);
create policy own_purchase_insert on public.gpf_purchases for insert to authenticated with check ((select auth.uid())=user_id and created_at between now()-interval '1 minute' and now()+interval '1 minute');
create table public.gpf_health (
 id integer primary key check(id=1),
 status text not null default 'ready'
);
insert into public.gpf_health(id,status) values (1,'ready');
alter table public.gpf_health enable row level security;
revoke all on public.gpf_health from anon,authenticated;
grant select on public.gpf_health to anon,authenticated;
create policy public_health_read on public.gpf_health for select to anon,authenticated using (id=1);
commit;
