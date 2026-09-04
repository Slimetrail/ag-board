create table if not exists board_steward (
  user_id    text primary key,
  claimed_at timestamptz not null default now()
);

create table if not exists improve_notes (
  id         serial primary key,
  user_id    text not null,
  username   text not null default '',
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists improve_notes_created_idx on improve_notes (created_at desc);
