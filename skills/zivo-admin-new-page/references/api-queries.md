# TanStack Query Hooks 템플릿

`src/shared/api/queries/{domain}Queries.ts`

## 전체 템플릿

```typescript
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getXxxList,
  getXxxDetail,
  createXxx,
  updateXxx,
  updateXxxStatus,
  deleteXxx,
} from '../services/xxxService';
import type {
  XxxListRequest,
  XxxCreateRequest,
  XxxUpdateRequest,
} from '@shared/types';

// ============================================================
// Query Key Factory
// ============================================================

export const xxxKeys = {
  all: ['xxx'] as const,
  lists: () => [...xxxKeys.all, 'list'] as const,
  list: (filters: XxxListRequest) => [...xxxKeys.lists(), filters] as const,
  details: () => [...xxxKeys.all, 'detail'] as const,
  detail: (id: number) => [...xxxKeys.details(), id] as const,
};

// ============================================================
// Query Options (useQuery에서 스프레드로 사용)
// ============================================================

export const xxxQueries = {
  /** 목록 조회 */
  list: (filters: XxxListRequest = {}) =>
    queryOptions({
      queryKey: xxxKeys.list(filters),
      queryFn: () => getXxxList(filters),
      staleTime: 30 * 1000, // 30초
    }),

  /** 상세 조회 */
  detail: (id: number) =>
    queryOptions({
      queryKey: xxxKeys.detail(id),
      queryFn: () => getXxxDetail(id),
      staleTime: 60 * 1000, // 1분
      enabled: !!id && id > 0,
    }),
};

// ============================================================
// Mutations
// ============================================================

export const useCreateXxx = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: XxxCreateRequest) => createXxx(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: xxxKeys.lists() });
    },
  });
};

export const useUpdateXxx = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: XxxUpdateRequest) => updateXxx(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: xxxKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: xxxKeys.lists() });
    },
  });
};

export const useUpdateXxxStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateXxxStatus(id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: xxxKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: xxxKeys.lists() });
    },
  });
};

export const useDeleteXxx = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteXxx(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: xxxKeys.all });
    },
  });
};
```

## 사용 패턴

### 리스트 페이지에서

```tsx
const { data, isLoading, isFetching, isError } = useQuery({
  ...xxxQueries.list(queryPayload),
  placeholderData: keepPreviousData, // 페이지 전환 시 이전 데이터 유지
});
```

### 상세 페이지에서

```tsx
const { data, isLoading, isError } = useQuery({
  ...xxxQueries.detail(Number(id)),
  enabled: !!id,
});
```

### Mutation 사용

```tsx
const createMutation = useCreateXxx();

const handleSubmit = async (formData: XxxCreateRequest) => {
  try {
    await createMutation.mutateAsync(formData);
    navigate('/admin/xxx');
  } catch (error) {
    // 에러 처리
  }
};

// 버튼에 loading 상태 반영
<Button
  onClick={handleSubmit}
  disabled={createMutation.isPending}
>
  {createMutation.isPending ? '저장 중...' : '저장'}
</Button>
```
