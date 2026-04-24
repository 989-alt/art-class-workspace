-- Task 7 security hardening: replace 0006's overly-permissive policies.
--
-- Problems in 0006:
--   1. "Student can read own submissions" used `using (true)` — ANY anonymous
--      caller could read every student_token + pending submission in any
--      session. Enables impersonation (copy another student's token) and
--      leaks pending photos before teacher approval.
--   2. "Student can delete own pending submission" used `using (approved =
--      false)` — ANY anonymous caller could delete ANY pending submission
--      in any session.
--
-- Fix: drop both. Student-side visibility is now handled entirely
-- client-side (local React state); the server never lets anonymous callers
-- read non-approved rows or delete rows at all.

drop policy if exists "Student can read own submissions" on session_submissions;
drop policy if exists "Student can delete own pending submission" on session_submissions;

-- The remaining two policies from 0006 are sufficient:
--   "Public can read approved submissions" (select where approved = true)
--   "Teacher can update approval" (teacher of session updates)
--
-- INSERT is still allowed from anyone via the "Anyone can insert submissions"
-- policy from 0004. Students upload once and never re-read the row — if they
-- want to re-submit they just call INSERT again, producing a new pending row.
-- Teacher approves one of them and ignores/unapproves the rest during review.
-- Stale pending rows are cleaned up when the session expires (24h TTL via
-- cleanup_expired_sessions + cascade delete).
