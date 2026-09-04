-- Private threads after Accept, plus one-time ratings once a deal is marked done.
-- user_a_id / user_b_id are the two members in sorted order (a < b) so a pair
-- has at most one thread.

create table if not exists conversation_threads (
  id            serial primary key,
  invite_id     integer unique references connection_invites(id),
  listing_id    integer references listings(id),
  user_a_id     text not null,
  user_b_id     text not null,
  deal_done_at  timestamptz,
  deal_done_by  text,
  created_at    timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

create index if not exists conversation_threads_user_a_idx
  on conversation_threads (user_a_id);
create index if not exists conversation_threads_user_b_idx
  on conversation_threads (user_b_id);

create table if not exists messages (
  id              serial primary key,
  thread_id       integer not null references conversation_threads(id) on delete cascade,
  sender_user_id  text not null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists messages_thread_idx
  on messages (thread_id, created_at);

create table if not exists connection_ratings (
  id              serial primary key,
  thread_id       integer not null references conversation_threads(id) on delete cascade,
  rater_user_id   text not null,
  rated_user_id   text not null,
  stars           integer not null check (stars >= 1 and stars <= 5),
  created_at      timestamptz not null default now(),
  unique (thread_id, rater_user_id),
  check (rater_user_id <> rated_user_id)
);

create index if not exists connection_ratings_rated_idx
  on connection_ratings (rated_user_id);
