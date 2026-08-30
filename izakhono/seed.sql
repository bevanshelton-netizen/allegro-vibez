insert into subscription_plans (code,name,monthly_price,currency,platform_fee_percent,features)
values
  ('free','Free',0,'USD',10,'["Up to 5 active releases","Creator profile","Basic rights ledger"]'),
  ('pro','Pro',9,'USD',8,'["Unlimited releases","Advanced royalty dashboard","Priority review","Expanded creator tools"]'),
  ('label','Label',49,'USD',6,'["Multi-artist operations","Label reporting","Team workflows","Priority support"]')
on conflict (code) do update set
  name=excluded.name,
  monthly_price=excluded.monthly_price,
  currency=excluded.currency,
  platform_fee_percent=excluded.platform_fee_percent,
  features=excluded.features,
  active=true;
