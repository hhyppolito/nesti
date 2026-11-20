create table public.finance_upload_reviews (
 upload_id uuid primary key references public.finance_uploads(id), household_id uuid not null references public.finance_households(id),
 state text not null default 'queued' check(state in ('queued','reading','ready','complete','error')),
 payload_base64 text, verified_sha256 text, outcome text not null default '', updated_at timestamptz not null default now()
);
alter table public.finance_upload_reviews enable row level security;
revoke all on public.finance_upload_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.finance_upload_reviews to service_role;
create table public.finance_grocery_receipts (
 id uuid primary key, household_id uuid not null references public.finance_households(id),
 receipt_key text not null, purchased_on date, store text not null, retailer text not null,
 total_cents integer check(total_cents>=0), discount_cents integer not null default 0 check(discount_cents>=0),
 items jsonb not null default '[]'::jsonb check(jsonb_typeof(items)='array'),
 quality text not null check(quality in ('reconciled','total_only','needs_review')),
 warning text not null default '', sources jsonb not null default '[]'::jsonb,
 uploaded_id uuid references public.finance_uploads(id), imported_at timestamptz not null default now(),
 unique(household_id,receipt_key)
);
create index finance_grocery_household_date_idx on public.finance_grocery_receipts(household_id,purchased_on);
alter table public.finance_grocery_receipts enable row level security;
revoke all on public.finance_grocery_receipts from public,anon,authenticated;
grant select on public.finance_grocery_receipts to authenticated;
grant select,insert,update,delete on public.finance_grocery_receipts to service_role;
create policy finance_grocery_read on public.finance_grocery_receipts for select to authenticated using(exists(select 1 from public.finance_members m where m.household_id=finance_grocery_receipts.household_id and m.user_id=(select auth.uid())));

alter table public.finance_grocery_receipts add column paid_cents integer check(paid_cents>=0),add column card_cents integer not null default 0 check(card_cents>=0),add column document_kind text not null default 'purchase' check(document_kind in ('purchase','credit'));
