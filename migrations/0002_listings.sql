create table if not exists listings (
  id           serial primary key,
  slug         text unique not null,
  category     text not null,
  deal_type    text not null,
  title        text not null,
  summary      text not null,
  description  text not null,
  price_cents  integer,
  price_label  text not null,
  quantity     text not null,
  location     text not null,
  region       text not null,
  farm_name    text not null,
  farm_note    text not null,
  image_path   text not null,
  tags         text not null default '',
  available    boolean not null default true,
  featured     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists listings_category_idx on listings (category);
create index if not exists listings_deal_type_idx on listings (deal_type);
create index if not exists listings_created_at_idx on listings (created_at desc);

create table if not exists board_notes (
  id          serial primary key,
  listing_id  integer not null references listings(id),
  farm_name   text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists board_notes_listing_idx on board_notes (listing_id, created_at);
