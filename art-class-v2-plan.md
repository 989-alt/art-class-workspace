> ⚠️ **이 문서는 v2 시점의 계획서입니다. v3 LMS 리팩터로 대체되었습니다.**
> 현재 PRD: `art-class.md` (v3 LMS)
> 현재 실행 계획: `art-class-v3-lms-plan.md`
> 이 파일은 역사 기록 / 의사결정 추적 목적으로만 보존합니다. v3 와 충돌하는 내용(투표·워터마크·CVD·보증서·24h TTL 등)은 **이미 제거되었으므로 새 작업의 기준으로 삼지 마세요.**

---

📄 Art Class Workspace v2.0 — 구체화된 개선 계획
====================================================

> 기반: `C:\Users\hit\Downloads\issamGPT_바이브코딩_기획_종합.md` §6 Tier S 1위
> 작성일: 2026-04-24
> v1 PRD: `art-class.md` 참조

---

## 0. 핵심 결정 사항 (Executive Summary)

v1의 **완전 서버리스·BYOK 철학**은 유지하되, "학생 참여"는 불가피하게 실시간 통신을 요구한다. 세 가지 원칙으로 정리:

1. **Gemini API 호출은 v1 그대로** — 여전히 브라우저 → Gemini 직접, 서버 경유 없음
2. **학급 기능은 옵셔널** — 켜지 않으면 v1과 동일하게 작동 (학교 방화벽·개인 사용자 고려)
3. **제안서 제출 시점을 Phase 1에 고정** — QR·갤러리는 데모 플러스, 필수 아님

### 아키텍처 결정표

| 구분 | v1 (현재) | v2.0 (확장) |
|---|---|---|
| 프론트 | React 18 + Vite + TS | 동일 |
| AI | Gemini Nano Banana (BYOK) | 동일 |
| 저장 | localStorage (키, 히스토리) | + IndexedDB (단원 프리셋 캐시) |
| 실시간 | 없음 | **Supabase Realtime** (옵션) |
| 인증 | 없음 | Supabase Auth (교사만), 익명 토큰 (학생) |
| Storage | 없음 | Supabase Storage (학급 갤러리) |
| 호스팅 | GitHub Pages | GitHub Pages (정적 유지) |

**Supabase 선택 이유**: SEONBI'S LAB이 이미 Supabase + Naver SMTP로 운영 중 → 계정·인프라 재사용 가능. 무료 티어 500MB Storage, Realtime 200 concurrent로 교실 1~2개 수업 동시 커버.

---

## 1. v1 코드 기반 진단

### 1-1. 이미 구현된 것 (재활용)
- ✅ BYOK + API 키 마스킹 + 로그아웃 (`hooks/useApiKey.ts`)
- ✅ Quick Edit + 3단 히스토리 (`hooks/useGeneration.ts`, `useHistory.ts`)
- ✅ SVG 벡터화 (`utils/vectorizer.ts`)
- ✅ PDF NxM 분할 (`utils/pdfExporter.ts`) — A4뿐 아니라 A5~A1, B5~B1 전부 지원 (타입 레벨 완비)
- ✅ 갤러리 기본 (`components/Gallery/Gallery.tsx`) — 다중 생성·ZIP 일괄 다운로드
- ✅ 자유/만다라 모드 전환, 난이도 3단계

### 1-2. 없는 것 (v2.0 구현 대상)
- ❌ 교과서 단원 프리셋
- ❌ 학생 참여 수단 (QR·세션)
- ❌ PDF 워터마크·색약 시뮬레이션
- ❌ 저작권 메타데이터/보증서
- ❌ 학급 갤러리(공유·전시)

### 1-3. 7공식 갭 재점검

| 공식 | v1 | v2.0 (Phase) |
|---|:---:|:---:|
| 40분 완결 | ✅ | ✅ |
| 교탁 1대 | ⚠️ | ✅ (Phase 2 QR) |
| 단원 1:1 | ❌ | ✅ (Phase 1 프리셋) |
| 교사 자동화 | ✅ | ✅ (유지) |
| 비대칭 정보 | N/A | N/A (창작형은 해당 안 됨) |
| 역전 규칙 | N/A | N/A |
| 백오피스 | ⚠️ | ✅ (Phase 1 보증서·인쇄 / Phase 3 갤러리) |

---

## 2. 일정 재설계 — "매 Phase 끝에 출시 가능" 원칙

원안 8주(1~2주 프리셋 / 3~4주 QR / 5~6주 인쇄 / 7~8주 갤러리)는 **Phase 끝마다 배포 가능한 증분**으로 재편.

### 🟢 Phase 1 — 완성도 부스터 (2주) — **제안서 제출 시점**
완전 로컬, Supabase 불필요. 서버리스 유지.

**주 1**
- [ ] `src/data/curriculumPresets.ts` — 10개 단원 프리셋 JSON (스키마 §3 참조)
- [ ] `components/Form/CurriculumPresetPicker.tsx` — 학년/교과 필터 + 카드 선택
- [ ] `services/promptBuilder.ts` 확장 — `buildPromptFromPreset()` 추가, 기존 `buildPrompt()` 유지
- [ ] `GeneratorForm.tsx`에 프리셋 탭 추가 (자유/만다라/**교과서** 3 모드)

**주 2**
- [ ] `utils/pdfExporter.ts` 고도화
  - 워터마크 옵션 (PDF 하단 옅은 텍스트)
  - 색약 시뮬레이션 프리뷰 (Daltonize 필터, 3종 모드)
  - 선 굵기 자동 보정 (색약 감지 시 +20%)
- [ ] `utils/copyrightCertificate.ts` 신설
  - 메타데이터 구조체 생성
  - PDF 마지막 페이지 자동 삽입 (On/Off 스위치)
  - SHA-256 해시 + QR 코드 (진위 확인 URL)
- [ ] `ExportPanel.tsx` UI 추가 (워터마크·보증서 토글)

**Phase 1 출시 기준**:
- 단원 10종 중 택 1 → 도안 생성 → 인쇄 PDF에 보증서 포함
- 색약 프리뷰 3종 전환
- 워터마크 On/Off 동작

### 🟡 Phase 2 — 학생 참여 (3주)
Supabase 도입. **"학급 모드"만 유료 제공해도 될 만큼 가치 집중.**

**주 3**
- [ ] Supabase 프로젝트 세팅 (SEONBI'S LAB 동일 프로젝트 내 스키마 분리)
- [ ] DB 스키마 (§4 참조): `classroom_sessions`, `session_votes`, `session_submissions`
- [ ] RLS 정책 — 교사만 쓰기, 학생은 본인 토큰으로만 read/insert
- [ ] `lib/supabaseClient.ts` — lazy import (학급 모드 진입 시만 로드)

**주 4**
- [ ] `components/Classroom/SessionHost.tsx` — 교사 화면 (세션 코드·QR·실시간 집계 대시보드)
- [ ] 라우터 추가 (`/session/:code`) — 학생 웹뷰
- [ ] `components/Classroom/StudentVoteView.tsx` — 키워드·팔레트·디테일 투표
- [ ] Realtime Channel 구독 (`classroom_sessions:${code}`)

**주 5**
- [ ] `services/voteToPrompt.ts` — 다수결 집계 → 프롬프트 조합
- [ ] 도안 생성 후 Realtime broadcast → 학생 화면에 완성본 푸시
- [ ] 에러 상태 처리 (연결 끊김·Supabase 다운 → "오프라인 모드로 전환")
- [ ] 모바일 웹뷰 반응형 (v1은 PC 전용이었으나 학생 경로만 모바일 지원)

**Phase 2 출시 기준**:
- 세션 생성 5초 이내, QR 표시 1초 이내
- 학생 20명 동시 투표 집계 지연 2초 이내
- 학교 Wi-Fi에서 Supabase 차단 시 "로컬 모드" 전환 토스트

### 🔵 Phase 3 — 학급 갤러리 + 폴리싱 (3주)

**주 6**
- [ ] 학생 작품 제출 엔드포인트 (학생이 색칠 완료본 사진 업로드)
- [ ] 교사 검수 UI (업로드 전 승인)
- [ ] Supabase Storage 버킷 (auto-delete 24h CRON 또는 edge function)

**주 7**
- [ ] 반 단위 전시장 뷰 (`components/Classroom/ClassGallery.tsx`)
- [ ] TV 송출 모드 (전체화면 슬라이드쇼, 자동 전환)
- [ ] 인쇄 출력 (학급 전시 카탈로그 PDF)

**주 8**
- [ ] QA — E2E 시나리오 (교사 1명 + 학생 20명 시뮬레이션)
- [ ] 접근성 AA (키보드 내비·대체 텍스트·4.5:1 대비)
- [ ] 성능 번들 축소 (lazy load Classroom 모듈, 기본 번들 200KB 유지)
- [ ] 문서 업데이트 (`README.md`, `art-class.md` → v2 PRD로 갱신)

**Phase 3 출시 기준**:
- 20명 제출 → 갤러리 로딩 1초 이내
- 24h 자동 삭제 동작 확인
- Lighthouse 성능 90+, 접근성 95+

---

## 3. 교과서 단원 프리셋 DB 스키마

### 3-1. 타입 정의 (`src/types/curriculum.ts` 신설)

```ts
export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Semester = 1 | 2;
export type Subject = '국어' | '사회' | '과학' | '미술' | '도덕' | '실과';

export interface CurriculumPreset {
  id: string;                    // "3-1-art-our-town"
  grade: Grade;
  semester: Semester;
  subject: Subject;
  unitTitle: string;             // "우리 동네의 모습"
  unitCode: string;              // "3-1-미-2"
  thumbnailSvg: string;          // 인라인 SVG 또는 CDN URL
  suggestedTopics: string[];     // 4~6개 세부 주제 칩
  basePrompt: string;            // 영어 프롬프트 시드
  styleDirective: string;        // 추가 스타일 지시어
  difficulty: Difficulty;
  defaultGrid: { n: number; m: number };
  defaultPaper: PaperSize;
  defaultOrientation: Orientation;
  teachingNote: string;          // 교사용 지도 팁 (선택)
  learningObjectives: string[];  // 성취기준 2~3개
  timeEstimate: number;          // 예상 차시(분) 보통 40
}
```

### 3-2. 10개 MVP 프리셋 선정

초등 미술 수업 빈도 기준, 교과서 단원 태깅 1:1 충족:

| # | id | 학년 | 교과 | 단원 | 그리드 | 용지 |
|---|---|:---:|:---:|---|:---:|:---:|
| 1 | `3-1-art-our-town` | 3-1 | 미술 | 우리 동네의 모습 | 2×2 | A3 가로 |
| 2 | `3-2-art-imagination` | 3-2 | 미술 | 상상 속 세계 | 1×1 | A3 세로 |
| 3 | `4-1-art-spring-life` | 4-1 | 미술 | 봄의 생명 | 2×1 | A3 가로 |
| 4 | `4-2-art-heritage-mandala` | 4-2 | 미술 | 전통 문화 만다라 | 1×1 | A3 세로 |
| 5 | `5-1-sci-ecosystem` | 5-1 | 과학+미술 | 생물과 환경 (생태 포스터) | 2×3 | A2 가로 |
| 6 | `5-2-soc-heritage` | 5-2 | 사회+미술 | 문화유산 장면 | 2×2 | A3 가로 |
| 7 | `6-1-soc-symbols` | 6-1 | 사회+미술 | 우리나라의 상징 | 2×2 | A3 세로 |
| 8 | `6-2-art-future-city` | 6-2 | 미술 | 미래 도시 | 3×2 | A2 가로 |
| 9 | `all-seasons-mandala` | 전학년 | 미술 | 계절 만다라 (봄·여름·가을·겨울) | 2×2 | A4 세로 |
| 10 | `all-emotion-characters` | 전학년 | 미술+도덕 | 감정 캐릭터 | 1×1 | A4 세로 |

### 3-3. 예시 레코드 (실제 데이터)

```ts
{
  id: "3-1-art-our-town",
  grade: 3, semester: 1, subject: "미술",
  unitTitle: "우리 동네의 모습",
  unitCode: "3-1-미-2",
  thumbnailSvg: "/presets/our-town.svg",
  suggestedTopics: [
    "내가 사는 아파트",
    "동네 놀이터",
    "가게 간판들",
    "공원의 큰 나무",
    "학교 가는 길"
  ],
  basePrompt:
    "A neighborhood scene viewed from a child's perspective, " +
    "with houses, streets, local shops, trees, and people going " +
    "about their day. Warm and familiar atmosphere.",
  styleDirective:
    "childlike, bold outlines, simplified shapes, clear silhouettes",
  difficulty: "easy",
  defaultGrid: { n: 2, m: 2 },
  defaultPaper: "A3",
  defaultOrientation: "horizontal",
  teachingNote:
    "완성 후 급우의 도안과 비교하여 우리 동네의 공통점·차이점 토의",
  learningObjectives: [
    "주변 환경을 관찰하여 특징 찾기",
    "형태와 선으로 장소를 표현하기"
  ],
  timeEstimate: 40
}
```

---

## 4. Supabase 스키마 (Phase 2)

### 4-1. 테이블

```sql
-- 수업 세션 (교사가 생성)
create table classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- 6자리 영숫자
  teacher_id uuid references auth.users,
  preset_id text not null,                   -- curriculum preset id
  status text not null default 'voting',     -- voting|generating|complete|closed
  vote_options jsonb not null,               -- { keywords: [...], palettes: [...], details: [...] }
  final_prompt text,
  final_image_url text,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '24 hours'
);

-- 학생 투표
create table session_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references classroom_sessions on delete cascade,
  student_token text not null,               -- 익명 세션 토큰
  nickname text,
  vote_keyword text,
  vote_palette text,
  vote_detail text,
  submitted_at timestamptz default now(),
  unique(session_id, student_token)
);

-- 학생 색칠 결과 업로드 (Phase 3)
create table session_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references classroom_sessions on delete cascade,
  student_token text not null,
  nickname text,
  image_url text not null,
  approved boolean default false,            -- 교사 승인 전 비공개
  created_at timestamptz default now()
);
```

### 4-2. RLS 정책 (요약)

- `classroom_sessions`: 교사 본인만 write, 세션 코드 알면 누구나 read
- `session_votes`: 본인 토큰으로만 insert, 교사만 전체 read
- `session_submissions`: 학생 본인 insert, 교사만 approve, 승인 후 전체 read

### 4-3. 자동 삭제 전략

- Edge Function `cleanup-expired-sessions` (매 1시간)
- `classroom_sessions` 중 `expires_at < now()` 삭제 → cascade로 votes·submissions 동반 삭제
- Storage 객체는 `session_submissions` delete trigger로 함께 제거

---

## 5. 학생 참여 플로우 (Phase 2 상세)

### 5-1. 교사 동선

```
1. GeneratorForm → "교과서 모드" 탭 → 프리셋 선택
2. "학생 투표 시작" 토글 ON
3. 투표 항목 편집 (프리셋 기본값 수정 가능):
   - 키워드 5개 (예: 아파트/놀이터/간판/나무/학교)
   - 팔레트 3종 (옅은 선/보통/굵은 선)
   - 디테일 3단계 (단순/보통/복잡)
4. "세션 생성" 클릭 → 6자리 코드 + QR 표시 (교실 TV)
5. 실시간 대시보드:
   - 제출 인원 카운터
   - 키워드 워드클라우드 (실시간)
   - 팔레트·디테일 막대그래프
6. "투표 마감" → voteToPrompt() → Gemini 호출 → 완성 도안
7. 결과 화면: Gallery에 추가 + 학생 기기 푸시
```

### 5-2. 학생 동선

```
1. QR 스캔 → /session/ABC123 진입
2. 닉네임 입력 (교사가 실명/가명 정책 선택)
3. 키워드·팔레트·디테일 단일 선택 → "제출"
4. 대기 화면 ("선생님이 마감하기를 기다리는 중...")
5. 완성본 수신 → 저장/공유 가능
6. (Phase 3) 색칠 완료본 사진 업로드
```

### 5-3. 투표 → 프롬프트 조합 (`services/voteToPrompt.ts`)

```ts
export function composeVotedPrompt(
  preset: CurriculumPreset,
  votes: VoteAggregation
): string {
  const topKeyword = top(votes.keywords);
  const topPalette = top(votes.palettes);
  const topDetail = top(votes.details);

  return [
    preset.basePrompt,
    `Emphasis on: ${topKeyword}`,
    `Line weight: ${topPalette}`,
    `Detail density: ${topDetail}`,
    preset.styleDirective,
    "pure black outlines on white, no shading, no text"
  ].join(" | ");
}

function top<T>(items: Array<{ value: T; count: number }>): T {
  return items.sort((a, b) => b.count - a.count)[0].value;
}
```

---

## 6. 인쇄 엔진 고도화 (Phase 1 상세)

### 6-1. 워터마크

- 위치: 각 페이지 하단 중앙, 여백 3mm
- 내용: `SEONBI's Art Class · Gemini · 2026-04-24 14:32`
- 스타일: Gray #999, 6pt, 본문 인쇄 방해 최소
- On/Off: ExportPanel 토글 (기본 On, 교사 끄기 가능)

### 6-2. 색약 시뮬레이션 프리뷰

- 3종 모드: Deuteranopia(적록)·Protanopia(적록 강)·Tritanopia(청황)
- 구현: Canvas에서 CVD(Color Vision Deficiency) 변환 행렬 적용
- UI: 프리뷰 토글 탭 (정상·D·P·T)
- 색약 감지 시: 선 굵기 +20% 자동 제안 (수락 여부 선택)

### 6-3. 저작권 보증서 (PDF 마지막 페이지)

```
┌─────────────────────────────────────┐
│ 🎨 AI 생성 도안 보증서              │
│ ─────────────────────────────────  │
│ 생성일시  2026-04-24 14:32:05      │
│ 단원     3-1 미술 「우리 동네」    │
│ 프롬프트 (원문 앞 120자 표시)      │
│ AI 모델  Gemini Nano Banana        │
│ 도구     AI Art Class Workspace    │
│          v2.0                      │
│ 교사     이선학 (sunhak989@...)    │
│ 라이선스 CC BY-NC 4.0              │
│ 파일 해시 a3f5b2c1d4e7f8a9...      │
│ [QR] 진위 확인 URL                 │
│ ─────────────────────────────────  │
│ 수업·학습 용도 자유 사용 / 상업    │
│ 재배포 금지. 저작권 문의는 교사    │
│ 에게.                              │
└─────────────────────────────────────┘
```

- 메타데이터는 JSON으로도 PDF에 첨부 (PDF 메타 필드 + 파일명 suffix)
- 해시: 이미지 base64 + 프롬프트 + 생성일시의 SHA-256

---

## 7. 리스크 & 대응

| 리스크 | 심각도 | 대응 |
|---|:---:|---|
| Supabase 무료 티어 초과 | 중 | 이미지 1280px 리사이즈 저장, 세션 24h TTL, 월 사용량 대시보드 |
| 학교 Wi-Fi 외부 차단 | 중 | 오프라인 Fallback — Supabase 연결 실패 시 "로컬 모드" 자동 전환 |
| 학생 폰 QR 실패 | 낮 | 6자리 코드 수동 입력 경로 병행 |
| Gemini API 키 유출 우려 | 낮 | BYOK 유지. Supabase는 "수업 세션"만, 키 접근 없음 |
| 초상권·저작권 민감 | 중 | 학생 색칠본 업로드 **교사 승인 필수**, 기본 비공개, 24h 자동 삭제 |
| 제안서 마감 일정 | 높 | **Phase 1(2주) 완료 시점에 제출 가능**하도록 설계 |

---

## 8. 메트릭 & 출시 게이트

### Phase 1 게이트 (제안서 제출 가능)
- [ ] 프리셋 10종 선택 → 생성 → PDF에 보증서 자동 포함
- [ ] 색약 프리뷰 3종 전환
- [ ] 워터마크 On/Off 토글
- [ ] 기존 v1 기능 회귀 없음 (히스토리·Quick Edit·ZIP export)

### Phase 2 게이트 (v2.0 MVP)
- [ ] 세션 생성 → QR 표시 ≤ 1초
- [ ] 학생 20명 동시 투표, 대시보드 지연 ≤ 2초
- [ ] Supabase 차단 환경에서 "로컬 모드" 자동 전환 토스트

### Phase 3 게이트 (v2.0 정식)
- [ ] 학생 20명 제출 → 갤러리 로딩 ≤ 1초
- [ ] 24h 자동 삭제 동작 (로그 확인)
- [ ] Lighthouse 성능 ≥ 90, 접근성 ≥ 95
- [ ] README·PRD 업데이트 완료

---

## 9. 바로 시작할 액션 (다음 세션)

1. `src/types/curriculum.ts` 작성 — 3-1의 스키마 정의
2. `src/data/curriculumPresets.ts` — 10개 프리셋 중 먼저 3개만 작성 후 UI 연결
3. `components/Form/CurriculumPresetPicker.tsx` — 학년/교과 필터 드롭다운 + 카드 그리드
4. `GeneratorForm.tsx`에 3번째 탭 "교과서" 추가

→ 여기까지 하루 분량. 이 커밋 기준으로 UX를 먼저 검증 후 워터마크·보증서 이어서.

---

*이 계획은 `issamGPT_바이브코딩_기획_종합.md` §6.1을 기반으로, v1 현존 코드 기준 실행 가능성 검증 후 재구성한 작업 계획서입니다.*
