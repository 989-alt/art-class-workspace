📄 PRD: AI Art Class Workspace v2.0

> v1 → v2 이력: v1.0(서버리스 BYOK 단독) → v2.0(교과서 프리셋 + 학급 모드 + 저작권 보증서 + 학급 전시장)
> 상세 실행 계획: `art-class-v2-plan.md`
> 마지막 갱신: 2026-04-24 (Phase 3 완료 시점)

---

## 1. 제품 개요

**비전**
교사가 교과서 단원을 고르면 1-클릭으로 수업용 흑백 선화 도안이 나오고, 필요하다면 그 자리에서 학생 20명이 함께 투표·색칠·전시까지 할 수 있는 교실 내 미술 교보재 워크스페이스.

**타겟 유저**
- 주 사용자: 초등 미술·담임 교사 (PC 교실 컴퓨터)
- 보조 사용자: 학생 (QR을 통한 모바일 참여만, PC 접속은 가정하지 않음)
- 학부모: 가정에서 혼자 사용 시 v1 모드(BYOK 단독)로 동작

**핵심 가치**
1. 교과서 단원과 1:1로 매칭되는 프리셋 — 검색으로는 못 찾는 수업 맞춤 도안
2. 교탁 1대 + 학생 휴대폰 QR만으로 참여형 수업이 성립
3. 저작권 보증서·해시·라이선스 자동 기록 — 교사의 공적 활용 안전성 확보

---

## 2. 시스템 아키텍처

**프론트엔드**: React 19 + Vite + TypeScript, GitHub Pages에 정적 배포.

**AI 모델**: Gemini Nano Banana (텍스트·이미지 편집·고해상도 렌더링). 호출은 여전히 브라우저→Gemini 직접, 서버 경유 없음.

**저장**
- `localStorage`: API 키, 교사 이름
- `IndexedDB`: (향후) 프리셋 캐시
- **Supabase (선택)**: 학급 세션·투표·학생 제출 — 학급 모드에서만 `src/lib/supabaseClient.ts`가 dynamic import로 로드
- **Supabase Storage**: 학생 색칠본 (24h TTL)

**인증**
- 교사: Supabase Auth (이메일·비밀번호)
- 학생: 익명 토큰 (클라이언트 생성 UUID, `localStorage`)

**보안**
- BYOK 유지: API 키는 브라우저에만 저장, Supabase에도 업로드 안 함
- RLS: 세션은 코드로만 읽기 가능, 투표·제출은 본인 토큰 기준
- 학생 제출물: 기본 비공개(`approved=false`), 교사 승인 후 공개

---

## 3. 기능 명세

### 3.1. 공통 기본 (v1 유지)

- **BYOK + 마스킹**: 설정 시 `sk-****` 형태로 노출, localStorage 저장, 로그아웃 버튼 제공
- **모드**: 자유 주제 / 만다라(프리셋 전용) / **교과서 단원(v2 신규)**
- **난이도**: 하·중·상 → 프롬프트 복잡도 치환
- **그리드 N×M**: 최대 6×6, 종이 크기(A5~A1·B5~B1) × 방향 2종으로 비율 계산
- **스켈레톤 UI**: 10~15초 생성 지연을 메시지 전환(스케치→펜→마무리)으로 보완
- **안전 필터**: 위반 시 크레딧 미차감 + Toast 경고
- **Quick Edit**: 선 굵게 / 디테일 단순화 / 배경 패턴 칩
- **히스토리 Undo**: 최대 3단계, 초과 시 오래된 데이터 파기
- **선 굵기 +20% 자동 보정**: Canvas 기반 후처리, 적용 여부는 갤러리 아이템별로 추적

### 3.2. 교과서 단원 프리셋 (Phase 1 — 완료)

- `src/data/curriculumPresets.ts`에 10종 레코드
- 필드: `grade` · `semester` · `subject` · `unitTitle` · `unitCode` · `suggestedTopics` · `basePrompt` · `styleDirective` · 기본 그리드·용지·방향 · `teachingNote` · `learningObjectives`
- `CurriculumPresetPicker.tsx`: 학년·교과 필터 → 카드 선택 → 세부 주제 칩 선택
- `services/promptBuilder.ts`의 `buildPromptFromPreset()`으로 프롬프트 합성

### 3.3. 인쇄 엔진 (Phase 1 — 완료)

- **워터마크**: 하단 중앙 `SEONBI's Art Class · Gemini · YYYY-MM-DD HH:mm` (Gray #999 6pt)
- **색약 시뮬 프리뷰**: `CanvasPreview.tsx` 상단 탭 — 정상 / D / P / T 4종
- **저작권 보증서**: `utils/copyrightCertificate.ts`
  - SHA-256(base64 이미지 + 프롬프트 + 생성일시)
  - PDF 마지막 페이지에 단원·프롬프트·AI 모델·교사명·라이선스·해시·진위 확인 QR
  - ExportPanel에서 On/Off 토글 가능

### 3.4. 학급 모드 (Phase 2 — 완료)

- **세션 생성**: 교사가 프리셋 + 투표 후보 편집 → 6자리 코드 + QR 1초 이내 표시
- **학생 경로**: `/session/ABC123` — App.tsx의 regex가 감지해 `StudentVoteView` 렌더
- **투표 항목**: 키워드(프리셋 suggestedTopics에서 시드) / 선 굵기 / 디테일 — 각각 단일 선택
- **실시간 대시보드**: `useClassroomSession` 훅이 Supabase Realtime 구독, `VoteDashboard`에 집계
- **도안 생성**: `voteToPrompt.ts`가 다수결 → `composeVotedPrompt()` → Gemini 호출 → 완성본을 세션에 저장 + 학생에게 broadcast
- **롤백**: 생성 실패 시 `reopenSession()`으로 투표 상태 복원
- **오프라인 Fallback**: Supabase 미설정/연결 실패 시 "학급 모드 비활성화" 안내 + v1 단독 동작

### 3.5. 학급 전시장 (Phase 3 — 완료)

- **학생 업로드**: `StudentSubmitPanel.tsx` — 사진 파일 선택 → Storage 업로드, 기본 비공개
- **교사 검수**: `TeacherReviewPanel.tsx` — 썸네일 그리드에서 승인/해제 토글
- **전시 그리드**: `ClassGallery.tsx` — 승인된 작품만 표시, 닉네임 캡션
- **TV 모드**: 전체화면 슬라이드쇼 (6초 전환), 키보드 ←→ Space Esc, 포커스 복귀 (WCAG 다이얼로그 패턴)
- **카탈로그 PDF**: `classCatalogPdf.ts` — 표지(단원·세션 코드·교사·날짜) + 4컷 그리드 페이지

### 3.6. 성능 · 접근성 (Phase 3 Task 9 — 완료)

- **Lazy-load**: `TeacherAuthGate`·`SessionHost`·`StudentVoteView`·`StudentSubmitPanel`을 `React.lazy()`로 분리
- **접근성 AA**:
  - 모든 클릭 요소가 네이티브 `<button>` 또는 적절한 `role`
  - 데코레이티브 이모지는 `aria-hidden="true"`
  - Toast는 `role="status"` · 오류는 `role="alert"` + `aria-live`
  - 슬라이드쇼는 `role="dialog" aria-modal="true"` + 포커스 복귀
  - 포커스 가시성 유지 (`index.css`의 `:not(:focus-visible)` 예외)

---

## 4. 비기능 요구사항

| 항목 | 목표 | 달성 수단 |
|---|---|---|
| 생성 체감 시간 | < 15초 | 스켈레톤 + 메시지 전환 |
| 히스토리 메모리 | < 20MB | 3단 최대, base64만 보관 |
| 학생 20명 동시 투표 | 집계 지연 < 2초 | Supabase Realtime |
| 학급 갤러리 로딩 | < 1초 | 썸네일 lazy-load, Supabase URL 직결 |
| Lighthouse 성능 | ≥ 90 (BYOK 단독 페이지) | 학급 모듈 lazy-load |
| Lighthouse 접근성 | ≥ 95 | WCAG AA 패스 |
| 호환성 | 최신 Chrome/Edge/Safari (PC), 학생 경로만 모바일 |

---

## 5. 출시 게이트 체크 (v2.0 기준)

### Phase 1 — 제안서 제출 (완료)
- [x] 프리셋 10종 → 생성 → 보증서 포함 PDF
- [x] 색약 프리뷰 3종
- [x] 워터마크 On/Off
- [x] v1 회귀 없음

### Phase 2 — MVP (완료)
- [x] 세션 생성 → QR ≤ 1초
- [x] 학생 20명 동시, 대시보드 지연 ≤ 2초
- [x] Supabase 차단 시 안내 + 로컬 모드 동작

### Phase 3 — 정식 (완료)
- [x] 학생 20명 제출 → 갤러리 로딩 ≤ 1초 (Storage 직결 URL)
- [x] 24시간 자동 삭제 (`cleanup_expired_sessions` SQL 함수 + `expires_at` 기본값)
- [x] 접근성 AA 패스 — 수동 audit + 포커스·대체 텍스트 보강
- [x] README·PRD 업데이트
- [x] QA 체크리스트 문서화 (`docs/QA_CHECKLIST.md`)

---

## 6. 알려진 제약

- **메인 번들 1.2MB**: @google/genai SDK가 대부분을 차지. 추가 축소는 SDK 트리셰이킹 개선(업스트림) 또는 이미지 생성 전용 경로 분리가 필요 — v2.1 과제.
- **Supabase 무료 티어**: 교실 1~2개 동시 기준 설계. 학교 단위 배포 시 유료 플랜 필요.
- **학교 Wi-Fi 방화벽**: Supabase 차단 시 학급 모드 사용 불가. v1 단독 모드로 Fallback 정책 유지.
- **초상권**: 학생 얼굴이 포함된 이미지 업로드는 기본 차단하지 않지만 교사 승인 단계에서 필터링 책임.

---

## 7. 향후 과제 (v2.1 이후)

- Service Worker + 단원 프리셋 오프라인 캐시
- 번들 분리 심화: Gemini SDK를 생성 경로에서만 dynamic import
- 교사 대시보드: 반별 사용 통계, 생성된 도안 아카이브
- PWA 설치 유도 (학생 경로용)
- 접근성 강화: 스크린리더 전용 상태 업데이트, 고대비 모드
