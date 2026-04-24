# AI Art Class Workspace v2.0

교사가 원하는 주제·난이도·분할 크기로 즉시 수업용 흑백 선화 도안을 만들고, 교과서 단원 프리셋·학급 투표·실시간 협업·저작권 보증서까지 한 화면에서 처리하는 React SPA입니다.

- **AI**: Gemini Nano Banana (BYOK — 각 교사의 API 키가 브라우저에만 저장됨)
- **호스팅**: GitHub Pages (완전 정적)
- **선택적 백엔드**: Supabase (학급 모드에서만 로드)
- **상태**: Phase 3 완료 — v2.0 정식 출시 준비 (Task 1~9)

---

## 기능 한눈에 보기

### v1에서 유지되는 핵심
- BYOK(Bring Your Own Key) + API 키 마스킹 · 로컬 저장
- 자유 주제 / 만다라 모드, 난이도 3단계
- N×M 그리드 자동 비율 계산
- Quick Edit (선 굵게, 디테일 단순화 등) + 3단 히스토리 Undo
- SVG 벡터화 · jsPDF 무여백 분할 출력
- 다중 생성 + 갤러리 + ZIP 일괄 다운로드
- 선 굵기 +20% 자동 보정 (색약·인쇄 대비)

### v2.0에서 새로 추가된 것
- **교과서 단원 프리셋 10종** (`src/data/curriculumPresets.ts`) — 학년·교과·단원 기반 1-클릭 세팅
- **워터마크 + 색약 프리뷰** — Deuteranopia·Protanopia·Tritanopia 3종 Canvas 변환
- **저작권 보증서 PDF** — 생성일시·프롬프트·AI 모델·SHA-256 해시·진위 확인 QR을 마지막 페이지에 자동 삽입
- **학급 세션(옵션)** — Supabase 연결 시 활성화
  - 교사: 6자리 코드 + QR → 실시간 투표 집계 대시보드 → 다수결 프롬프트 → Gemini 호출
  - 학생: `/session/ABC123` 모바일 웹뷰 — 키워드·선 굵기·디테일 투표
  - 학생 20명 동시 처리 · 24시간 자동 세션 만료
- **학급 전시장** — 학생이 색칠본 업로드 → 교사 검수(승인제) → 전시장 그리드 뷰 → TV 모드 전체화면 슬라이드쇼 → 학급 카탈로그 PDF 출력

---

## 빠른 시작

### 1. 의존성 설치 & 실행

```bash
npm install
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # tsc -b && vite build → dist/
npm run lint      # ESLint (eslint.config.js 기반)
npm run preview   # 빌드 결과 로컬 프리뷰
```

### 2. Gemini API 키 발급 (모든 사용자 필수)

1. https://aistudio.google.com/apikey 접속
2. "Create API key" 클릭 → 복사
3. 앱 첫 화면의 입력란에 붙여넣기 → "시작하기"

키는 브라우저 `localStorage`에만 저장됩니다. 서버로 전송되지 않습니다.

### 3. 학급 모드를 쓰려면 (선택)

`SUPABASE_SETUP.md`를 따라 Supabase 프로젝트를 연결하세요. 연결하지 않아도 나머지 기능(도안 생성·편집·PDF·보증서)은 전부 동작합니다.

필요한 것:

```bash
cp .env.example .env        # (없으면 수동 작성)
# .env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

`supabase/migrations/0001_classroom_schema.sql` ~ `0007_class_gallery_read.sql`을 SQL Editor에서 순서대로 실행하고, Storage에 `session-submissions` 퍼블릭 버킷을 만드세요. 상세 단계는 `SUPABASE_SETUP.md` 참고.

---

## 프로젝트 구조

```
src/
├─ App.tsx                       # 라우팅(정규식 기반) + 화면 전환
├─ components/
│  ├─ Classroom/                 # 학급 모드 — lazy-load
│  │   ├─ TeacherAuthGate.tsx    # 교사 로그인 (Supabase Auth)
│  │   ├─ SessionHost.tsx        # 세션 코드·QR·실시간 대시보드
│  │   ├─ StudentVoteView.tsx    # /session/:code 학생 웹뷰
│  │   ├─ StudentSubmitPanel.tsx # 학생 색칠본 업로드
│  │   ├─ TeacherReviewPanel.tsx # 교사 검수(승인제)
│  │   └─ ClassGallery.tsx       # 전시장 + TV 모드 + 카탈로그 PDF
│  ├─ Form/CurriculumPresetPicker.tsx  # 교과서 단원 3번째 탭
│  ├─ Export/ExportPanel.tsx     # PNG/SVG/PDF + 워터마크·보증서 토글
│  └─ Canvas/CanvasPreview.tsx   # 색약 시뮬 프리뷰
├─ data/curriculumPresets.ts     # 10종 프리셋 레코드
├─ services/
│  ├─ geminiService.ts           # Gemini Nano Banana 호출
│  ├─ promptBuilder.ts           # 프리셋 → 프롬프트
│  └─ voteToPrompt.ts            # 투표 집계 → 프롬프트
├─ utils/
│  ├─ pdfExporter.ts             # jsPDF 분할 + 워터마크 + 보증서
│  ├─ copyrightCertificate.ts    # 메타데이터·SHA-256·QR
│  ├─ classCatalogPdf.ts         # 학급 카탈로그 PDF
│  └─ vectorizer.ts              # imagetracerjs 래퍼
├─ lib/supabaseClient.ts         # dynamic import (번들 분리)
└─ types/

supabase/
└─ migrations/                   # 0001~0007 스키마 + RLS + Storage

docs/
└─ QA_CHECKLIST.md               # 수동 E2E 체크리스트 (Phase 3 출시 기준)
```

---

## 번들 크기 (v2.0 기준)

Task 9에서 학급 모듈을 `React.lazy()`로 분리해 혼자 사용하는 교사의 초기 로드를 줄였습니다.

| 청크 | 크기 | Gzip | 비고 |
|---|---:|---:|---|
| `index-*.js` (메인) | ~1,206 kB | ~348 kB | @google/genai SDK 포함 |
| `SessionHost-*.js` | 58 kB | 20 kB | 교사가 학급 모드 진입 시 로드 |
| `StudentVoteView-*.js` | 14 kB | 4 kB | `/session/:code` 경로에서만 로드 |
| `TeacherAuthGate-*.js` | 4 kB | 1 kB | 교사 로그인 화면 |
| `StudentSubmitPanel-*.js` | 5 kB | 2 kB | 학생 업로드 패널 |
| `html2canvas.esm-*.js` | 201 kB | 47 kB | jsPDF가 내부적으로 필요 (dynamic) |
| `index.es-*.js` | 159 kB | 53 kB | jsPDF core (dynamic) |
| `imagetracer_v1.2.6-*.js` | 20 kB | 6 kB | SVG 변환 |

학급 세션 진입·학생 경로 방문·PDF 내보내기 시점에 필요한 번들만 네트워크에서 가져옵니다.

---

## 접근성 (WCAG 2.1 AA 목표)

- 키보드 내비게이션: 모든 인터랙티브 요소는 `<button>`·`<input>`·`role="checkbox"/"radio"` 등 네이티브 시맨틱 사용
- 포커스 링: `:focus-visible` 스타일 유지 (`index.css`의 `:not(:focus-visible)` 예외 처리)
- 대체 텍스트: 모든 `<img>`에 의미 있는 `alt` 또는 `aria-hidden="true"` 데코레이티브 처리
- 라이브 리전: Toast는 `role="status"` / 오류는 `role="alert"`
- 다이얼로그: TV 슬라이드쇼는 `role="dialog"` + 포커스 복귀 (WCAG 다이얼로그 패턴)

---

## 호환성 · 성능 목표

- **브라우저**: 최신 Chrome / Edge / Safari (PC)
  - 학생 경로(`/session/:code`)는 모바일 Safari/Chrome도 지원
- **Lighthouse 목표**: 성능 ≥ 90, 접근성 ≥ 95 (데스크톱, BYOK 단독 진입 페이지 기준)
- **메모리**: 히스토리 최대 3개 유지, 20MB 이하 점유

---

## 라이선스 & 저작권

생성된 도안은 기본 **CC BY-NC 4.0**로 보증서에 기록됩니다. 학생 색칠본은 **교사 승인 전 비공개** · **24시간 자동 삭제**입니다. 상업적 재배포는 금지되며, 저작권 문의는 각 수업 교사에게 문의하세요.

---

## 참고 문서

- `art-class.md` — v2 PRD 요약
- `art-class-v2-plan.md` — 상세 개선 계획 (Phase 1~3, 스키마, 스케줄)
- `SUPABASE_SETUP.md` — 학급 모드 활성화 단계별 가이드
- `docs/QA_CHECKLIST.md` — 수동 E2E 시나리오
