alter table classroom_sessions enable row level security;
alter table session_votes enable row level security;
alter table session_submissions enable row level security;

-- classroom_sessions
drop policy if exists "Teacher can insert own sessions" on classroom_sessions;
create policy "Teacher can insert own sessions"
  on classroom_sessions for insert
  with check (auth.uid() = teacher_id);

drop policy if exists "Teacher can update own sessions" on classroom_sessions;
create policy "Teacher can update own sessions"
  on classroom_sessions for update
  using (auth.uid() = teacher_id);

drop policy if exists "Anyone can read sessions by code" on classroom_sessions;
create policy "Anyone can read sessions by code"
  on classroom_sessions for select
  using (true);

drop policy if exists "Teacher can delete own sessions" on classroom_sessions;
create policy "Teacher can delete own sessions"
  on classroom_sessions for delete
  using (auth.uid() = teacher_id);

-- session_votes
drop policy if exists "Anyone can insert votes" on session_votes;
create policy "Anyone can insert votes"
  on session_votes for insert
  with check (true);

drop policy if exists "Teacher can read votes for own session" on session_votes;
create policy "Teacher can read votes for own session"
  on session_votes for select
  using (
    exists (
      select 1 from classroom_sessions s
      where s.id = session_votes.session_id
        and s.teacher_id = auth.uid()
    )
  );

-- session_submissions
drop policy if exists "Anyone can insert submissions" on session_submissions;
create policy "Anyone can insert submissions"
  on session_submissions for insert
  with check (true);

drop policy if exists "Teacher can update approval" on session_submissions;
create policy "Teacher can update approval"
  on session_submissions for update
  using (
    exists (
      select 1 from classroom_sessions s
      where s.id = session_submissions.session_id
        and s.teacher_id = auth.uid()
    )
  );

drop policy if exists "Anyone can read approved submissions" on session_submissions;
create policy "Anyone can read approved submissions"
  on session_submissions for select
  using (approved = true or student_token = current_setting('request.jwt.claims', true)::jsonb->>'token');
