alter table listings
  add column if not exists deciding_at timestamptz;

create index if not exists listings_deciding_at_idx
  on listings (deciding_at)
  where deciding_at is not null;
