alter table listings add column if not exists user_id text;
create index if not exists listings_user_id_idx on listings (user_id);
