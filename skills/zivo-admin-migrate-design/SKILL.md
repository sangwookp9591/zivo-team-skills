---
name: zivo-admin-migrate-design
description: ZIVO_DESIGN/admin/ HTML을 ZIVO_ADMIN React+StyleX로 마이그레이션. 90+ 공통 컴포넌트 활용, Material Icons 매핑, StyleX 토큰 변환. 디자인 100% 유지하면서 레이아웃/공통 컴포넌트는 ZIVO_ADMIN 것 재활용, 공통 컴포넌트 없으면 새 컴포넌트 생성 제안.
triggers:
  - 마이그레이션
  - migrate
  - HTML 변환
  - 디자인 변환
  - ZIVO_DESIGN
  - admin HTML
  - 디자인 마이그레이션
metadata:
  author: ZIVO Team
  version: "1.0.0"
  tags:
    - react
    - stylex
    - migration
    - admin
  related-skills:
    - zivo-admin-new-page
    - zivo-admin-workspace
    - zivo-stylex-guide
---

# ZIVO_DESIGN → ZIVO_ADMIN 마이그레이션 가이드

`ZIVO_DESIGN/admin/` HTML/CSS 디자인을 `ZIVO_ADMIN` React + StyleX 코드로 변환한다.
디자인 픽셀은 100% 유지하되, 레이아웃과 공통 컴포넌트는 ZIVO_ADMIN 것을 재활용한다.

## References 라우팅 테이블

| 작업 | 읽을 파일 |
|------|----------|
| HTML class를 공통 컴포넌트에 매핑 | `references/html-component-mapping.md` |
| CSS 변수를 StyleX 토큰으로 변환 | `references/design-token-mapping.md` |
| 페이지에 적합한 레이아웃 결정 | `references/layout-selection-guide.md` |
| React+StyleX 변환 코드 템플릿 | `references/conversion-templates.md` |
| 공통 컴포넌트 갭 분석 및 제안 | `references/new-component-proposal.md` |
| 변환 후 검증 항목 | `references/verification-checklist.md` |

---

## CRITICAL RULES

1. **StyleX 토큰명**: `color`, `space`, `fontSize`, `font`, `radius` 만 사용. `colors`, `spacing` 등 alias import 절대 금지
2. **Breakpoint 상수**: 반응형이 필요한 경우 파일 내 로컬 상수로 정의 (`const BREAKPOINTS = { md: '@media (min-width: 768px)' }`)
3. **Material Icons**: `@mui/icons-material` Rounded variant ONLY (`DashboardRounded`, `PersonRounded` 등)
4. **공통 컴포넌트 우선**: 로컬 구현 전 반드시 `references/html-component-mapping.md` 매핑표 확인
5. **Footer 중복 방지**: `DraggableLayout` / `SyncNavLayout` 사용 시 `showCompanyFooter` prop으로 중복 방지

---

## 5단계 인터랙티브 워크플로우

### Step 1: HTML 파일 분석

```
1. HTML 파일 Read
2. 다음 항목 추출:
   - 전체 DOM 구조 (레이아웃 패턴)
   - CSS class 목록
   - 텍스트/레이블
   - <span class="material-symbols-rounded"> 아이콘
3. 레이아웃 결정 (references/layout-selection-guide.md 참조)
4. AskUserQuestion: "분석 결과를 확인해주세요. [구조 요약] 이 레이아웃으로 진행할까요?"
```

### Step 2: 컴포넌트 매핑

```
1. references/html-component-mapping.md 로드
2. 추출한 CSS class 목록을 매핑표와 대조
3. 매핑 결과 표 형식으로 표시:
   | HTML class | ZIVO_ADMIN 컴포넌트 | 비고 |
4. AskUserQuestion: "매핑 결과를 확인해주세요. 조정이 필요한 항목이 있나요?"
```

### Step 3: 공통 컴포넌트 갭 분석

```
1. 매핑 불가 요소 분류:
   - 기존 공통 컴포넌트로 커버 가능 (props 조합)
   - 새 컴포넌트 필요
   - 페이지 로컬 스타일로 처리
2. 새 컴포넌트 필요 시 references/new-component-proposal.md 형식으로 제안
3. AskUserQuestion: "갭 분석 결과입니다. 새 컴포넌트 생성을 승인할까요?"
```

### Step 4: 변환 실행

변환 순서:
1. `styles.stylex.ts` — 페이지 로컬 스타일 정의
2. `index.tsx` — 메인 컴포넌트 (레이아웃 + 구조)
3. `components/` — 페이지 전용 서브컴포넌트 (필요한 경우)
4. 라우트 등록 (`router.tsx` 또는 `routes/index.ts`)

규칙:
- CSS 변수 → StyleX 토큰 변환 (`references/design-token-mapping.md` 사용)
- 인라인 스타일 → `stylex.create()` 블록으로 추출
- `className` → `{...stylex.props(styles.xxx)}`

### Step 5: 검증

```
1. references/verification-checklist.md 기준으로 점검
2. tsc --noEmit (타입 오류 없음)
3. ESLint (lint 경고 없음)
4. AskUserQuestion: "변환이 완료되었습니다. 시각적으로 확인해주세요. [스크린샷 첨부 요청]"
```

---

## Material Icons 변환 규칙

HTML에서 `<span class="material-symbols-rounded">` → React에서 `@mui/icons-material` Rounded import.

```html
<!-- HTML -->
<span class="material-symbols-rounded">dashboard</span>
```

```tsx
// React
import DashboardRounded from '@mui/icons-material/DashboardRounded';
<DashboardRounded />
```

### 주요 아이콘 매핑

| HTML 아이콘명 | Import 경로 | 컴포넌트명 |
|--------------|------------|----------|
| `dashboard` | `@mui/icons-material/DashboardRounded` | `<DashboardRounded />` |
| `person` | `@mui/icons-material/PersonRounded` | `<PersonRounded />` |
| `search` | `@mui/icons-material/SearchRounded` | `<SearchRounded />` |
| `add` | `@mui/icons-material/AddRounded` | `<AddRounded />` |
| `edit` | `@mui/icons-material/EditRounded` | `<EditRounded />` |
| `delete` | `@mui/icons-material/DeleteRounded` | `<DeleteRounded />` |
| `close` | `@mui/icons-material/CloseRounded` | `<CloseRounded />` |
| `check` | `@mui/icons-material/CheckRounded` | `<CheckRounded />` |
| `arrow_back` | `@mui/icons-material/ArrowBackRounded` | `<ArrowBackRounded />` |
| `chevron_right` | `@mui/icons-material/ChevronRightRounded` | `<ChevronRightRounded />` |
| `filter_list` | `@mui/icons-material/FilterListRounded` | `<FilterListRounded />` |
| `more_vert` | `@mui/icons-material/MoreVertRounded` | `<MoreVertRounded />` |
| `download` | `@mui/icons-material/DownloadRounded` | `<DownloadRounded />` |
| `upload` | `@mui/icons-material/UploadRounded` | `<UploadRounded />` |
| `visibility` | `@mui/icons-material/VisibilityRounded` | `<VisibilityRounded />` |

변환 규칙: `snake_case` 아이콘명을 `PascalCase`로 변환 후 `Rounded` suffix 추가.

---

## 관련 스킬 참조

- `zivo-admin-new-page` — 페이지 scaffold, API/Query hooks, 라우트 등록
- `zivo-admin-workspace` — shared UI 컴포넌트 생성/수정 규칙
- `zivo-stylex-guide` — StyleX 토큰, 반응형, gotchas

---

## 다중 파일 마이그레이션 시 TASK.md 관리

2개 이상 HTML 파일 변환 시 `.claude/tasks/migrate-{feature}.md`에 진행 추적 파일 생성:

```markdown
# 마이그레이션 진행 상황: {feature}

| HTML 파일 | 대상 경로 | 상태 |
|----------|---------|------|
| page-a.html | pages/a/index.tsx | ✅ 완료 |
| page-b.html | pages/b/index.tsx | 🔄 진행중 |
| page-c.html | pages/c/index.tsx | ⬜ 대기 |
```
