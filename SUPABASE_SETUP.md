# Supabase 세팅 가이드 (학급 모드 전용)

이 문서는 **학급 모드(실시간 투표/제출/전시)**를 사용하려는 교사를 위한 가이드입니다.
혼자 도안을 만들고 인쇄만 할 계획이라면 이 설정은 **생략해도 됩니다** — 앱은 BYOK(Gemini API 키)만으로 완전히 동작합니다.

---

## 왜 Supabase인가?

| 기능 | BYOK 단독 | Supabase 연결 |
|---|---|---|
| 도안 생성·편집·인쇄 | O | O |
| 저작권 보증서 PDF | O | O |
| 학생 QR 투표 | X | O |
| 실시간 집계 대시보드 | X | O |
| 학생 제출·전시장 뷰 | X | O |

학급 모드에 필요한 기능은 Supabase 무료 티어(500MB DB · 실시간 200 concurrent) 안에서 교실 1~2개 단위로 여유롭게 돌아갑니다.

---

## 0. 사전 준비

- Supabase 계정 (https://supabase.com 에서 GitHub 로그인)
- 이 저장소 로컬 클론

---

## 1. Supabase 프로젝트 생성

1. https://supabase.com/dashboard → **New project**
2. Name: `art-class`(임의) · Region: `Northeast Asia (Seoul)` 권장
3. DB 비밀번호는 별도로 안전하게 보관 (비밀번호 재설정 번거로움)
4. Free tier 선택 → 생성 완료까지 약 2분

---

## 2. SQL 마이그레이션 실행

Supabase 대시보드 → **SQL Editor** 로 이동 후, 아래 7개 파일을 **순서대로** 복사·붙여넣기 해서 Run 하세요.

```
supabase/migrations/0001_classroom_sessions.sql
supabase/migrations/0002_session_votes.sql
supabase/migrations/0003_session_submissions.sql
supabase/migrations/0004_rls_policies.sql
supabase/migrations/0005_cleanup_function.sql
supabase/migrations/0006_submission_storage.sql
supabase/migrations/0007_fix_submission_rls.sql
```

`0006_submission_storage.sql` 은 Task 7 의 학생 제출/교사 검수 기능용 RLS 정책을 보정합니다. 0001~0005 를 먼저 돌린 뒤 실행하세요.

`0007_fix_submission_rls.sql` 은 0006 의 과도하게 열린 정책(모든 학생 제출 행 읽기 허용 + 임의 pending 행 삭제 허용)을 보안 강화 버전으로 교체합니다. 반드시 0006 뒤에 실행하세요.

각 파일이 에러 없이 `Success. No rows returned` 로 끝나는지 확인합니다.

완료 후 **Table Editor** 에서 `classroom_sessions`, `session_votes`, `session_submissions` 세 테이블이 보이고, 각 테이블 우상단 자물쇠 아이콘(RLS enabled)이 활성화돼 있어야 합니다.

---

## 3. pg_cron 확장 + 정리 스케줄러

만료된 세션(24시간 경과)을 자동 정리하기 위한 단계입니다.

### 3-1. pg_cron 확장 활성화

Supabase 대시보드 → **Database → Extensions** → `pg_cron` 검색 → Enable.

### 3-2. Cron 스케줄 등록

SQL Editor에서 아래 쿼리 실행:

```sql
select cron.schedule(
  'cleanup-sessions',
  '0 * * * *',
  'select cleanup_expired_sessions();'
);
```

매시 정각(`0 * * * *`)마다 만료 세션을 삭제합니다. 자식 테이블(votes/submissions)은 `on delete cascade` 로 자동 정리됩니다.

등록 확인:

```sql
select * from cron.job;
```

`cleanup-sessions` 행이 보이면 OK.

---

## 4. Storage 버킷 생성 (Task 7용)

학생 제출 작품 이미지 저장소입니다. Task 7 의 학생 제출 기능이 이 버킷을 사용합니다.

1. 대시보드 → **Storage** → **New bucket**
2. Name: **`classroom-submissions`** (정확히 이 이름)
3. **Public bucket** 체크 (교실 전시용 — 외부 공유 불가한 URL을 원한다면 Private 후 Signed URL 방식 권장하지만, MVP 단계에서는 Public 이 단순함)
4. **File size limit: 5 MB** 로 제한 (클라이언트에서도 1600px 로 리사이즈 후 업로드합니다)

버킷 이름이 틀리면 학생 제출 시 `bucket not found` 오류가 납니다. 이름은 꼭 `classroom-submissions` 로 맞춰주세요. RLS 정책은 `0006_submission_storage.sql` 에 포함돼 있습니다.

---

## 5. `.env.local` 파일 작성

프로젝트 루트(`art class/` 폴더)에 `.env.local` 을 만들고 아래를 채워 넣습니다.

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

두 값은 Supabase 대시보드 → **Project Settings → API** 페이지에서 복사:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon · public key** → `VITE_SUPABASE_ANON_KEY`

> `service_role` 키는 절대로 프론트엔드에 넣지 마세요. RLS를 무시하는 관리자 키입니다.

`.env.local` 은 이미 `.gitignore` 에 포함돼 있어 커밋되지 않습니다.

---

## 6. 학급 모드 활성화 확인

```bash
npm run dev
```

앱이 실행되면, 헤더에서 `학급 모드` 진입 메뉴가 활성화돼 있어야 합니다.
(Task 5 이후에 UI가 추가되면 그때부터 확인 가능)

임시 확인용 — 브라우저 콘솔에서:

```js
await (await import('/src/lib/supabaseClient.ts')).getSupabase()
```

`null` 이 아닌 `SupabaseClient` 인스턴스가 나오면 연결 성공.

---

## 비용 메모

| 항목 | Free tier 한도 | 교실 1~2개 사용량 |
|---|---|---|
| DB 용량 | 500 MB | 세션 1건당 수 KB → 여유 |
| 월간 요청 | 500만 | 투표 30명 × 수업 20회 = 여유 |
| Realtime 동시 접속 | 200 | 반 30명 × 1~2반 = 여유 |
| Storage | 1 GB | 제출 1장 200KB 기준 5000장 가능 |

무료 티어로 초등학교 1학년 규모(교실 30명 × 6반)까지는 충분합니다.

---

## 보안 메모

- **anon key는 공개돼도 안전합니다.** 프론트엔드 빌드에 포함되는 전제 키입니다.
- 데이터 접근 제어는 `0004_rls_policies.sql` 의 Row Level Security 정책이 담당합니다.
- 교사만 자신의 세션을 수정/삭제할 수 있고, 학생 토큰(`student_token`)은 브라우저 세션 단위로 발급돼 다른 학생 투표를 덮어쓸 수 없습니다.
- 투표 기록(`session_votes`)은 교사만 조회할 수 있습니다. 학생 본인 투표값은 브라우저 로컬 상태에만 보관되며, 서버에서 다시 읽어오지 않습니다.
- 학생 제출(`session_submissions`)도 같은 원칙입니다. 0007 마이그레이션 적용 후 anonymous 클라이언트는 미승인 행을 읽거나 삭제할 수 없으며, 본인 제출 상태는 브라우저 로컬 상태로만 유지됩니다. 페이지 새로고침 시 "사진 선택" 화면으로 돌아가며, 다시 업로드하면 새로운 pending 행이 생성됩니다 (교사는 최신 제출만 승인).
- 민감 키(`service_role`, DB password)는 절대 `.env.local` 이외에 저장하지 마세요.

---

## 문제 해결

- **학급 모드 메뉴가 안 보임** → `.env.local` 값 확인 후 `npm run dev` 재시작 (Vite는 env 변경 시 재시작 필요)
- **RLS 정책 오류** → `0004_rls_policies.sql` 은 이제 idempotent 합니다. 각 SQL 파일을 개별적으로 다시 실행해도 안전하므로, 오류 메시지를 확인하고 해당 파일만 재실행하세요.
- **Realtime 이벤트 안 옴** → 대시보드 → Database → Replication 에서 해당 테이블 Realtime 활성화 확인 (필요 시 Task 5 작업에서 추가 설명)

---

참고:
- 전체 업그레이드 계획: `art-class-v2-plan.md`
- 마이그레이션 파일: `supabase/migrations/`
