---
name: zivo-admin-workspace
description: ZIVO Admin Workspace Guide - React + Vite + StyleX + TanStack Query 기반 관리자 프론트엔드. 공유 컴포넌트, 훅, 타입, API 레이어, 프로젝트 구조를 일관성 있게 유지하기 위한 가이드. 컴포넌트 추가, 훅 생성, 타입 정의, shared 디렉토리 작업, ZIVO_ADMIN 구조 파악이 필요할 때 사용한다.
triggers:
  - 컴포넌트 추가
  - 훅 생성
  - 타입 정의
  - shared
  - workspace
  - ZIVO_ADMIN
  - ZIVO_ADMIN 구조
  - StyleX
  - TanStack Query
  - React 컴포넌트
  - 공유 컴포넌트
  - 커스텀 훅
  - API 레이어
  - admin 프론트
metadata:
  author: ZIVO Team
  version: "1.0.0"
  tags:
    - react
    - typescript
    - stylex
    - tanstack-query
    - frontend
    - admin
---

# ZIVO Admin Workspace Guide

React + Vite + StyleX + TanStack Query 기반 관리자 프론트엔드. `ZIVO_ADMIN/src/` 아래 `shared/`, `pages/`, `app/` 레이어로 구성된다.

## References 라우팅

작업에 맞는 references 파일을 읽고 따른다.

| 작업 | 읽을 파일 |
|------|----------|
| 공유 UI 컴포넌트 생성/수정 | `references/shared-ui-component.md` |
| 커스텀 훅 생성/수정 | `references/shared-hook.md` |
| 타입·DTO 정의 | `references/shared-types.md` |
| 파일 위치 결정, 디렉토리 탐색 | `references/project-structure.md` |
| API 서비스·쿼리 훅 생성 | `references/project-structure.md` + `references/shared-types.md` |

---

## 어디에 파일을 만들어야 하나? — 빠른 결정 플로우

```
새 파일을 만들어야 한다
│
├─ 여러 페이지에서 재사용되는 UI?
│   └─ YES → src/shared/ui/{ComponentName}/  (references/shared-ui-component.md)
│
├─ 여러 곳에서 재사용되는 로직?
│   └─ YES → src/shared/hooks/use{Name}.ts  (references/shared-hook.md)
│
├─ Request/Response DTO 또는 공유 타입?
│   └─ YES → src/shared/types/{domain}.ts  (references/shared-types.md)
│
├─ API 호출 함수?
│   └─ YES → src/shared/api/services/{domain}Service.ts
│
├─ TanStack Query 훅?
│   └─ YES → src/shared/api/queries/{domain}Queries.ts
│
└─ 특정 페이지에서만 쓰이는 것?
    ├─ 일반 관리 → src/pages/general/{domain}/
    ├─ 호텔 관리 → src/pages/hotel/{domain}/
    └─ eSIM 관리 → src/pages/esim/{domain}/
```

---

## 핵심 규칙 요약

### StyleX

- 스타일 파일: `{ComponentName}.stylex.ts` (별도 분리 권장, 인라인도 허용)
- breakpoints는 **파일 내 로컬 상수** 필수 — 외부 import 시 `Invalid empty selector` 오류 발생
- 디자인 토큰: `src/app/styles/tokens.stylex.ts` (`color`, `space`, `fontSize`, `font`, `radius`)
- 토큰명 alias 금지 — 정확한 토큰명 그대로 사용

### TanStack Query

- Query 훅: `src/shared/api/queries/{domain}Queries.ts`
- queryKey 배열 첫 번째 원소는 도메인 문자열 (예: `['hotel', 'list', params]`)
- Mutation은 `useMutation` + `onSuccess` 콜백에서 `queryClient.invalidateQueries`

### TypeScript

- `any` 사용 금지 — 명시적 타입 정의
- Enum 대신 string union type 사용 (`type Status = 'ACTIVE' | 'INACTIVE'`)
- 컴포넌트 Props: `interface {ComponentName}Props` 패턴
