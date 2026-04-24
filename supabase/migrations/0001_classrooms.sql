-- v3 LMS: a teacher owns exactly one classroom (MVP).
-- `code` is a 6-char student-entry code, fixed for the classroom lifetime.
create table classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references auth.users on delete cascade,
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create index classrooms_code_idx on classrooms (code);
