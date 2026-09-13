-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- It locks the `enquiries` table down to match how the site actually uses it:
--   - the public contact form (anon key) may only INSERT new enquiries
--   - the admin dashboard (signed-in Supabase Auth user) may SELECT/UPDATE/DELETE

alter table public.enquiries enable row level security;

-- Anyone (anon or authenticated) can submit a new enquiry via the contact form.
create policy "Public can submit enquiries"
on public.enquiries
for insert
to anon, authenticated
with check (true);

-- Only signed-in admins can read enquiries.
create policy "Authenticated users can read enquiries"
on public.enquiries
for select
to authenticated
using (true);

-- Only signed-in admins can update status/archived.
create policy "Authenticated users can update enquiries"
on public.enquiries
for update
to authenticated
using (true)
with check (true);

-- Only signed-in admins can delete.
create policy "Authenticated users can delete enquiries"
on public.enquiries
for delete
to authenticated
using (true);
