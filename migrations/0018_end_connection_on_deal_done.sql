-- Deal done ends the active connection for that pair.
-- Invite status `ended` is what relation helpers treat as not connected.
-- The thread stays (messages + ratings); ended_at hides it from the
-- Connected chat surface. A later Accept opens a new thread so the old
-- deal's rating unlock is not reset.

alter table conversation_threads
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by text;

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'conversation_threads'::regclass
      and con.contype = 'u'
      and pg_get_constraintdef(con.oid) ~* 'invite_id|user_a_id'
  loop
    execute format(
      'alter table conversation_threads drop constraint if exists %I',
      c.conname
    );
  end loop;
end $$;

drop index if exists conversation_threads_invite_id_key;
drop index if exists conversation_threads_user_a_id_user_b_id_key;

-- One live thread per pair (and per invite). Ended deals keep their rows.
create unique index if not exists conversation_threads_active_pair_idx
  on conversation_threads (user_a_id, user_b_id)
  where ended_at is null;

create unique index if not exists conversation_threads_active_invite_idx
  on conversation_threads (invite_id)
  where ended_at is null and invite_id is not null;

-- Deals already marked done before this migration: end those connections.
update conversation_threads
   set ended_at = coalesce(ended_at, deal_done_at),
       ended_by = coalesce(ended_by, deal_done_by)
 where deal_done_at is not null
   and ended_at is null;

update connection_invites i
   set status = 'ended'
 where i.status = 'accepted'
   and exists (
     select 1 from conversation_threads t
      where t.invite_id = i.id
        and t.ended_at is not null
   );
