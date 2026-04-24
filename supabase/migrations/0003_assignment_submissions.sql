-- v3 LMS: student artwork submissions per assignment. No PII —
-- only a per-browser student_token and an anonymous nickname.
create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments on delete cascade,
  student_token text not null,
  nickname text,
  image_url text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index assignment_submissions_assignment_idx
  on assignment_submissions (assignment_id, created_at desc);
