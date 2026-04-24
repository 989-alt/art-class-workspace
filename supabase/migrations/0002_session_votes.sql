create table if not exists session_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references classroom_sessions on delete cascade,
  student_token text not null,
  nickname text,
  vote_keyword text,
  vote_palette text,
  vote_detail text,
  submitted_at timestamptz default now(),
  unique (session_id, student_token)
);

create index if not exists session_votes_session_idx on session_votes (session_id);
