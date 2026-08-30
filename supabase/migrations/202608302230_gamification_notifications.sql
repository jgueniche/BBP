-- Session 12: streaks, badges, challenges, push subscriptions, notification log.

create table public.badges (
  slug text primary key,
  name text not null,
  description text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

alter table public.badges enable row level security;
create policy "badges_select_all" on public.badges for select using (true);

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_slug text not null references public.badges(slug) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_slug)
);

alter table public.user_badges enable row level security;
create policy "user_badges_all" on public.user_badges
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.streaks (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('journal', 'sport', 'pesee')),
  current int not null default 0,
  best int not null default 0,
  last_date date,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.streaks enable row level security;
create policy "streaks_all" on public.streaks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.challenges (
  slug text primary key,
  name text not null,
  description text not null,
  icon text not null,
  metric text not null check (metric in ('journal_days', 'distance_km', 'sessions', 'protein_recipes')),
  target numeric(10, 1) not null,
  collective boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;
create policy "challenges_select_all" on public.challenges for select using (true);

create table public.challenge_participants (
  challenge_slug text not null references public.challenges(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress numeric(10, 1) not null default 0,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (challenge_slug, user_id)
);

alter table public.challenge_participants enable row level security;
create policy "challenge_participants_all" on public.challenge_participants
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger challenge_participants_updated_at
  before update on public.challenge_participants
  for each row execute function public.set_updated_at();

-- Collective totals across every participant (definer: RLS hides others).
create or replace function public.challenge_totals(challenge text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'participants', count(*),
    'total', coalesce(sum(progress), 0)
  )
  from challenge_participants
  where challenge_slug = challenge;
$$;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_all" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sent-notification log: doubles as the 2-per-day nudge cap.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('nudge_matin', 'nudge_soir', 'erev_chabbat', 'recap_hebdo', 'badge')),
  title text not null,
  body text not null,
  url text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- Seeds — annexe B badges.
insert into public.badges (slug, name, description, icon) values
('premiere-boulette', 'Première boulette', 'Ton tout premier repas noté dans le journal.', '🥘'),
('semaine-sahha', 'Semaine sahha', '7 jours de journal d''affilée (chabbat toléré).', '📔'),
('chabbat-chalom', 'Chabbat chalom', 'Ton premier planning avec les repas de chabbat.', '🕯️'),
('roi-couscous', 'Roi·ne du couscous', '10 recettes publiées dans la communauté.', '👑'),
('boutargue-dor', 'Boutargue d''or', 'Une de tes recettes a reçu 100 bsahtek.', '🏆'),
('meme-approuve', 'Mémé approuve', 'Ta première recette partagée dans un carnet de famille.', '👵'),
('yalla', 'Yalla', 'Ta première séance de sport terminée.', '💪'),
('marcheur-belleville', 'Marcheur·se de Belleville', '100 km de marche cumulés.', '👟'),
('belek-le-beurre', 'Belek le beurre', '7 jours en respectant le délai viande → lait.', '🧈'),
('pessah-sans-hametz', 'Pessah sans hametz', '8 jours de Pessah au journal, zéro hametz.', '🫓'),
('apres-fetes', 'Après-fêtes', 'La semaine de recadrage doux bouclée après les fêtes.', '🌿'),
('moins-5', '−5 %', 'Tendance de poids en baisse de 5 %.', '📉'),
('moins-10', '−10 %', 'Tendance de poids en baisse de 10 %.', '🎯'),
('tata-fiere', 'Tata fière', '30 jours de streak journal — Kémia en pleure.', '🧡'),
('importateur', 'Importateur·rice', '10 recettes importées depuis le web ou les réseaux.', '📥'),
('kif-kif', 'Kif-kif', 'Un mois en mode Boutargue avec un poids stable.', '⚖️')
on conflict (slug) do nothing;

-- Seeds — annexe C challenges.
insert into public.challenges (slug, name, description, icon, metric, target, collective) values
('defi-elloul', 'Défi Elloul', '30 jours de journal avant Roch Hachana.', '📔', 'journal_days', 30, false),
('paris-tel-aviv', 'Paris–Tel Aviv à pied', '3 300 km cumulés tous ensemble.', '✈️', 'distance_km', 3300, true),
('sept-jours-sans-grignotage', '7 jours sans grignotage du soir', 'Une semaine de journal sans collation après le dîner.', '🌙', 'journal_days', 7, false),
('pessah-light', 'Pessah light', '8 jours de journal pendant Pessah.', '🫓', 'journal_days', 8, false),
('hanouka-8-8', 'Hanouka : 8 beignets, 8 séances', '8 séances de sport pendant Hanouka — les beignets, c''est cadeau.', '🕎', 'sessions', 8, false),
('couscous-proteine', 'Défi couscous protéiné', 'Publie ta version Protéine d''un classique.', '🍲', 'protein_recipes', 1, false)
on conflict (slug) do nothing;
