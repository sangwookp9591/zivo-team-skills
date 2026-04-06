# API 서비스 레이어 템플릿

`src/shared/api/services/{domain}Service.ts`

## apiClient 기본 패턴

```typescript
import { apiClient } from '../clients/axiosClient';
import type {
  XxxListRequest,
  XxxListResponse,
  XxxDetail,
  XxxCreateRequest,
  XxxUpdateRequest,
} from '@shared/types';

// 백엔드 @ApiResponseWrapper 응답 래퍼 타입
type ApiResponse<T> = { success: boolean; data: T };

/**
 * 목록 조회
 * GET /api/xxx
 */
export const getXxxList = async (
  params: XxxListRequest = {}
): Promise<XxxListResponse> => {
  const response = await apiClient.get<ApiResponse<XxxListResponse>>(
    '/api/xxx',
    { params }
  );
  return response.data.data;
};

/**
 * 상세 조회
 * GET /api/xxx/{id}
 */
export const getXxxDetail = async (id: number): Promise<XxxDetail> => {
  const response = await apiClient.get<ApiResponse<XxxDetail>>(
    `/api/xxx/${id}`
  );
  return response.data.data;
};

/**
 * 생성
 * POST /api/xxx
 */
export const createXxx = async (
  request: XxxCreateRequest
): Promise<XxxDetail> => {
  const response = await apiClient.post<ApiResponse<XxxDetail>>(
    '/api/xxx',
    request
  );
  return response.data.data;
};

/**
 * 수정
 * PUT /api/xxx/{id}
 */
export const updateXxx = async (
  id: number,
  request: XxxUpdateRequest
): Promise<XxxDetail> => {
  const response = await apiClient.put<ApiResponse<XxxDetail>>(
    `/api/xxx/${id}`,
    request
  );
  return response.data.data;
};

/**
 * 상태 변경 (PATCH)
 * PATCH /api/xxx/{id}/status
 */
export const updateXxxStatus = async (
  id: number,
  status: string
): Promise<void> => {
  await apiClient.patch(`/api/xxx/${id}/status`, { status });
};

/**
 * 삭제
 * DELETE /api/xxx/{id}
 */
export const deleteXxx = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/xxx/${id}`);
};
```

## 주의사항

- `@ApiResponseWrapper` 적용된 엔드포인트: `.data.data`로 언래핑
- 래퍼 없는 엔드포인트(일부 레거시): `.data`만 사용
- 어드민 API 경로 규칙: `/api/admin/{domain}/...`
- `params` 전달 시 빈 문자열/undefined 필드는 axios가 자동 제거하지 않으므로 필요 시 명시적으로 제거:

```typescript
// 빈 값 제거 유틸 (필요 시)
const cleanParams = Object.fromEntries(
  Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
);
```
