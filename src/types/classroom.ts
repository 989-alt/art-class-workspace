export interface ClassroomSession {
  id: string;
  code: string;
  teacher_id: string | null;
  preset_id: string | null;
  status: 'voting' | 'generating' | 'complete' | 'closed';
  vote_options: VoteOptions;
  final_prompt: string | null;
  final_image_url: string | null;
  created_at: string;
  expires_at: string;
}

export interface VoteOptions {
  keywords: string[];   // up to 5 candidate keywords
  palettes: string[];   // 3 line-weight palettes
  details: string[];    // 3 detail levels
}

export interface SessionVote {
  id: string;
  session_id: string;
  student_token: string;
  nickname: string | null;
  vote_keyword: string | null;
  vote_palette: string | null;
  vote_detail: string | null;
  submitted_at: string;
}

export interface SessionSubmission {
  id: string;
  session_id: string;
  student_token: string;
  nickname: string | null;
  image_url: string;
  approved: boolean;
  created_at: string;
}

export type VoteAggregation = {
  keywords: Array<{ value: string; count: number }>;
  palettes: Array<{ value: string; count: number }>;
  details: Array<{ value: string; count: number }>;
  total: number;
};
