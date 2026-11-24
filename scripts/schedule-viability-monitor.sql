-- Applied 2026-11-24 after a successful HTTP 200 manual request.
-- Requires pg_net and both named Vault secrets; contains no credential values.
-- Pinned preview deployment: update only after verifying its replacement.
-- Existing database-only hourly job remains independent.
select cron.schedule('bb-payment-alert-hourly','19 * * * *',$job$
select net.http_post(
 url:='https://businessboostsservice-pricing-calculator-apz39mo37-lth7.vercel.app/api/viability-monitor-alert',
 headers:=jsonb_build_object(
 'Content-Type','application/json',
 'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='bb_monitor_secret'),
 'x-vercel-protection-bypass',(select decrypted_secret from vault.decrypted_secrets where name='bb_vercel_monitor_bypass')),
 body:='{}'::jsonb,timeout_milliseconds:=30000);
$job$);

