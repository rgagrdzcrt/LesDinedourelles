-- Les Dinedourelles : comptes visiteurs (favoris, alertes, fichier clients).
-- À coller une seule fois dans Supabase : SQL Editor → New query → Run.

-- Fiche de chaque inscrit (créée automatiquement à la première connexion)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  consent_at timestamptz,                        -- acceptation de la politique de confidentialité
  newsletter boolean not null default true,      -- nouveautés de la semaine
  alert_cats text[] not null default '{}',       -- catégories suivies (alertes à chaque nouvelle pièce)
  lang text not null default 'fr'
);

-- Favoris (numéro de l'annonce eBay)
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Chacun ne voit et ne modifie que ses propres données
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "profil : lecture" on public.profiles;
drop policy if exists "profil : modification" on public.profiles;
create policy "profil : lecture" on public.profiles for select using (auth.uid() = id);
create policy "profil : modification" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "favoris : lecture" on public.favorites;
drop policy if exists "favoris : ajout" on public.favorites;
drop policy if exists "favoris : suppression" on public.favorites;
create policy "favoris : lecture" on public.favorites for select using (auth.uid() = user_id);
create policy "favoris : ajout" on public.favorites for insert with check (auth.uid() = user_id);
create policy "favoris : suppression" on public.favorites for delete using (auth.uid() = user_id);

-- Création automatique de la fiche à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Suppression de son propre compte (droit à l'effacement, RGPD)
create or replace function public.delete_me()
returns void language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

-- Fichier clients pour Jean-Pierre (Table Editor → clients), avec le nombre de favoris
create or replace view public.clients with (security_invoker = true) as
  select p.email, p.created_at as inscrit_le, p.newsletter, p.alert_cats as alertes,
         (select count(*) from public.favorites f where f.user_id = p.id) as favoris
  from public.profiles p
  order by p.created_at desc;
revoke all on public.clients from anon, authenticated;

-- ===== Ajout : désinscription en un clic depuis les e-mails (à exécuter aussi, une seule fois) =====
alter table public.profiles add column if not exists unsub_token uuid not null default gen_random_uuid();
create or replace function public.unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set newsletter = false, alert_cats = '{}' where unsub_token = p_token;
  return found;
end;
$$;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

-- ===== Ajout : alertes favoris et compteur (voir ajout-favoris.sql) =====
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
