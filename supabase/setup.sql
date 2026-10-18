-- Full database setup for a fresh Supabase project.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query),
-- then run rls_policies.sql.

create table if not exists public.enquiries (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'new',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists enquiries_archived_created_at_idx
  on public.enquiries (archived, created_at desc);
