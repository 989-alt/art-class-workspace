# Art Class Workspace v3 — LMS 학급 모드 PRD

> 마지막 갱신: 2026-04-25
> 이전 버전 PRD: v2(`art-class-v2-plan.md` 참조, 역사 기록)
> 실행 계획: `art-class-v3-lms-plan.md`

---

## 0. 한 줄 요약

초등 미술 수업을 위한 LMS형 AI 도안 워크스페이스. 교사가 BYOK Gemini로 도안을 만들어 1교사 1학급에 누적 게시하고, 학생은 무계정 QR 입장으로 도안을 받아 색칠한 뒤 작품을 제출하면 교사 승인 후 학급 전시장에 영구 전시된다.

---

## 1. 문제 정의 / 타겟 사용자

### 문제

- 교사는 교과서 단원에 정확히 맞는 흑백 선화 도안을 매 차시 직접 그리거나 검색해야 한다.
- 일반 이미지 생성 SaaS는 학생 명단·계정·요금이 필요하고, 학교 보안 정책과 충돌한다.
- 학생 작품을 모아 전시·공유할 가벼운 LMS 도구가 없고, 구글 클래스룸은 미술 결과물 큐레이션에 부적합하다.

### 타겟 사용자

- **주 사용자**: 초등 미술·담임 교사 (PC 교실 컴퓨터)
- **보조 사용자**: 학생 (모바일 QR로만 참여, 명단·계정·이메일 없음)
- **혼자 쓰기 모드**: Supabase 미설정 시 BYOK 도안 생성기 단독 동작 (학부모·1인 교사 사용)

---

## 2. 핵심 사용자 동선

### 2.1 교사 동선

1. 첫 진입에서 Gemini API 키 입력 → 메인 워크스페이스 진입
2. (학급 모드 사용 시) 헤더 "🏫 내 학급" → Supabase 로그인 → 학급 만들기 (이름 1줄)
3. 6자리 학급 코드 + QR + 학급 URL이 영구 발급되어 항상 노출
4. 도안 생성 (자유/만다라/교과서 단원) → 결과 패널의 **"📤 우리 학급에 게시"** 버튼
5. 과제 제목 입력 → Storage 업로드 → `assignments` 테이블 insert
6. 과제 누적 리스트에서 각 과제별 학생 제출을 검수 (✅ ↔ ⏸ 토글)
7. "🎨 학급 전시장" → 승인 작품 그리드 / "📺 TV 모드" / "📄 카탈로그 PDF"

### 2.2 학생 동선

1. 교사 화면의 QR 스캔, 또는 URL `#/class/ABCDEF` 직접 입력
2. 닉네임 입력 (`localStorage`에 자동 저장 → 다음 방문 시 복원)
3. 학급 과제 리스트 (썸네일 + 제목)
4. 과제 클릭 → 도안 프리뷰 + "📥 PNG 다운로드"
5. 종이 색칠 후 사진 촬영 → "📸 사진 선택" → 업로드 → "✅ 제출 완료! 검수 대기중"
6. 교사가 승인하면 학급 전시장에 자동 등재

---

## 3. 기능 범위

### 3.1 v3에 있는 것

**도안 생성 (BYOK 단독 모드, Supabase 불필요)**
- BYOK Gemini API + 키 마스킹 + 로컬 저장
- 자유 주제 / 만다라 / 교과서 단원 프리셋 10종
- 난이도 3단계 (하·중·상)
- N×M 그리드 자동 비율 (A5~A1, B5~B1 + 가로/세로)
- 다중 생성 + 갤러리 + ZIP 일괄 다운로드
- SVG 벡터화 (imagetracerjs)
- jsPDF 무여백 분할 PDF
- 선 굵기 +20% 수동 보정 버튼 (적용 여부 결과별 추적)

**학급 LMS 모드 (Supabase 옵션)**
- 1교사 1학급 (`classrooms.teacher_id` UNIQUE)
- 6자리 학급 코드 + QR 영구 발급
- 학급 이름 변경 / 학급 삭제 (cascade)
- 도안을 과제로 게시 → `classroom-assets` Storage 업로드
- 학생 무계정 입장 — `student_token`(브라우저 UUID) + 자유 입력 `nickname` 만 저장
- 학생 PNG 다운로드 + 사진 업로드
- 교사 검수 패널 (Realtime 구독)
- 학급 전시장 그리드 (승인된 작품)
- TV 모드 풀스크린 슬라이드쇼 (Space/←/→/Esc + 포커스 복귀)
- 학급 카탈로그 PDF (표지 + 4컷 그리드)
- 영구 보관 (TTL/cleanup 없음)

### 3.2 v3에서 제거된 것

v2에 있었지만 v3 LMS 리팩터에서 의도적으로 제거:

- 투표·다수결 프롬프트 합성 (`voteToPrompt.ts`, `VoteOptionsEditor`, `VoteDashboard`, `session_votes` 테이블)
- PDF 워터마크
- 색약(CVD) 시뮬레이션 프리뷰 (`cvdSimulation.ts`, CVD 탭)
- 저작권 보증서 PDF (`copyrightCertificate.ts`, ExportPanel 교사 이름 입력)
- 24시간 자동 삭제 (`cleanup_expired_sessions` 함수, `expires_at` 컬럼)

이유: 1교사 1학급 영구 LMS 가치에 집중하기 위해 데모용·사이드 기능을 정리.

### 3.3 향후 (v3.1 이후)

- 다교사 다학급 (`teacher_id` UNIQUE 제거 + 공유 학급)
- jsPDF 한글 폰트 임베드 (현재 카탈로그 PDF에서 한국어가 tofu 처리)
- 메인 번들 dynamic-import 분리 (Gemini SDK + jsPDF를 첫 로드에서 빼기)
- 학급별 비밀번호 옵션 (코드만으로 입장 가능한 현 구조 + 선택적 보호)
- 학급별 사용 통계 / 도안 아카이브
- PWA 설치 유도 (학생 경로용)

---

## 4. 데이터 모델

```sql
-- 교사 1명 = 학급 1개 (MVP)
create table classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references auth.users on delete cascade,
  name text not null,
  code text not null unique,                      -- 6자리, 영구
  created_at timestamptz default now()
);

-- 학급에 누적 게시되는 과제(도안)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms on delete cascade,
  title text not null,
  image_url text not null,                        -- classroom-assets 공개 URL
  prompt text,                                    -- 재생성·디버그용
  created_at timestamptz default now()
);

-- 학생 제출 (개인정보 미수집)
create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments on delete cascade,
  student_token text not null,                    -- 브라우저 UUID
  nickname text,                                  -- 자유 입력
  image_url text not null,                        -- classroom-submissions 공개 URL
  approved boolean default false,
  created_at timestamptz default now()
);
```

**Storage 버킷 (모두 Public)**
- `classroom-assets` — 교사가 게시한 도안
- `classroom-submissions` — 학생이 제출한 색칠본 사진

**RLS 요약**
- `classrooms`: 익명 SELECT는 `code` 필터 매칭만 허용. 교사 본인만 INSERT/UPDATE/DELETE.
- `assignments`: 익명 SELECT는 본인이 진입한 학급의 과제만. 교사 본인만 CRUD.
- `assignment_submissions`: 익명 INSERT 허용. 익명 SELECT는 `approved = true` 만. UPDATE는 교사 본인만 (승인).

---

## 5. 보안·프라이버시 원칙

1. **BYOK + Supabase 옵셔널**
   - Gemini 호출은 항상 브라우저 → Gemini 직접. API 키는 Supabase에 절대 업로드되지 않음.
   - Supabase 미설정 환경에서도 도안 생성·SVG·PDF 모든 핵심 기능 동작.

2. **학생 개인정보 미수집**
   - 서버에 저장되는 학생 식별자는 `student_token`(클라이언트 UUID, `localStorage`) + 임의 입력 `nickname` 두 개뿐.
   - 명단·출석·이메일 테이블 없음. 이름·학년·학반 입력란 없음.

3. **익명 SELECT는 항상 공개-조건 필터**
   - 학생 클라이언트가 제출본을 읽을 때 RLS 정책은 `approved = true` 조건 필수.
   - `using (true)` 같은 무조건 SELECT 정책 금지.
   - 교사 본인 데이터는 `auth.uid() = teacher_id` 로 격리.

4. **교사 격리**
   - 모든 학급 / 과제 / 제출 데이터는 `teacher_id` 기반 RLS로 다른 교사 계정에서 접근 불가.

5. **버킷 공개성**
   - `classroom-assets`, `classroom-submissions` 둘 다 Public. URL을 알면 누구나 접근.
   - 학급 코드 + 학생 진입을 거쳐야 URL이 노출되므로 학급 단위 비공개 LMS로 동작.
   - 민감 콘텐츠(학생 얼굴 등)는 교사 검수 단계에서 차단 책임.

---

## 6. 비기능 요구

### 인지 / 한계

- **메인 번들 ~1.2MB (gzip ~370KB)**
  `@google/genai` SDK가 대부분을 차지. v3.1에서 dynamic-import로 분리 예정. 현재는 BYOK 진입 페이지에도 동봉되어 있음.

- **jsPDF는 한국어 미지원**
  기본 빌드에서 한글이 tofu(□)로 렌더된다. 도안 PDF는 영문 워터마크가 없으므로 영향 없음. 학급 카탈로그 PDF는 표지·캡션의 한국어가 tofu가 될 수 있음 — v3.1 폰트 임베드 과제로 둠.

- **Supabase 무료 티어**
  500MB DB / 1GB Storage / Realtime 200 동시. 교실 1~2개 단위 사용량을 가정.

### 성능 목표 (BYOK 단독 페이지 기준)

- Lighthouse 성능 ≥ 90 (목표, 데스크톱)
- Lighthouse 접근성 ≥ 95
- 학급 데이터 변경 → 다른 클라이언트 반영 ≤ 2초 (Supabase Realtime)

### 호환성

- 최신 Chrome / Edge / Safari (PC). 학생 경로(`#/class/:code`)는 모바일 Safari/Chrome 지원.

---

## 7. 출시 게이트 (v3)

`art-class-v3-lms-plan.md` §"출시 게이트 (v3)" 와 동일하게 운영:

- [ ] 교사 1명: 로그인 → 학급 생성 → 도안 3종 게시 → 학생 3명 제출 시뮬 → 2건 승인 → 전시장 확인 → 카탈로그 PDF 추출
- [ ] 학생: QR 스캔 → 닉네임 입력 → 과제 다운로드 → 작품 업로드 → 검수 대기 → 승인 후 전시 확인
- [ ] 학급 URL을 새 탭/하루 뒤 재방문 시에도 동일 코드·QR·과제 보존 (TTL 없음)
- [ ] 학생 진입 화면에 이름·학번·이메일 등 개인정보 입력란이 없음
- [ ] 두 번째 교사 계정 생성 시, 첫 번째 학급 데이터에 접근 불가 (RLS 검증)

---

## 8. 변경 이력

- **v1.0** — 완전 서버리스 BYOK 단독. 자유/만다라 모드, Quick Edit, 다중 생성, ZIP 다운로드, NxM PDF 분할 출력.
- **v2.0** — 교과서 프리셋 10종, 일회성 학급 세션(투표 → 다수결 프롬프트), PDF 워터마크/색약 프리뷰/저작권 보증서, 학급 갤러리(24h TTL).
- **v3.0** — LMS 리팩터. 일회성 세션 → 영구 1교사 1학급. 투표·워터마크·CVD·보증서·TTL 제거. 도안→과제 게시→무계정 학생 입장→제출→검수→영구 전시 동선으로 단순화.
