-- Alertes sur les favoris + compteur public de favoris. À coller dans Supabase : SQL Editor → New query → Run.

-- Choix de l'inscrit : recevoir les alertes sur ses favoris (baisse de prix, rappel)
alter table public.profiles add column if not exists fav_alerts boolean not null default true;
-- Date du rappel « toujours disponible » (un seul rappel par favori)
alter table public.favorites add column if not exists reminded_at timestamptz;

-- Nombre de personnes ayant mis chaque pièce en favori (chiffres seulement, aucune identité)
create or replace function public.fav_counts()
returns table (item_id text, n bigint) language sql security definer set search_path = public stable as $$
  select item_id, count(*) from public.favorites group by item_id;
$$;
grant execute on function public.fav_counts() to anon, authenticated;

-- La désinscription en un clic coupe aussi les alertes favoris
create or replace function public.unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set newsletter = false, alert_cats = '{}', fav_alerts = false where unsub_token = p_token;
  return found;
end;
$$;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;
