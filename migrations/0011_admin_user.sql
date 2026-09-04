alter table board_admin
  add column if not exists user_id text unique;
