Art Class Workspace v3 — LMS 리팩터 계획
==============================================

> 기반: v2 Tasks 1~9 (완료)
> 방향: 일회성 "세션"이 아닌 구글 클래스룸 형태의 **영구 학급**
> 작성: 2026-04-25

## 결정 사항 (사용자 확정)

1. **1교사 1학급 MVP** — `classrooms.teacher_id` UNIQUE
2. **학습 과정 누적** — 학급에 과제(도안) 여러 개
3. **모든 도안 게시 허용** — 자유·만다라·교과서 무관, 생성된 도안이면 학급에 게시 가능
4. **영구 보관** — 24h TTL·cleanup Edge Function 제거
5. **PNG만 다운로드** — 학생 과제 페이지는 PNG 내려받기 단일 버튼

## 원칙

- **학생 개인정보 0**: 서버에 `student_token`(브라우저 UUID) + `nickname`(자유 입력)만. 명단·출석 테이블 없음
- **학급 코드·QR 불변**: 학급 생성 시 6자리 코드 1회 발급, 삭제 전까지 유지
- **교사 격리**: 모든 학급 데이터는 `teacher_id` 기반 RLS
- **BYOK 유지**: Gemini 호출은 여전히 브라우저→Gemini 직접

## 새 데이터 모델

```sql
create table classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references auth.users, -- 1교사 1학급
  name text not null,
  code text not null unique,                             -- 6자리, 영구
  created_at timestamptz default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms on delete cascade,
  title text not null,
  image_url text not null,                               -- Storage 공개 URL
  prompt text,                                           -- 재생성·디버그용
  created_at timestamptz default now()
);

create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments on delete cascade,
  student_token text not null,
  nickname text,
  image_url text not null,
  approved boolean default false,
  created_at timestamptz default now()
);
```

**Storage 버킷 (모두 Public)**
- `classroom-assets` — 교사 업로드 도안
- `classroom-submissions` — 학생 제출 사진 (기존 유지)

**RLS 요약**
- `classrooms`: teacher 본인만 CRUD. 익명은 `code` 매칭으로 SELECT(학생 입장)
- `assignments`: 소유 교사 CRUD. 익명은 classroom code 경유로 SELECT
- `assignment_submissions`: 익명 INSERT, 소유 교사 UPDATE(approve), 익명 SELECT는 `approved=true` 만

## UI 동선

### 교사
1. 로그인 (TeacherAuthGate)
2. **"내 학급" 패널** (사이드바 또는 상단 탭):
   - 학급 없음 → "새 학급 만들기" 폼 (이름 1줄)
   - 학급 있음 → 이름·QR·코드(고정) 노출 + 과제 리스트 + "학급 전시장 열기" 버튼
3. 도안 생성 경로(자유/만다라/교과서) 사용 → 결과 패널에 **"📤 우리 학급에 게시"** 버튼
   - 학급 없으면 disabled + 툴팁
   - 클릭 시 과제 제목 입력 → Storage 업로드 → `assignments` insert
4. 과제별 제출 목록: TeacherReviewPanel (승인 토글)
5. 학급 전시장: ClassGallery (모든 승인 작품) + TV 슬라이드쇼 + 카탈로그 PDF

### 학생
1. QR 스캔 → `/class/ABC123`
2. 닉네임 입력 (localStorage 자동 복원)
3. 과제 리스트 (썸네일)
4. 과제 클릭 → 도안 프리뷰 + "📥 PNG 다운로드" + StudentSubmitPanel
5. 제출 후: "검수 대기" → 승인되면 "🌟 전시 완료"

## 제거 대상 (이 리팩터에 포함)

**v2 에서 쓰던 것들 전부 삭제**
- 투표: `voteToPrompt.ts`, `VoteOptionsEditor.*`, `VoteDashboard.*`, `session_votes` 테이블
- 워터마크: `pdfExporter.ts`·`classCatalogPdf.ts`·`ExportPanel.tsx` 내 모든 워터마크 로직
- 저작권 보증서: `copyrightCertificate.ts`, ExportPanel 교사 이름 입력, App.tsx `deriveUnitLabel`
- 색약 시뮬: `cvdSimulation.ts`, CanvasPreview CVD 탭 (선 굵기 +20% 수동 버튼만 남김)
- 24h TTL: `cleanup_expired_sessions` SQL 함수, `expires_at` 컬럼

**데이터베이스 리셋**
- 기존 Supabase 미배포로 확인됨 → `supabase/migrations/0001~0007` 삭제, 신규 0001~0005 로 재시작

## 태스크 분해

| ID | 제목 | 커밋 1건 예상 변경 |
|---|---|---|
| **T0** | **제거 정리** (투표·워터마크·CVD·보증서·TTL) | 삭제 위주, 타입 체크 통과 |
| **T1** | **새 스키마** (`classrooms`·`assignments`·`assignment_submissions`) + Storage 문서 | 마이그레이션 5개 + types/classroom.ts 리라이트 |
| **T2** | **교사 학급 CRUD** (`useClassroom`·`ClassroomPanel`) | 신규 훅·컴포넌트 |
| **T3** | **"학급에 게시" 플로우** (`useAssignments`·결과 패널 버튼·제목 모달) | 결과 영역 연결 |
| **T4** | **학생 `/class/:code` 라우트** (닉네임·과제 리스트·과제 상세+다운로드+제출) | 신규 라우팅/컴포넌트, 기존 StudentSubmitPanel 재배선 |
| **T5** | **교사 검수/전시장 재구성** (TeacherReviewPanel·ClassGallery assignment 단위 재배선) | 기존 컴포넌트 prop 리네이밍 |
| **T6** | **문서·QA** (README·art-class.md·SUPABASE_SETUP·QA_CHECKLIST) | 문서 갱신 |

각 태스크마다 스펙 리뷰 → 품질 리뷰 → 필요 시 후속 조치 커밋 → 다음 태스크.

## 출시 게이트 (v3)

- [ ] 교사 1명: 로그인 → 학급 생성 → 도안 3종 게시 → 학생 3명 제출 시뮬 → 2건 승인 → 전시장 확인 → 카탈로그 PDF 추출
- [ ] 학생: QR 스캔 → 닉 입력 → 과제 다운로드 → 업로드 → 검수 대기 → 승인 확인
- [ ] 학급 URL 동일(재방문) 시 동일 코드·QR
- [ ] 학생이 개인정보(이름·학번·이메일) 입력란 없음 확인
- [ ] 타 교사 계정 → 본인 학급만 접근 (RLS 검증)

---

*v2 계획서(`art-class-v2-plan.md`)는 역사 기록용으로 남김.*
