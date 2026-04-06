# 프로젝트 구조 맵

`ZIVO_ADMIN/src/` 디렉토리 전체 구조와 파일 위치 결정 가이드.

---

## 전체 디렉토리 트리

```
ZIVO_ADMIN/src/
├── app/
│   ├── App.tsx                      # 앱 루트 컴포넌트
│   ├── routes/
│   │   ├── index.tsx                # 라우트 진입점
│   │   ├── generalRoutes.tsx        # 일반 관리 라우트
│   │   ├── hotelRoutes.tsx          # 호텔 관리 라우트
│   │   ├── esimRoutes.tsx           # eSIM 관리 라우트
│   │   └── ProtectedRoute.tsx       # 권한 보호 라우트
│   └── styles/
│       └── tokens.stylex.ts         # StyleX 디자인 토큰 (color, space, fontSize, font, radius)
│
├── pages/
│   ├── general/                     # 일반 관리자 페이지
│   │   ├── auth/                    # 로그인/인증
│   │   ├── users/                   # 사용자 관리
│   │   ├── products/                # 상품 관리
│   │   ├── bookings/                # 예약 관리
│   │   ├── board/                   # 게시판
│   │   ├── chat/                    # 채팅
│   │   ├── reviews/                 # 리뷰
│   │   ├── settlement/              # 정산
│   │   ├── system/                  # 시스템 설정
│   │   ├── taxi/                    # 택시 서비스
│   │   ├── talk/                    # Talk 서비스
│   │   ├── service/                 # 서비스 관리
│   │   └── common/                  # general 내 공통
│   ├── hotel/                       # 호텔 관리 페이지
│   └── esim/                        # eSIM 관리 페이지
│
├── shared/
│   ├── ui/                          # 공유 UI 컴포넌트 (70+개)
│   │   └── index.ts                 # barrel export
│   ├── hooks/                       # 공유 커스텀 훅
│   │   └── index.ts
│   ├── api/
│   │   ├── clients/
│   │   │   └── axiosClient.ts       # apiClient 싱글턴
│   │   ├── services/                # API 호출 함수 ({domain}Service.ts)
│   │   ├── queries/                 # TanStack Query 훅 ({domain}Queries.ts)
│   │   ├── utils/                   # API 유틸리티
│   │   └── index.ts
│   ├── types/                       # 공유 타입/DTO
│   │   └── index.ts
│   ├── lib/                         # 유틸리티 라이브러리
│   │   ├── imageUtils.ts            # 이미지 처리 (CDN URL 생성 등)
│   │   ├── notifications.ts         # 알림 유틸
│   │   └── countryLocale.ts         # 국가/로케일 데이터
│   ├── utils/                       # 순수 유틸리티 함수
│   │   └── dateUtils.ts             # 날짜 포맷 등
│   └── components/                  # 복합 컴포넌트 (라이브러리 래퍼 등)
│       └── NaverMap/                # 네이버 지도 래퍼
│
└── widgets/                         # 위젯 컴포넌트 (페이지 조합 단위)
```

---

## "이 파일은 어디에?" 결정 가이드

### 페이지 컴포넌트

| 도메인 | 위치 |
|--------|------|
| 사용자, 예약, 게시판, 채팅, 리뷰, 정산, 시스템, 택시, Talk | `src/pages/general/{domain}/` |
| 숙소, 객실, 재고·요금, 테마, 숙소진열 | `src/pages/hotel/{domain}/` |
| eSIM 상품, 주문, 결제, 디바이스 | `src/pages/esim/{domain}/` |

### 라우트 파일 선택 기준

- `generalRoutes.tsx` — 서비스 전반 (사용자, 콘텐츠, 운영)
- `hotelRoutes.tsx` — 호텔/숙소 도메인 전용
- `esimRoutes.tsx` — eSIM 서비스 전용

### shared vs pages

| 조건 | 위치 |
|------|------|
| 2개 이상 페이지에서 사용 | `src/shared/` |
| 1개 페이지에서만 사용 | 해당 `pages/{domain}/` 내부 |
| 라이브러리를 래핑하는 컴포넌트 | `src/shared/components/` |

### lib vs utils

| 조건 | 위치 |
|------|------|
| 외부 데이터/서비스 관련 유틸 (CDN, 알림, 로케일) | `src/shared/lib/` |
| 순수 함수형 유틸 (날짜 포맷, 문자열 처리) | `src/shared/utils/` |

---

## API 레이어 파일 생성 패턴

새 도메인 API 연동 시 3개 파일을 생성한다.

```
src/shared/api/
  services/{domain}Service.ts    # axios 호출 함수 (순수 함수)
  queries/{domain}Queries.ts     # TanStack Query 훅
  types/{domain}.ts              # ← src/shared/types/{domain}.ts 에 위치
```

```ts
// services/hotelService.ts — 예시
import { apiClient } from '../clients/axiosClient';
import type { HotelListRequest, HotelListResponse } from '../../types/hotel';

export const hotelService = {
  getList: (params: HotelListRequest) =>
    apiClient.get<HotelListResponse>('/api/admin/hotels', { params }).then(r => r.data),
  getDetail: (id: number) =>
    apiClient.get(`/api/admin/hotels/${id}`).then(r => r.data),
};

// queries/hotelQueries.ts — 예시
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hotelService } from '../services/hotelService';

export const hotelKeys = {
  all: ['hotel'] as const,
  list: (params: unknown) => [...hotelKeys.all, 'list', params] as const,
  detail: (id: number) => [...hotelKeys.all, 'detail', id] as const,
};

export function useHotelList(params: HotelListRequest) {
  return useQuery({
    queryKey: hotelKeys.list(params),
    queryFn: () => hotelService.getList(params),
  });
}
```

---

## CDN 이미지 URL 패턴

이미지는 DB에 S3 key로 저장, 화면 표시 시 CDN URL로 변환한다.

```ts
// src/shared/lib/imageUtils.ts 사용
import { getCdnUrl } from '@/shared/lib/imageUtils';

// CDN URL: https://{cf}/{dir}/{file}_{w}x{h}.{fmt}
// Dev: d2uec4r3coj0v1.cloudfront.net
// Prod: dokn0riczwdlu.cloudfront.net
```
