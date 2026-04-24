create table if not exists session_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references classroom_sessions on delete cascade,
  student_token text not null,
  nickname text,
  image_url text not null,
  approved boolean default false,
  created_at timestamptz default now()
);

create index if not exists session_submissions_session_idx on session_submissions (session_id);
