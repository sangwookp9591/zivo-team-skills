# 타입 정의 가이드

`src/shared/types/`에 위치한 공유 타입 작성 규칙.

---

## 디렉토리 구조

```
src/shared/types/
  ├── index.ts           # barrel — 모든 타입 re-export
  ├── pagination.ts      # 페이지네이션 공통 타입
  ├── user.ts            # 사용자 관련 타입
  ├── hotel.ts           # 호텔 관련 타입
  ├── esim.ts            # eSIM 관련 타입
  ├── chat.ts            # 채팅 관련 타입
  └── {domain}.ts        # 도메인별 타입 파일
```

타입 추가 후 `src/shared/types/index.ts`에 re-export를 추가한다.

---

## Request/Response DTO 네이밍

```ts
// Request DTO: {Domain}{Action}Request
export interface GeneralUserListRequest {
  page: number;
  size: number;
  keyword?: string;
  status?: GeneralUserStatus;
}

// Response DTO: {Domain}{Action}Response
export interface GeneralUserListResponse {
  content: GeneralUserItem[];
  totalElements: number;
  totalPages: number;
}

// 개별 아이템: {Domain}Item 또는 {Domain}Detail
export interface GeneralUserItem {
  id: number;
  name: string;
  email: string;
  status: GeneralUserStatus;
}
```

---

## Enum 대신 string union type

TypeScript enum 사용 금지. string union type으로 정의한다.

```ts
// 금지
enum GeneralUserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
}

// 사용
type GeneralUserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';
```

---

## 상수 라벨 Record 패턴

상태값을 화면에 표시할 때 사용하는 라벨 매핑.

```ts
// 라벨 텍스트
export const GENERAL_USER_STATUS_LABEL: Record<GeneralUserStatus, string> = {
  ACTIVE: '활성',
  PENDING: '대기',
  SUSPENDED: '정지',
  DELETED: '삭제',
};

// Badge variant 매핑
export const GENERAL_USER_STATUS_VARIANT: Record<GeneralUserStatus, 'success' | 'warning' | 'error' | 'gray'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'error',
  DELETED: 'gray',
};
```

컴포넌트에서 사용:
```tsx
<Badge variant={GENERAL_USER_STATUS_VARIANT[user.status]}>
  {GENERAL_USER_STATUS_LABEL[user.status]}
</Badge>
```

---

## 도메인별 파일 분리 규칙

- 하나의 파일이 100줄을 넘으면 분리를 검토한다
- 도메인 경계가 명확한 경우 별도 파일로 분리 (예: `hotel.ts`, `esim.ts`)
- 여러 도메인에 걸친 공통 타입은 `pagination.ts`, `auth.ts` 등 별도 공통 파일에

```ts
// src/shared/types/index.ts
export * from './pagination';
export * from './user';
export * from './hotel';
export * from './esim';
export * from './chat';
// 새 파일 추가 시 여기에도 추가
```

---

## 공통 타입 패턴

```ts
// 페이지네이션 요청 (공통)
export interface PaginationRequest {
  page: number;
  size: number;
}

// 페이지네이션 응답 (공통)
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;     // 현재 페이지 (0-based)
  size: number;
}

// API 응답 래퍼 (일부 엔드포인트)
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
```

**주의**: 백엔드 응답 래퍼가 일관되지 않을 수 있다. 일부 엔드포인트는 직접 응답, 일부는 `{success, data}` 래핑. API 연동 전 실제 응답 구조를 확인한다.
