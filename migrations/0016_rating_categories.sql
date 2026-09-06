-- Three category scores per rating-set (one completed rating event).
-- Legacy single-star rows copy `stars` into all three categories so the old
-- overall is preserved. Public overall = mean of per-set means
-- ((honesty + courtesy + reliability) / 3).

alter table connection_ratings
  add column if not exists honesty integer,
  add column if not exists courtesy integer,
  add column if not exists reliability integer;

update connection_ratings
   set honesty = coalesce(honesty, stars),
       courtesy = coalesce(courtesy, stars),
       reliability = coalesce(reliability, stars)
 where honesty is null
    or courtesy is null
    or reliability is null;

alter table connection_ratings
  alter column honesty set not null,
  alter column courtesy set not null,
  alter column reliability set not null;

alter table connection_ratings
  add constraint connection_ratings_honesty_range
    check (honesty >= 1 and honesty <= 5),
  add constraint connection_ratings_courtesy_range
    check (courtesy >= 1 and courtesy <= 5),
  add constraint connection_ratings_reliability_range
    check (reliability >= 1 and reliability <= 5);
