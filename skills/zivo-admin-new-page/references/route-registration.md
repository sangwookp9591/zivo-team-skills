# 라우트 등록 체크리스트

## 라우트 파일 선택

| 도메인 | 파일 |
|--------|------|
| 일반 어드민 (회원, 상품, 예약, 게시판 등) | `src/app/routes/generalRoutes.tsx` |
| 호텔 | `src/app/routes/hotelRoutes.tsx` |
| eSIM | `src/app/routes/esimRoutes.tsx` |
| 뷰티살롱 | `src/app/routes/beautySalonRoutes.tsx` |
| QR 주문 | `src/app/routes/qrOrderRoutes.tsx` |

## 기본 등록 패턴

### 1. import 추가 (named import)

```tsx
// generalRoutes.tsx 상단 import 목록에 추가
import { XxxListPage } from '@pages/general/{domain}/XxxListPage';
import { XxxDetailPage } from '@pages/general/{domain}/XxxDetailPage';
```

### 2. route 객체 추가

```tsx
// generalRoutes 배열 내 적절한 위치에 추가
{
  path: 'xxx',
  element: (
    <ProtectedRoute allowedLevels={['ADMIN', 'STAFF']}>
      <XxxListPage />
    </ProtectedRoute>
  ),
},
{
  path: 'xxx/:id',
  element: (
    <ProtectedRoute allowedLevels={['ADMIN', 'STAFF']}>
      <XxxDetailPage />
    </ProtectedRoute>
  ),
},
```

## lazy import (큰 페이지용)

번들 크기가 클 경우 `lazy` 사용. 단, Suspense fallback이 필요하다.

```tsx
// 파일 상단에서
const XxxListPage = lazy(
  () => import('@pages/general/{domain}/XxxListPage').then(m => ({ default: m.XxxListPage }))
);

// route에서 (Suspense는 이미 DashboardLayout에서 처리됨)
{
  path: 'xxx',
  element: (
    <ProtectedRoute allowedLevels={['ADMIN', 'STAFF']}>
      <XxxListPage />
    </ProtectedRoute>
  ),
},
```

> named export는 `.then(m => ({ default: m.ComponentName }))` 변환 필요.

## allowedLevels 가이드

| 값 | 대상 |
|----|------|
| `['ADMIN']` | 최고 관리자만 |
| `['ADMIN', 'MANAGER']` | 관리자 + 매니저 |
| `['ADMIN', 'STAFF']` | 관리자 + 일반 스태프 (가장 일반적) |

## 실제 경로 구조 예시

```
/admin/                          ← DashboardLayout
  members/users                  ← UserManagementPage
  members/users/:id              ← UserDetailPage
  products/list                  ← ProductListPage
  bookings                       ← BookingManagementPage
  bookings/:id                   ← BookingDetailPage
  system/seo                     ← SEOManagementPage
```

경로는 `generalRoutes.tsx`의 parent route path를 확인 후 결정한다.

## 체크리스트

- [ ] 라우트 파일에 import 추가
- [ ] route 배열에 path + element 추가
- [ ] `ProtectedRoute`로 감싸고 `allowedLevels` 설정
- [ ] 경로 일관성 확인 (useNavigate/Link에서 사용하는 경로와 일치)
- [ ] Sidebar 메뉴 항목 추가 필요 시 Sidebar 컴포넌트도 수정
