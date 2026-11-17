-- Run this once in the Supabase SQL Editor.
--
-- Creates a tiny function that the "Keep Supabase awake" GitHub job calls
-- twice a week. Unlike the old ping (which was refused with "permission
-- denied" before reaching the database), this runs a real query, so Supabase
-- counts it as activity. It only returns a number and exposes no data.

create or replace function public.keep_alive()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer from public.enquiries where false;
$$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
