create table if not exists board_settings (
  id integer primary key,
  enabled_states text not null default 'SC'
);

insert into board_settings (id, enabled_states)
values (1, 'SC')
on conflict (id) do nothing;
