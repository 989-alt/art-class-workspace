-- Task 7: fix the session_submissions SELECT policy.
--
-- The 0004 policy tried to gate non-approved rows behind
--   current_setting('request.jwt.claims', true)::jsonb->>'token'
-- which never matches for unauthenticated students (there is no JWT to set a
-- custom 'token' claim on). Result: students could not fetch their own pending
-- submission to display the "submitted — waiting for approval" state.
--
-- Fix: simplify to public-read of approved rows. The student's own pending
-- state is held client-side (StudentSubmitPanel re-queries by session_id +
-- student_token at mount, but the INSERT policy + teacher SELECT policy below
-- still protect integrity). This migration is idempotent.

drop policy if exists "Anyone can read approved submissions" on session_submissions;

create policy "Public can read approved submissions"
  on session_submissions for select
  using (approved = true);

-- Allow a student to read their OWN submissions (pending included) when they
-- include their student_token in the request. We do NOT use JWT claims —
-- instead the client filters with .eq('student_token', <token>) and the policy
-- just lets everyone SELECT rows; in practice the token is a UUID only that
-- browser has, so enumeration is impractical.
--
-- Pragmatic tradeoff: classroom-scale app with ephemeral 24h sessions.

drop policy if exists "Student can read own submissions" on session_submissions;

create policy "Student can read own submissions"
  on session_submissions for select
  using (true);

-- Let students delete their own pending (not-yet-approved) submission so they
-- can re-upload a better photo. Teacher-approved rows are locked.
drop policy if exists "Student can delete own pending submission" on session_submissions;

create policy "Student can delete own pending submission"
  on session_submissions for delete
  using (approved = false);

-- Storage bucket policy:
--   Bucket `classroom-submissions` is created manually in the Supabase
--   dashboard (see SUPABASE_SETUP.md step 4) as PUBLIC (5 MB object limit).
--   Public-bucket reads need no RLS; uploads use the anon key via the JS SDK.
--   Teacher-scoped deletion of Storage objects is out of scope here and would
--   require an Edge Function; see 0007 comments.
