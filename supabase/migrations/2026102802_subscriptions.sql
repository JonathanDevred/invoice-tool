begin;
create table public.gpf_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 subscription_id text not null unique,
 customer_id text not null,
 status text not null,
 current_period_end timestamptz not null,
 cancel_at_period_end boolean not null default false,
 event_created bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.gpf_subscriptions enable row level security;
revoke all on public.gpf_subscriptions from anon,authenticated;
grant select on public.gpf_subscriptions to authenticated;
create policy own_subscription_select on public.gpf_subscriptions for select to authenticated using ((select auth.uid())=user_id);
create table public.gpf_stripe_events(id text primary key,processed_at timestamptz not null default now());
alter table public.gpf_stripe_events enable row level security;
revoke all on public.gpf_stripe_events from anon,authenticated;
create function public.gpf_apply_subscription_event(p_event_id text,p_event_created bigint,p_user_id uuid,p_subscription_id text,p_customer_id text,p_status text,p_period_end timestamptz,p_cancel boolean) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.gpf_stripe_events(id) values(p_event_id) on conflict do nothing;
 if not found then return;end if;
 insert into public.gpf_subscriptions(user_id,subscription_id,customer_id,status,current_period_end,cancel_at_period_end,event_created) values(p_user_id,p_subscription_id,p_customer_id,p_status,p_period_end,p_cancel,p_event_created)
 on conflict(user_id) do update set subscription_id=excluded.subscription_id,customer_id=excluded.customer_id,status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,event_created=excluded.event_created,updated_at=now()
 where (gpf_subscriptions.subscription_id=excluded.subscription_id and gpf_subscriptions.event_created<=excluded.event_created)
 or (gpf_subscriptions.subscription_id<>excluded.subscription_id and (gpf_subscriptions.status in ('canceled','incomplete_expired') or (excluded.status='active' and excluded.current_period_end>=gpf_subscriptions.current_period_end)));
end;$$;
revoke all on function public.gpf_apply_subscription_event(text,bigint,uuid,text,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.gpf_apply_subscription_event(text,bigint,uuid,text,text,text,timestamptz,boolean) to service_role;
grant all on public.gpf_subscriptions,public.gpf_stripe_events to service_role;
create function public.gpf_document_quota(p_payload jsonb) returns boolean language sql security definer stable set search_path=public,pg_temp as $$
 select case when auth.uid() is null or jsonb_typeof(p_payload->'invoices')<>'array' then false else
 jsonb_array_length(p_payload->'invoices')<=10
 or jsonb_array_length(p_payload->'invoices')<=coalesce((select jsonb_array_length(w.payload->'invoices') from public.gpf_workspaces w where w.user_id=auth.uid()),0)
 or exists(select 1 from public.gpf_subscriptions s where s.user_id=auth.uid() and s.status='active' and s.current_period_end>now()) end;
$$;
revoke all on function public.gpf_document_quota(jsonb) from public,anon;
grant execute on function public.gpf_document_quota(jsonb) to authenticated;
alter policy own_workspace_insert on public.gpf_workspaces with check ((select auth.uid())=user_id and public.gpf_document_quota(payload));
alter policy own_workspace_update on public.gpf_workspaces with check ((select auth.uid())=user_id and public.gpf_document_quota(payload));
commit;
