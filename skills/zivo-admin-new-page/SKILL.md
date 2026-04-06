---
name: zivo-admin-new-page
description: ZIVO Admin 신규 페이지 추가 가이드 - React + Vite + StyleX + TanStack Query + react-router-dom. 리스트/상세 페이지 보일러플레이트, API 서비스 레이어, TanStack Query hooks, StyleX 스타일, 라우트 등록까지 커버. ZIVO_ADMIN 프로젝트에서 새 페이지를 추가할 때 동일한 패턴과 코드 퀄리티를 유지하도록 안내한다.
triggers:
  - 페이지 추가
  - 새 페이지
  - new page
  - 리스트 페이지
  - 상세 페이지
  - ZIVO_ADMIN
  - admin page
  - 관리자 페이지
  - PageContainer
  - useSearchParams
  - TableCard
metadata:
  author: ZIVO Team
  version: "1.1.0"
  tags:
    - react
    - vite
    - stylex
    - tanstack-query
    - react-router-dom
    - admin
---

# ZIVO Admin 신규 페이지 추가 가이드

React + Vite + StyleX + TanStack Query + react-router-dom 기반 어드민. 리스트 페이지 / 상세 페이지 / API 서비스 / Query hooks / 라우트 등록 순서로 작업한다.

## References 라우팅

작업에 맞는 references 파일을 읽고 따른다.

| 작업 | 읽을 파일 |
|------|----------|
| 레이아웃 패턴 선택 (리스트/Master-Detail/섹션 네비) | `references/layout-patterns.md` |
| 리스트 페이지 컴포넌트 생성 | `references/page-scaffold.tsx.md` |
| 상세 페이지 컴포넌트 생성 | `references/page-detail.tsx.md` |
| StyleX 스타일 파일 생성 | `references/styles-stylex.md` |
| API 서비스 함수 작성 | `references/api-service.md` |
| TanStack Query hooks 작성 | `references/api-queries.md` |
| 라우트 등록 | `references/route-registration.md` |

---

## 페이지 디렉토리 구조

```
src/pages/general/{domain}/{PageName}/
  ├── index.tsx          # 메인 페이지 컴포넌트 (named export)
  ├── styles.stylex.ts   # StyleX 스타일 (로컬 breakpoint 상수 필수)
  ├── components/        # 페이지 전용 컴포넌트 (선택)
  └── hooks/             # 페이지 전용 훅 (선택)
```

**도메인 예시**: `users`, `products`, `bookings`, `reviews`, `settlement`, `system`, `board`, `talk`, `taxi`

---

## 신규 페이지 추가 체크리스트

순서대로 작업한다.

### 1단계 — API 서비스 레이어

- [ ] `src/shared/api/services/{domain}Service.ts`에 CRUD 함수 추가
- [ ] `src/shared/types/index.ts` (또는 도메인 타입 파일)에 Request/Response 타입 추가

### 2단계 — TanStack Query hooks

- [ ] `src/shared/api/queries/{domain}Queries.ts`에 queryKey factory + queryOptions + useMutation 추가

### 3단계 — 페이지 컴포넌트

- [ ] `src/pages/general/{domain}/{PageName}/index.tsx` 생성
- [ ] `src/pages/general/{domain}/{PageName}/styles.stylex.ts` 생성
- [ ] 필요 시 `components/`, `hooks/` 서브디렉토리 생성

### 4단계 — 라우트 등록

- [ ] `src/app/routes/{domain}Routes.tsx` 또는 `generalRoutes.tsx`에 import + route 객체 추가
- [ ] Sidebar/Navigation에 메뉴 항목 추가 (필요 시)

---

## 핵심 규칙

### StyleX 지뢰

- 토큰명: `color`, `space`, `fontSize`, `font`, `radius` — alias(`colors`, `spacing` 등) **금지**
- Breakpoint 상수는 **반드시 파일 내 로컬 상수**로 정의 (외부 import → `Invalid empty selector` 빌드 에러)
- 빈 객체 `{}` 금지 → `null` 사용
- `stylex.props`: `...(cond ? [styles.x] : [])` 스프레드 패턴

### Button import

```typescript
import { Button } from '@shared/ui/Button/Button';
```

### 날짜 유틸

```typescript
import { format, parseISO } from '@shared/utils/dateUtils';
```

### API 응답 래퍼

백엔드 `@ApiResponseWrapper` → `{ success, data }` 래핑. 서비스 함수에서 `.data.data`로 언래핑.

```typescript
const response = await apiClient.get<ApiResponse<XxxListResponse>>('/api/xxx', { params });
return response.data.data;
```
