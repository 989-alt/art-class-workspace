-- Scheduled cleanup: delete expired sessions (cascades to votes/submissions)
create or replace function cleanup_expired_sessions()
returns void
language sql
security definer
as $$
  delete from classroom_sessions where expires_at < now();
$$;

-- Recommendation: schedule via pg_cron at hourly interval
-- select cron.schedule('cleanup-sessions', '0 * * * *', 'select cleanup_expired_sessions();');
