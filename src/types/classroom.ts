// v3 LMS types. See supabase/migrations/0001~0003.

export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  code: string;          // 6-char, fixed for lifetime
  created_at: string;
}

export interface Assignment {
  id: string;
  classroom_id: string;
  title: string;
  image_url: string;     // Supabase Storage public URL (classroom-assets)
  prompt: string | null;
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_token: string;
  nickname: string | null;
  image_url: string;     // Supabase Storage public URL (classroom-submissions)
  approved: boolean;
  created_at: string;
}
