-- Classroom sessions (created by teacher)
create table if not exists classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  teacher_id uuid references auth.users on delete set null,
  preset_id text,
  status text not null default 'voting' check (status in ('voting','generating','complete','closed')),
  vote_options jsonb not null default '{"keywords":[],"palettes":[],"details":[]}'::jsonb,
  final_prompt text,
  final_image_url text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

create index if not exists classroom_sessions_code_idx on classroom_sessions (code);
create index if not exists classroom_sessions_expires_idx on classroom_sessions (expires_at);
