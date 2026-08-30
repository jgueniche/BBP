-- Session 6: Kemia coach conversations, messages (with cost tracking), memories.

create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coach_conversations_user_idx on public.coach_conversations (user_id, updated_at desc);

alter table public.coach_conversations enable row level security;

create policy "coach_conversations_all_own" on public.coach_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger coach_conversations_updated_at before update on public.coach_conversations
  for each row execute function public.set_updated_at();

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tool_calls jsonb,
  tokens_in int,
  tokens_out int,
  model text,
  safety_flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index coach_messages_conversation_idx on public.coach_messages (conversation_id, created_at);
create index coach_messages_user_day_idx on public.coach_messages (user_id, created_at desc);

alter table public.coach_messages enable row level security;

create policy "coach_messages_all_own" on public.coach_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.coach_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  source_message_id uuid references public.coach_messages(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coach_memories_user_idx on public.coach_memories (user_id, created_at desc);

alter table public.coach_memories enable row level security;

create policy "coach_memories_all_own" on public.coach_memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger coach_memories_updated_at before update on public.coach_memories
  for each row execute function public.set_updated_at();
