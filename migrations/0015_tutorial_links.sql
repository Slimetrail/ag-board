create table if not exists tutorial_links (
  id          serial primary key,
  title       text not null,
  summary     text not null,
  url         text not null,
  user_id     text not null,
  farm_name   text not null,
  created_at  timestamptz not null default now()
);

create index if not exists tutorial_links_created_idx
  on tutorial_links (created_at desc);

create index if not exists tutorial_links_user_idx
  on tutorial_links (user_id, created_at desc);
