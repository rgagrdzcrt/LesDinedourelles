-- Désinscription en un clic depuis les e-mails. À coller dans Supabase : SQL Editor → New query → Run.
alter table public.profiles add column if not exists unsub_token uuid not null default gen_random_uuid();
create or replace function public.unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set newsletter = false, alert_cats = '{}' where unsub_token = p_token;
  return found;
end;
$$;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;
