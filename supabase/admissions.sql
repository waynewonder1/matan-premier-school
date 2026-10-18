-- Adds admissions + contact topics to the existing enquiries table.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- BEFORE publishing the website update that uses these columns.
--
--   type    - 'enquiry' (contact form) or 'admission' (application form)
--   topic   - what a contact-form enquiry is about: visit, fees, admissions, other
--   details - the full admission form (child + parent details) as JSON

alter table public.enquiries
  add column if not exists type text not null default 'enquiry',
  add column if not exists topic text,
  add column if not exists details jsonb;

alter table public.enquiries
  drop constraint if exists enquiries_type_check;

alter table public.enquiries
  add constraint enquiries_type_check check (type in ('enquiry', 'admission'));
