begin;

-- Keep the legacy Pro key so existing subscriptions and invoices remain valid.
-- The public product has one complete offer with monthly or annual billing.
update subscription_plans
set label = 'ZINDO',
    monthly_price = 7500,
    annual_price = 75000,
    updated_at = now()
where key = 'pro';

-- Starter remains in the table only for historical subscriptions and invoices;
-- it is no longer offered for new subscriptions.

commit;
