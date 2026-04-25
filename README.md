# AI Art Class Workspace v3

초등 미술 수업을 위한 LMS형 AI 도안 워크스페이스.
교사가 도안을 만들어 학급에 게시하고, 학생이 QR로 입장해 도안을 받아 색칠한 뒤 작품을 제출하면, 교사 승인 후 학급 전시장에 누적되는 한 학기 단위 LMS.

- **AI**: Gemini Nano Banana (BYOK — 교사 본인의 API 키가 브라우저에만 저장됨)
- **호스팅**: GitHub Pages (완전 정적)
- **선택 백엔드**: Supabase (학급 LMS 모드를 켤 때만 로드)
- **상태**: v3.0 — 1교사 1학급 영구 보관 LMS

---

## 핵심 기능

- **BYOK Gemini API** — 브라우저 → Gemini 직접 호출. 키는 `localStorage`에만 저장되며 어떤 서버에도 전송되지 않습니다.
- **3가지 도안 모드** — 자유 주제 / 만다라 / 교과서 단원 프리셋 10종.
- **N×M 그리드 분할 인쇄용 PDF** — A5~A1, B5~B1 종이 크기 + 가로/세로 방향 자동 비율 계산.
- **SVG 벡터화 + ZIP 일괄 다운로드** — 다중 생성 결과를 한 번에 받기.
- **선 굵기 +20% 수동 보정** — 인쇄 시 가독성을 위한 후처리. 적용 여부는 결과별로 추적.
- **학급 모드 (LMS)**
  - 1교사 1학급, 6자리 학급 코드 + QR은 학급 생성 시 1회 발급되고 영구 유지
  - 학생은 별도 계정 없이 QR/코드 + 닉네임으로 즉시 입장 (개인정보 미수집)
  - 교사가 도안을 학급에 과제로 게시 → 학생이 PNG 다운로드 → 색칠본 사진 업로드 → 교사 승인
  - 학급 전시장 그리드 + TV 모드 풀스크린 슬라이드쇼 + 학급 카탈로그 PDF
  - 학습 결과는 영구 보관 (TTL 없음)

---

## 빠른 시작

```bash
npm install
npm run dev          # http://localhost:5173 의 Vite dev server
npm run build        # tsc -b && vite build → dist/
npm run lint         # ESLint
npm run preview      # 빌드 결과 로컬 프리뷰
```

1. https://aistudio.google.com/apikey 에서 Gemini API 키 발급
2. 앱 첫 화면에 키 붙여넣기 → "시작하기"
3. 도안 생성 → 출력 또는 학급에 게시

학급 모드를 사용하지 않는 1인 사용자는 여기서 끝납니다. Supabase 설정 없이 도안 생성, SVG 벡터화, PDF 분할 출력 모두 정상 동작합니다.

### 학급 모드를 쓰려면 (선택)

Supabase 무료 프로젝트 1개와 5분 정도의 셋업이 필요합니다. 자세한 절차는 [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) 참고.

대략 흐름:

1. Supabase 프로젝트 생성 → Project URL, anon key를 `.env.local`에 작성
2. `supabase/migrations/0001 ~ 0004` 를 SQL Editor에서 순서대로 실행 (`0005`는 주석 메모)
3. Storage에 `classroom-assets`, `classroom-submissions` 두 개의 **public** 버킷 생성
4. Authentication에서 교사 계정 1개 생성

---

## 기술 스택

- **프론트엔드**: React 19 + Vite + TypeScript
- **AI**: `@google/genai` (Gemini Nano Banana, BYOK)
- **백엔드 (선택)**: Supabase (Auth · Postgres + RLS · Realtime · Storage)
- **PDF**: `jspdf` (분할 인쇄 + 학급 카탈로그)
- **벡터화**: `imagetracerjs`
- **ZIP**: `jszip`
- **QR**: `qrcode`

---

## 프로젝트 구조

```
src/
├─ App.tsx                            # 해시 라우터 (#/class/:code) + 화면 전환
├─ components/
│  ├─ Classroom/                      # 학급 LMS — 진입 시 lazy-load
│  │   ├─ TeacherAuthGate.tsx         # 교사 로그인 (Supabase Auth)
│  │   ├─ ClassroomPanel.tsx          # "내 학급" — 학급 CRUD + QR/코드 + 과제 리스트
│  │   ├─ PublishAssignmentDialog.tsx # 결과 → 과제로 게시
│  │   ├─ StudentClassView.tsx        # #/class/:code 학생 진입
│  │   ├─ StudentSubmitPanel.tsx      # 학생 작품 업로드
│  │   ├─ TeacherReviewPanel.tsx      # 교사 검수 (승인 토글)
│  │   └─ ClassGallery.tsx            # 전시장 + TV 모드 + 카탈로그 PDF
│  ├─ Form/                           # 도안 입력 (자유/만다라/교과서)
│  ├─ Canvas/                         # 결과 프리뷰
│  ├─ Export/                         # PNG/SVG/PDF 다운로드
│  └─ Gallery/                        # 다중 생성 갤러리
├─ data/curriculumPresets.ts          # 교과서 단원 프리셋 10종
├─ services/                          # Gemini 호출 + 프롬프트 빌더
├─ hooks/                             # useClassroom, useAssignments, useTeacherReview …
├─ utils/                             # pdfExporter, vectorizer, classCatalogPdf …
├─ lib/supabaseClient.ts              # dynamic import (학급 모드에서만 로드)
└─ types/

supabase/
└─ migrations/                        # 0001~0005 신규 LMS 스키마

docs/
└─ QA_CHECKLIST.md                    # 수동 E2E 시나리오
```

---

## 배포

GitHub Pages 가정. `vite.config.ts` 의 `base: '/art-class-workspace/'` 가 저장소명과 일치해야 합니다. 다른 호스팅(Vercel · Netlify · S3)에 올리려면 base를 `'/'` 로 바꾸고 빌드하면 됩니다.

`.env.local` 의 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 값은 빌드 타임에 번들에 포함됩니다. anon key는 RLS가 보호하므로 공개돼도 안전합니다(반대로 `service_role` 키는 절대 넣지 마세요).

---

## 라이선스 / 기여

생성된 도안의 1차적 권리는 도안을 만든 교사(BYOK 사용자)에게 있습니다. 학생 작품은 교사 승인 전 비공개 상태이며, 학급 전시장(승인된 작품)도 학급 코드를 가진 사람만 볼 수 있는 비공개 LMS 영역입니다.

기여는 환영하지만 v3는 단일 교사 워크플로우 중심으로 설계됐습니다. 다교사·다학급 등 구조 변경은 v3.1 후속 과제로 두고 있습니다.

---

## 참고 문서

- [`art-class.md`](./art-class.md) — v3 LMS PRD
- [`art-class-v3-lms-plan.md`](./art-class-v3-lms-plan.md) — v3 리팩터 실행 계획
- [`art-class-v2-plan.md`](./art-class-v2-plan.md) — v2 시점 계획 (역사 기록용, v3로 대체됨)
- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) — 학급 모드 활성화 절차
- [`docs/QA_CHECKLIST.md`](./docs/QA_CHECKLIST.md) — 수동 E2E 체크리스트
