export type Language = 'python' | 'javascript' | 'cpp' | 'java';
export type ProblemType = 'coding' | 'design';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Status =
  | 'accepted' | 'wrong_answer' | 'time_limit_exceeded'
  | 'runtime_error' | 'compilation_error' | 'submitted';

export interface User { id: number; username: string; email: string; is_active: boolean; is_admin: boolean; created_at: string; }
export interface ProblemExample { input: string; output: string; explanation?: string | null; }
export interface Problem {
  id: number; title: string; slug: string; description: string;
  problem_type: ProblemType; difficulty: Difficulty; tags: string[];
  examples: ProblemExample[]; constraints: string[];
  time_limit_ms: number; memory_limit_mb: number;
  is_published: boolean; created_at: string; updated_at: string;
}
export interface AdminProblem extends Problem { hidden_cases: { input: string; output: string }[]; }
export interface EditorEvent { t: number; v: string; }
export interface CaseResult {
  case_index: number; stdin: string; expected_output: string;
  stdout: string; stderr: string; compile_stderr?: string;
  exit_code: number | null; timed_out: boolean;
  compilation_failed: boolean; passed: boolean; duration_ms: number;
}
export interface RunResp  { status: Status; summary: string; cases: CaseResult[]; }
export interface SubResp  {
  id: number; problem_id: number; user_id: number; language: string;
  code: string; status: string; summary: string; runtime_ms: number | null;
  cases: CaseResult[]; editor_events: EditorEvent[];
  whiteboard_data?: Record<string, unknown> | null;
  created_at: string;
}
export interface SubItem  { id: number; problem_id: number; language: string; status: string; runtime_ms: number | null; created_at: string; }
export interface UserStats {
  total_problems: number; problems_solved: number;
  easy_solved: number; medium_solved: number; hard_solved: number;
  total_submissions: number; accepted_submissions: number; acceptance_rate: number;
}
export interface LeaderboardEntry {
  rank: number; user_id: number; username: string; problems_solved: number;
  easy_solved: number; medium_solved: number; hard_solved: number;
  total_submissions: number; accepted_submissions: number;
  acceptance_rate: number; avg_runtime_ms: number | null;
}
export interface AdminPlatformStats {
  total_users: number; total_problems: number; total_submissions: number;
  accepted_submissions: number; languages_used: Record<string, number>;
}
export interface AdminUserItem {
  id: number; username: string; email: string; is_active: boolean;
  is_admin: boolean; created_at: string; submission_count: number;
}

export interface AuthCtx { user: User | null; token: string | null; login(t:string,u:User):void; logout():void; isAuth:boolean; }
