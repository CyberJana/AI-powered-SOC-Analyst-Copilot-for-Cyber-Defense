
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Threads
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New investigation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index threads_user_idx on public.threads(user_id, updated_at desc);
alter table public.threads enable row level security;
create policy "threads_own_all" on public.threads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  parts jsonb not null default '[]'::jsonb,
  content text not null default '',
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages(thread_id, created_at);
alter table public.messages enable row level security;
create policy "messages_own_all" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Knowledge base for RAG
create table public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  is_global boolean not null default false,
  title text not null,
  source text,
  mitre_id text,
  tactic text,
  technique text,
  content text not null,
  tsv tsvector generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(mitre_id,'') || ' ' || coalesce(technique,'') || ' ' || coalesce(content,''))) stored,
  created_at timestamptz not null default now()
);
create index kb_tsv_idx on public.kb_documents using gin(tsv);
create index kb_user_idx on public.kb_documents(user_id);
alter table public.kb_documents enable row level security;
create policy "kb_read_global_or_own" on public.kb_documents for select using (is_global = true or auth.uid() = user_id);
create policy "kb_insert_own" on public.kb_documents for insert with check (auth.uid() = user_id and is_global = false);
create policy "kb_update_own" on public.kb_documents for update using (auth.uid() = user_id and is_global = false);
create policy "kb_delete_own" on public.kb_documents for delete using (auth.uid() = user_id and is_global = false);

-- Updated_at trigger for threads
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger threads_touch_updated before update on public.threads
  for each row execute function public.touch_updated_at();
