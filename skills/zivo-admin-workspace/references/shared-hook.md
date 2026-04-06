# 커스텀 훅 작성 가이드

`src/shared/hooks/`에 위치한 재사용 훅 작성 규칙.

---

## 네이밍 규칙

- 파일명: `use{Name}.ts` (camelCase, `.ts` 확장자 — JSX 없으면 `.tsx` 불필요)
- 함수명: `use{Name}` (React 훅 컨벤션 준수)
- export: named export

```ts
// src/shared/hooks/useMyHook.ts
export function useMyHook(param: SomeType) {
  // ...
  return { value, handler };
}
```

---

## barrel export 규칙

훅을 만든 후 `src/shared/hooks/index.ts`에 반드시 추가한다.

```ts
// src/shared/hooks/index.ts
export { useMyHook } from './useMyHook';
```

---

## 기존 훅 목록 (중복 방지)

아래 훅은 이미 존재한다. 새로 만들기 전에 확인할 것.

**반응형**:
- `useMediaQuery(query: string)` — 미디어 쿼리 boolean 반환
- `useIsMobile()` — 모바일 여부
- (파생 패턴: `useIsTablet`, `useIsDesktop`, `useIsTabletOrAbove`)

**폼/입력**:
- `useFormDiff(original, current)` — 변경 여부 감지
- `useDebounce(value, delay)` — 입력 디바운스
- `useCombobox(options)` — 콤보박스 상태 관리
- `usePreTextMeasure()` — 텍스트 너비 측정

**데이터**:
- `useDetailFetch(id, fetchFn)` — 상세 조회 패턴
- `useFileUpload(options)` — 파일 업로드 상태

**UX**:
- `useDragScroll(ref)` — 드래그 스크롤
- `useKeyboardListNav(items)` — 키보드 목록 탐색

**권한**:
- `usePermission()` — 현재 사용자 권한 조회

**소켓**:
- `useChatSocket(roomId)` — 채팅 소켓 연결
- `useChatV2Socket(roomId)` — 채팅 V2 소켓 연결

---

## 훅 작성 템플릿

### 기본 상태 관리 훅

```ts
import { useState, useCallback } from 'react';

interface UseMyHookOptions {
  initialValue?: string;
}

interface UseMyHookReturn {
  value: string;
  setValue: (v: string) => void;
  reset: () => void;
}

export function useMyHook({ initialValue = '' }: UseMyHookOptions = {}): UseMyHookReturn {
  const [value, setValue] = useState(initialValue);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return { value, setValue, reset };
}
```

### 비동기 데이터 패칭 훅 (TanStack Query 없이)

```ts
import { useState, useEffect } from 'react';

export function useFetchData<T>(fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchFn()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
```

**주의**: 단순 서버 상태 조회는 훅을 새로 만들지 말고 `src/shared/api/queries/` 의 TanStack Query 훅을 사용한다. 커스텀 훅은 UI 상태·로직 재사용 목적에 한정한다.
