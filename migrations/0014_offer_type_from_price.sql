-- The post form defaults deal_type to sale. A Free / Trade / Seeking price
-- is the selected offer; align stored type so badges and filters match.
update listings
set deal_type = 'share'
where deal_type = 'sale'
  and (
    lower(trim(price_label)) = 'free'
    or lower(price_label) like 'free %'
    or lower(price_label) like 'no charge%'
    or lower(trim(price_label)) = 'borrow it'
    or lower(price_label) like 'giveaway%'
  );

update listings
set deal_type = 'trade'
where deal_type = 'sale'
  and (
    lower(price_label) like 'trade%'
    or lower(price_label) like 'swap%'
    or lower(price_label) like 'barter%'
  );

update listings
set deal_type = 'seeking'
where deal_type = 'sale'
  and (
    lower(price_label) like 'looking for%'
    or lower(price_label) like 'wanted%'
    or lower(price_label) like 'seeking%'
  );
