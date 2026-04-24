-- v3 LMS: a classroom accumulates assignments over time (no TTL).
-- `image_url` points to the Storage public URL (classroom-assets bucket).
create table assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms on delete cascade,
  title text not null,
  image_url text not null,
  prompt text,
  created_at timestamptz not null default now()
);

create index assignments_classroom_idx on assignments (classroom_id, created_at desc);
