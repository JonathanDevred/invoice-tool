begin;
alter table public.gpf_subscriptions add column entitlement_active boolean not null default false;
create function public.gpf_record_subscription_snapshot(p_event_id text,p_observed_at bigint,p_user_id uuid,p_subscription_id text,p_customer_id text,p_status text,p_period_end timestamptz,p_cancel boolean,p_entitled boolean) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if p_event_id is not null then
  insert into public.gpf_stripe_events(id) values(p_event_id) on conflict do nothing;
  if not found then return;end if;
 end if;
 insert into public.gpf_subscriptions(user_id,subscription_id,customer_id,status,current_period_end,cancel_at_period_end,event_created,entitlement_active) values(p_user_id,p_subscription_id,p_customer_id,p_status,p_period_end,p_cancel,p_observed_at,p_entitled)
 on conflict(user_id) do update set subscription_id=excluded.subscription_id,customer_id=excluded.customer_id,status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,event_created=excluded.event_created,entitlement_active=excluded.entitlement_active,updated_at=now()
 where (gpf_subscriptions.subscription_id=excluded.subscription_id and gpf_subscriptions.event_created<=excluded.event_created)
 or (gpf_subscriptions.subscription_id<>excluded.subscription_id and (gpf_subscriptions.status in ('canceled','incomplete_expired') or (excluded.entitlement_active and excluded.current_period_end>=gpf_subscriptions.current_period_end)));
end;$$;
revoke all on function public.gpf_record_subscription_snapshot(text,bigint,uuid,text,text,text,timestamptz,boolean,boolean) from public,anon,authenticated;
grant execute on function public.gpf_record_subscription_snapshot(text,bigint,uuid,text,text,text,timestamptz,boolean,boolean) to service_role;
create or replace function public.gpf_document_quota(p_payload jsonb) returns boolean language sql security definer stable set search_path=public,pg_temp as $$
 select case when auth.uid() is null or jsonb_typeof(p_payload->'invoices') is distinct from 'array' then false else
 jsonb_array_length(p_payload->'invoices')<=2000 and (
 jsonb_array_length(p_payload->'invoices')<=10
 or jsonb_array_length(p_payload->'invoices')<=coalesce((select jsonb_array_length(w.payload->'invoices') from public.gpf_workspaces w where w.user_id=auth.uid()),0)
 or exists(select 1 from public.gpf_subscriptions s where s.user_id=auth.uid() and s.status='active' and s.entitlement_active and s.current_period_end>now())) end;
$$;
commit;
