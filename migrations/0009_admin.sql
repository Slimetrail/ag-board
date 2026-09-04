create table if not exists board_admin (
  id            integer primary key,
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists admin_sessions (
  token      text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
