alter table listings
  add column if not exists is_draft boolean not null default false,
  add column if not exists published_at timestamptz;

update listings
  set published_at = created_at
  where is_draft = false
    and published_at is null;

create index if not exists listings_is_draft_idx
  on listings (is_draft)
  where is_draft = true;

create index if not exists listings_user_drafts_idx
  on listings (user_id, created_at desc)
  where is_draft = true;
