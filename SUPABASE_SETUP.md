# Supabase 셋업 가이드 (학급 LMS 모드)

이 문서는 **학급 LMS 모드**(교사가 학급을 만들고, 도안을 과제로 게시하고, 학생이 자기 작품을 제출·전시하는) 기능을 사용하려는 교사를 위한 가이드입니다.

혼자 도안을 만들고 인쇄만 할 계획이라면 이 설정은 **생략해도 됩니다** — 앱은 BYOK(Gemini API 키)만으로 도안 생성·편집·인쇄가 완전히 동작합니다.

---

## 무엇이 필요한가

학급 LMS 모드는 다음 3개 테이블을 씁니다.

| 테이블 | 의미 |
|---|---|
| `classrooms` | 교사 1명이 1학급을 운영 (1교사 = 1학급, MVP) |
| `assignments` | 학급에 누적 게시되는 과제(도안) — 영구 보관 |
| `assignment_submissions` | 학생이 올린 완성작 사진 — 익명 토큰 + 닉네임만 저장 |

학생 정보는 서버에 저장하지 않습니다(개인정보 미수집). 브라우저별로 발급되는 `student_token`(UUID)과 사용자가 직접 입력한 `nickname`만 남습니다.

Supabase 무료 티어(500MB DB · 1GB Storage · Realtime 200 동시 접속) 안에서 교실 1~2개 단위로 충분히 동작합니다.

---

## 1단계 — Supabase 프로젝트 생성 + `.env.local` 작성

1. https://supabase.com/dashboard 에서 GitHub 로그인 → **New project**
2. Name: `art-class`(임의) · Region: `Northeast Asia (Seoul)` 권장 · Free tier
3. DB 비밀번호는 비밀번호 관리자에 따로 보관 (재설정이 번거로움)
4. 프로젝트 생성 완료(약 2분)되면 좌측 **Project Settings → API** 진입
5. **Project URL** 과 **anon · public key** 두 값을 복사
6. 저장소 루트(`art class/` 폴더)에 `.env.local` 파일을 새로 만들고 아래 내용을 붙여넣기

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> `.env.local` 은 `.gitignore` 에 이미 포함돼 있어 커밋되지 않습니다.
> `service_role` 키는 절대로 프론트엔드/`.env.local` 에 넣지 마세요. RLS 를 무시하는 관리자 키입니다.

체크: 두 값이 `.env.local` 에 들어 있고, 파일이 프로젝트 루트(=`package.json` 과 같은 폴더)에 있다.

---

## 2단계 — 교사 계정 생성 (Supabase Auth)

1. 대시보드 → **Authentication → Users** → **Add user → Create new user**
2. **Email + Password** 방식 선택
3. 본인 교사 이메일·비밀번호 입력 → **Create user**
4. (선택) 초대 메일 확인이 귀찮으면 같은 화면에서 **Auto Confirm User** 를 켜고 생성

체크: Users 목록에 본인 이메일이 `Confirmed at` 시각과 함께 보인다.

> 1교사 = 1학급 MVP 이므로, 한 Supabase 프로젝트에는 교사 계정 1개만 만들면 됩니다. 여러 교사를 분리하고 싶다면 학교별로 Supabase 프로젝트를 따로 만드는 것을 권장합니다(무료 티어 2개까지 가능).

---

## 3단계 — SQL 마이그레이션 실행 (4개 파일, 순서대로)

대시보드 → **SQL Editor** → **New query** 에서 아래 4개 파일을 **순서대로** 복사·붙여넣기 후 **Run**.

```
supabase/migrations/0001_classrooms.sql
supabase/migrations/0002_assignments.sql
supabase/migrations/0003_assignment_submissions.sql
supabase/migrations/0004_rls_policies.sql
```

각 파일이 에러 없이 `Success. No rows returned` 로 끝나야 다음 파일로 넘어갑니다.

> `0005_storage_note.sql` 은 SQL 이 아니라 **기록용 주석 파일**입니다. Storage 버킷은 4단계에서 대시보드 GUI 로 만듭니다.

체크: **Table Editor** 에서 `classrooms`, `assignments`, `assignment_submissions` 세 테이블이 모두 보이고, 각 테이블 우상단 자물쇠 아이콘(RLS enabled)이 활성화돼 있다.

---

## 4단계 — Storage 버킷 2개 생성 (모두 Public)

대시보드 → **Storage** → **New bucket** 을 **2번** 반복합니다.

### 버킷 1 — `classroom-assets` (교사 도안 저장)

1. **New bucket** 클릭
2. Name: **`classroom-assets`** (정확히 이 이름)
3. **Public bucket** 체크 ON
4. **File size limit: 5 MB**
5. **Allowed MIME types**: `image/png, image/jpeg, image/svg+xml`
6. **Save**

### 버킷 2 — `classroom-submissions` (학생 제출 사진)

1. **New bucket** 클릭
2. Name: **`classroom-submissions`** (정확히 이 이름)
3. **Public bucket** 체크 ON
4. **File size limit: 5 MB**
5. **Allowed MIME types**: `image/png, image/jpeg`
6. **Save**

> 버킷 이름이 한 글자라도 틀리면 게시·제출 시 `bucket not found` 오류가 납니다. 두 이름 정확히 맞춰주세요.

체크: Storage 좌측 트리에 `classroom-assets` 와 `classroom-submissions` 두 폴더 아이콘이 보인다.

---

## 5단계 — 로컬에서 동작 확인

```bash
npm run dev
```

브라우저에서 앱을 열고, 헤더의 **로그인** 으로 2단계에서 만든 교사 계정으로 로그인합니다. 로그인 후:

1. **학급 만들기** → 학급 이름 입력 → 6자리 학급 코드가 발급됨
2. 도안 생성기에서 도안 1장 생성
3. **📤 우리 학급에 게시** 버튼 → 과제 제목 입력 → 학급에 누적 게시
4. 시크릿 창(또는 다른 브라우저)에서 `/class/<6자리코드>` 로 접속 → 과제 목록과 학생 제출 화면이 보이면 성공

체크: 학생 화면에서 사진을 제출하면 교사 대시보드 **검수** 탭에 미승인 행이 뜨고, 승인 토글 후 **전시장** 탭에서만 보인다.

---

## 비용 메모

| 항목 | Free tier 한도 | 교실 1~2개 사용량 |
|---|---|---|
| DB 용량 | 500 MB | 학급/과제/제출 1행당 수 KB → 여유 |
| 월간 요청 | 500만 | 학생 30명 × 수업 50회 = 여유 |
| Realtime 동시 접속 | 200 | 반 30명 × 1~2반 = 여유 |
| Storage | 1 GB | 제출 1장 200KB 기준 약 5,000장 |

영구 보관 정책이라 누적되긴 하지만, 학년 단위(약 200~300장)에서는 무료 티어 안에서 충분합니다. 용량이 부담되면 학년 종료 시점에 교사가 수동으로 오래된 과제를 삭제할 수 있습니다(제출도 cascade 로 함께 정리).

---

## 보안 메모

- **anon key 는 공개돼도 안전합니다.** 프론트엔드 빌드에 포함되는 전제 키이며, RLS 가 실제 접근을 막습니다.
- 데이터 접근 제어는 `0004_rls_policies.sql` 의 Row Level Security 정책이 담당합니다.
- 교사는 본인 학급(=`teacher_id = auth.uid()`)만 INSERT/UPDATE/DELETE 할 수 있습니다.
- 익명(학생) 클라이언트는:
  - `classrooms` / `assignments` 는 SELECT 만 가능 (학급 코드로 진입 + 과제 목록 노출)
  - `assignment_submissions` 는 INSERT(자기 제출) 가능, 그러나 SELECT 는 `approved = true` 인 행만 — 미승인 작품은 절대 노출되지 않습니다
  - DELETE / UPDATE 는 일체 불가
- 학생 본인 제출 상태는 브라우저 로컬 상태(`localStorage`)로만 유지합니다. 페이지 새로고침 시 "사진 선택" 화면으로 돌아가며, 다시 업로드하면 새로운 pending 행이 생성됩니다(교사는 가장 최근 제출만 승인하면 됩니다).
- 학생 PII 는 수집하지 않습니다. `student_token`(브라우저 UUID) + 사용자 임의 입력 `nickname` 만 서버에 남으며, 출석부·명단 기능은 없습니다.

---

## 문제 해결

- **로그인이 안 됨** → Authentication → Users 에서 해당 계정의 `Confirmed at` 이 비어 있으면 **Auto Confirm User** 를 켜고 다시 만들거나, 메일 확인 링크 클릭
- **"학급에 게시" 시 401/403** → 1) `.env.local` 에 anon key 가 정확히 들어갔는지, 2) 로그인된 계정이 본인 학급의 `teacher_id` 와 일치하는지 확인
- **`.env.local` 변경 후 반영 안 됨** → Vite 는 env 변경 시 dev 서버 재시작 필요 (`Ctrl+C` 후 `npm run dev`)
- **Storage 업로드 시 `bucket not found`** → 4단계의 버킷 이름 오타 확인 (`classroom-assets`, `classroom-submissions`)
- **RLS 정책 오류로 마이그레이션 실패** → Supabase 는 같은 정책 이름 재생성 시 충돌. 실패한 SQL 만 골라내거나, Database → Policies 에서 해당 테이블 정책을 모두 지운 뒤 `0004_rls_policies.sql` 만 다시 실행

---

참고:
- 마이그레이션 파일 원본: `supabase/migrations/`
- TypeScript 타입: `src/types/classroom.ts`
