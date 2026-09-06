-- Listing owner marks Deal pending, then Deal done after they meet.
-- Ratings stay locked until deal_done_at is set (existing canSubmitRating gate).

alter table conversation_threads
  add column if not exists deal_pending_at timestamptz,
  add column if not exists deal_pending_by text;
