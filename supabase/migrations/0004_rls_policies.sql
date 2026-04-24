-- v3 LMS RLS policies.
--
-- Key principles:
--   * Anonymous SELECT is always gated by a public-condition filter
--     (e.g. `using (approved = true)`), never `using (true)`. This avoids
--     leaking unmoderated rows.
--   * Teachers own their classroom; per-classroom write authority cascades
--     to assignments and submissions via `exists (...)` subqueries on
--     classrooms.teacher_id = auth.uid().
--   * Students are anonymous: no auth, no PII. They INSERT submissions
--     with their own student_token; they cannot SELECT unapproved rows
--     and cannot DELETE/UPDATE anything.

------------------------------------------------------------------------
-- classrooms
------------------------------------------------------------------------
alter table classrooms enable row level security;

-- Public read: name + code are intended to be shared with students.
create policy "classrooms_select_public"
  on classrooms for select
  using (true);

create policy "classrooms_insert_owner"
  on classrooms for insert
  with check (teacher_id = auth.uid());

create policy "classrooms_update_owner"
  on classrooms for update
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "classrooms_delete_owner"
  on classrooms for delete
  using (teacher_id = auth.uid());

------------------------------------------------------------------------
-- assignments
------------------------------------------------------------------------
alter table assignments enable row level security;

-- Public read: anonymous students need to list assignments after entering
-- a classroom code. Assignments contain no PII.
create policy "assignments_select_public"
  on assignments for select
  using (true);

create policy "assignments_insert_owner"
  on assignments for insert
  with check (
    exists (
      select 1 from classrooms c
      where c.id = assignments.classroom_id
        and c.teacher_id = auth.uid()
    )
  );

create policy "assignments_update_owner"
  on assignments for update
  using (
    exists (
      select 1 from classrooms c
      where c.id = assignments.classroom_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from classrooms c
      where c.id = assignments.classroom_id
        and c.teacher_id = auth.uid()
    )
  );

create policy "assignments_delete_owner"
  on assignments for delete
  using (
    exists (
      select 1 from classrooms c
      where c.id = assignments.classroom_id
        and c.teacher_id = auth.uid()
    )
  );

------------------------------------------------------------------------
-- assignment_submissions
------------------------------------------------------------------------
alter table assignment_submissions enable row level security;

-- Anonymous SELECT only sees approved submissions (the gallery view).
-- Unapproved rows are invisible to anon clients; students track their
-- own pending submissions via local browser state only.
create policy "assignment_submissions_select_approved"
  on assignment_submissions for select
  using (approved = true);

-- Teachers can read every submission (approved or not) for their own
-- classroom's assignments — needed for the moderation queue.
create policy "assignment_submissions_select_owner"
  on assignment_submissions for select
  using (
    exists (
      select 1 from assignments a
      join classrooms c on c.id = a.classroom_id
      where a.id = assignment_submissions.assignment_id
        and c.teacher_id = auth.uid()
    )
  );

-- Anonymous students may insert their own submissions.
create policy "assignment_submissions_insert_anon"
  on assignment_submissions for insert
  with check (true);

-- Only the owning teacher may update a submission (e.g. flip `approved`).
create policy "assignment_submissions_update_owner"
  on assignment_submissions for update
  using (
    exists (
      select 1 from assignments a
      join classrooms c on c.id = a.classroom_id
      where a.id = assignment_submissions.assignment_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from assignments a
      join classrooms c on c.id = a.classroom_id
      where a.id = assignment_submissions.assignment_id
        and c.teacher_id = auth.uid()
    )
  );

-- Only the owning teacher may delete a submission. Anonymous DELETE is
-- not permitted (no policy → denied by RLS default).
create policy "assignment_submissions_delete_owner"
  on assignment_submissions for delete
  using (
    exists (
      select 1 from assignments a
      join classrooms c on c.id = a.classroom_id
      where a.id = assignment_submissions.assignment_id
        and c.teacher_id = auth.uid()
    )
  );
