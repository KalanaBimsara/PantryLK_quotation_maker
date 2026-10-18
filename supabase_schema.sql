-- =========================================================================
-- Pantry LK Quotation Maker - Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dngdvqkvhtabpfskmhan/sql
-- =========================================================================

-- 1. Products Table (Component Catalog)
create table if not exists public.products (
  id text primary key,
  article_no text not null,
  name text not null,
  category text not null,
  mrp numeric not null default 0,
  unit text default 'No',
  description text default '',
  image text default '',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Quotations Table (History)
create table if not exists public.quotations (
  id text primary key,
  job_no text not null,
  date text not null,
  customer_name text default '',
  customer_phone text default '',
  customer_address text default '',
  sqft numeric default 0,
  comp_total numeric default 0,
  labour_total numeric default 0,
  commission_total numeric default 0,
  grand_total numeric default 0,
  items jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure columns exist if table was already created
alter table public.quotations add column if not exists comp_total numeric default 0;
alter table public.quotations add column if not exists labour_total numeric default 0;
alter table public.quotations add column if not exists commission_total numeric default 0;

-- 3. Settings Table (Formula & Company Info)
create table if not exists public.settings (
  id text primary key default 'default',
  company_name text default 'Pantry LK Pvt Ltd',
  company_tagline text default 'Premium Modern Kitchen & Pantry Solutions',
  company_address text default 'Colombo, Sri Lanka',
  company_phone text default '+94 77 000 0000',
  company_email text default 'sales@pantrylk.com',
  company_web text default 'www.pantrylk.com',
  labour_rate_per_sq_ft numeric default 1800.0,
  sales_commission_rate numeric default 5.0,
  currency text default 'LKR',
  currency_symbol text default 'Rs.',
  terms_and_conditions text default '',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Enable Row Level Security (RLS)
alter table public.products enable row level security;
alter table public.quotations enable row level security;
alter table public.settings enable row level security;

-- 5. Policies for Data API (anon & authenticated roles)
-- Products Policies
create policy "Allow public read products" on public.products
  for select to anon, authenticated using (true);

create policy "Allow public insert products" on public.products
  for insert to anon, authenticated with check (true);

create policy "Allow public update products" on public.products
  for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete products" on public.products
  for delete to anon, authenticated using (true);

-- Quotations Policies
create policy "Allow public read quotations" on public.quotations
  for select to anon, authenticated using (true);

create policy "Allow public insert quotations" on public.quotations
  for insert to anon, authenticated with check (true);

create policy "Allow public update quotations" on public.quotations
  for update to anon, authenticated using (true) with check (true);

create policy "Allow public delete quotations" on public.quotations
  for delete to anon, authenticated using (true);

-- Settings Policies
create policy "Allow public read settings" on public.settings
  for select to anon, authenticated using (true);

create policy "Allow public insert settings" on public.settings
  for insert to anon, authenticated with check (true);

create policy "Allow public update settings" on public.settings
  for update to anon, authenticated using (true) with check (true);

-- Initial default settings row
insert into public.settings (
  id,
  company_name,
  company_tagline,
  company_address,
  company_phone,
  company_email,
  company_web,
  labour_rate_per_sq_ft,
  sales_commission_rate,
  currency,
  currency_symbol,
  terms_and_conditions
) values (
  'default',
  'Pantry LK Pvt Ltd',
  'Premium Modern Kitchen & Pantry Solutions',
  'Colombo, Sri Lanka',
  '+94 77 000 0000',
  'sales@pantrylk.com',
  'www.pantrylk.com',
  1800.0,
  5.0,
  'LKR',
  'Rs.',
  '1. 50% Advance payment upon order confirmation.
2. 40% Payment prior to dispatch and site delivery.
3. 10% Balance payment upon final installation & inspection.
4. Quotation valid for 14 days from issue date.
5. Warranty applies as per manufacturer terms.'
) on conflict (id) do nothing;
