-- Session 8: recipe book (collections), social layer, import support.

alter table public.recipes
  add column icon text check (icon is null or char_length(icon) <= 8);
alter table public.recipe_steps
  add column section text check (section is null or char_length(section) <= 60);

-- ---------------------------------------------------------------------------
-- Collections (carnets) — a recipe can live in many, members collaborate.
-- ---------------------------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  icon text not null default '📒' check (char_length(icon) <= 8),
  color text not null default 'boutargue'
    check (color in ('boutargue', 'halavi', 'bassari', 'ok', 'warn', 'parve', 'ink')),
  description text check (description is null or char_length(description) <= 200),
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_members (
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

create table public.collection_recipes (
  collection_id uuid not null references public.collections(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, recipe_id)
);

create index collection_members_user_idx on public.collection_members (user_id);
create index collection_recipes_recipe_idx on public.collection_recipes (recipe_id);

-- Security definer helpers: avoid RLS recursion between collections and members.
create or replace function public.is_collection_owner(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from collections where id = cid and owner_id = auth.uid());
$$;

create or replace function public.is_collection_member(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from collection_members where collection_id = cid and user_id = auth.uid()
  );
$$;

-- A recipe placed in a collection is visible to that collection's owner and members.
create or replace function public.can_view_via_collection(rid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from collection_recipes cr
    join collections c on c.id = cr.collection_id
    where cr.recipe_id = rid
      and (
        c.owner_id = auth.uid()
        or exists (
          select 1 from collection_members m
          where m.collection_id = c.id and m.user_id = auth.uid()
        )
      )
  );
$$;

alter table public.collections enable row level security;

create policy "collections_select" on public.collections
  for select using (owner_id = auth.uid() or public.is_collection_member(id));
create policy "collections_insert" on public.collections
  for insert with check (owner_id = auth.uid());
create policy "collections_update" on public.collections
  for update using (owner_id = auth.uid());
create policy "collections_delete" on public.collections
  for delete using (owner_id = auth.uid());

create trigger collections_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

alter table public.collection_members enable row level security;

create policy "collection_members_select" on public.collection_members
  for select using (user_id = auth.uid() or public.is_collection_owner(collection_id));
create policy "collection_members_insert" on public.collection_members
  for insert with check (public.is_collection_owner(collection_id));
create policy "collection_members_delete" on public.collection_members
  for delete using (user_id = auth.uid() or public.is_collection_owner(collection_id));

alter table public.collection_recipes enable row level security;

create policy "collection_recipes_select" on public.collection_recipes
  for select using (
    public.is_collection_owner(collection_id) or public.is_collection_member(collection_id)
  );
create policy "collection_recipes_insert" on public.collection_recipes
  for insert with check (
    added_by = auth.uid()
    and (
      public.is_collection_owner(collection_id) or public.is_collection_member(collection_id)
    )
  );
create policy "collection_recipes_delete" on public.collection_recipes
  for delete using (
    public.is_collection_owner(collection_id) or added_by = auth.uid()
  );

-- Join a shared collection through its invite token (link share).
create or replace function public.join_collection(token uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  cid uuid;
  is_owner boolean;
begin
  if auth.uid() is null then
    return null;
  end if;
  select id, owner_id = auth.uid() into cid, is_owner
  from collections where share_token = token;
  if cid is null then
    return null;
  end if;
  if not is_owner then
    insert into collection_members (collection_id, user_id)
    values (cid, auth.uid())
    on conflict do nothing;
  end if;
  return cid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Social layer: likes, saves (my book), comments, personal notes.
-- ---------------------------------------------------------------------------

create table public.recipe_likes (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

alter table public.recipe_likes enable row level security;

create policy "recipe_likes_select" on public.recipe_likes
  for select using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "recipe_likes_insert" on public.recipe_likes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.recipes r where r.id = recipe_id)
  );
create policy "recipe_likes_delete" on public.recipe_likes
  for delete using (user_id = auth.uid());

create table public.recipe_saves (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index recipe_saves_user_idx on public.recipe_saves (user_id);

alter table public.recipe_saves enable row level security;

create policy "recipe_saves_select" on public.recipe_saves
  for select using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "recipe_saves_insert" on public.recipe_saves
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.recipes r where r.id = recipe_id)
  );
create policy "recipe_saves_delete" on public.recipe_saves
  for delete using (user_id = auth.uid());

create table public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index recipe_comments_recipe_idx on public.recipe_comments (recipe_id, created_at);

alter table public.recipe_comments enable row level security;

create policy "recipe_comments_select" on public.recipe_comments
  for select using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "recipe_comments_insert" on public.recipe_comments
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.recipes r where r.id = recipe_id)
  );
create policy "recipe_comments_delete" on public.recipe_comments
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.recipes r where r.id = recipe_id and r.author_id = auth.uid()
    )
  );

create table public.recipe_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  text text not null check (char_length(text) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.recipe_notes enable row level security;

create policy "recipe_notes_all" on public.recipe_notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger recipe_notes_updated_at before update on public.recipe_notes
  for each row execute function public.set_updated_at();

-- Like/save/comment counts, filtered by what the caller can see (invoker RLS).
create view public.recipe_social_stats
with (security_invoker = true) as
select
  r.id as recipe_id,
  (select count(*) from public.recipe_likes l where l.recipe_id = r.id) as likes,
  (select count(*) from public.recipe_saves s where s.recipe_id = r.id) as saves,
  (select count(*) from public.recipe_comments c where c.recipe_id = r.id) as comments
from public.recipes r;

-- ---------------------------------------------------------------------------
-- Recipes visible through shared collections (private recipes shared in a
-- carnet become readable by its members — the "famille" tier in practice).
-- ---------------------------------------------------------------------------

drop policy "recipes_select_visible" on public.recipes;
create policy "recipes_select_visible" on public.recipes
  for select using (
    (visibility = 'community' and status = 'published')
    or author_id = auth.uid()
    or public.can_view_via_collection(id)
  );

drop policy "recipe_ingredients_select" on public.recipe_ingredients;
create policy "recipe_ingredients_select" on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          (r.visibility = 'community' and r.status = 'published')
          or r.author_id = auth.uid()
          or public.can_view_via_collection(r.id)
        )
    )
  );

drop policy "recipe_steps_select" on public.recipe_steps;
create policy "recipe_steps_select" on public.recipe_steps
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          (r.visibility = 'community' and r.status = 'published')
          or r.author_id = auth.uid()
          or public.can_view_via_collection(r.id)
        )
    )
  );
