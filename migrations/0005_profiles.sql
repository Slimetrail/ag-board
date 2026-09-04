create table if not exists profiles (
  user_id       text primary key,
  username      text unique not null,
  display_name  text not null default '',
  image_path    text not null default '',
  county        text not null default '',
  email         text not null default '',
  phone         text not null default '',
  place         text not null default '',
  bio           text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists connection_invites (
  id            serial primary key,
  from_user_id  text not null,
  to_user_id    text not null,
  listing_id    integer references listings(id),
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  unique (from_user_id, to_user_id)
);

create index if not exists connection_invites_to_idx
  on connection_invites (to_user_id, status);
create index if not exists connection_invites_from_idx
  on connection_invites (from_user_id, status);
