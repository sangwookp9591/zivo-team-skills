# 상세 페이지 보일러플레이트

`src/pages/general/{domain}/{PageName}/index.tsx`

`useParams` + `useQuery` 기반 상세 조회 패턴. 섹션 컴포넌트 분리.

```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as stylex from '@stylexjs/stylex';
import {
  SyncNavLayout,
  FormSection,
  Badge,
} from '@/shared/ui';
import { Button } from '@shared/ui/Button/Button';
import { PageContainer } from '@shared/ui/PageContainer';
import { useIsMobile } from '@/shared/hooks';
// TODO: 실제 queries import로 교체
import { xxxQueries } from '@shared/api/queries/xxxQueries';
import { styles } from './styles.stylex';

// 좌측 네비게이션 섹션 정의
const sections = [
  { id: 'basic', label: '기본 정보', icon: null },
  { id: 'system', label: '시스템 정보', icon: null },
  // TODO: 섹션 추가
];

export function XxxDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data, isLoading, isError } = useQuery({
    ...xxxQueries.detail(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div {...stylex.props(styles.loadingWrapper)}>로딩 중...</div>
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <div {...stylex.props(styles.errorWrapper)}>
          데이터를 불러오지 못했습니다.
          <Button variant='outlineGray' size='sm' onClick={() => navigate(-1)}>
            뒤로가기
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SyncNavLayout sections={sections}>
        {/* 기본 정보 섹션 */}
        <FormSection id='basic' title='기본 정보'>
          <table {...stylex.props(styles.infoTable)}>
            <tbody>
              <tr>
                <th {...stylex.props(styles.th)}>ID</th>
                <td {...stylex.props(styles.td)}>{data.id}</td>
              </tr>
              <tr>
                <th {...stylex.props(styles.th)}>상태</th>
                <td {...stylex.props(styles.td)}>
                  {/* TODO: Badge variant 매핑 */}
                  <Badge variant='success'>{data.status}</Badge>
                </td>
              </tr>
              {/* TODO: 필드 추가 */}
            </tbody>
          </table>
        </FormSection>

        {/* 시스템 정보 섹션 */}
        <FormSection id='system' title='시스템 정보'>
          <table {...stylex.props(styles.infoTable)}>
            <tbody>
              <tr>
                <th {...stylex.props(styles.th)}>등록일</th>
                <td {...stylex.props(styles.td)}>{data.createdAt ?? '-'}</td>
              </tr>
              <tr>
                <th {...stylex.props(styles.th)}>수정일</th>
                <td {...stylex.props(styles.td)}>{data.updatedAt ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </FormSection>
      </SyncNavLayout>

      {/* 액션 버튼 */}
      <div {...stylex.props(styles.actionBar)}>
        <Button variant='outlineGray' size='md' onClick={() => navigate(-1)}>
          목록으로
        </Button>
        {/* TODO: 수정/삭제 등 액션 버튼 추가 */}
      </div>
    </PageContainer>
  );
}
```

## 섹션 컴포넌트 분리 패턴

페이지가 커질 경우 `components/` 서브디렉토리에 섹션별 컴포넌트로 분리한다.

```
components/
  BasicInfoSection.tsx
  SystemInfoSection.tsx
  ActivityTable.tsx
  ...
```

```tsx
// components/BasicInfoSection.tsx
import type { XxxDetail } from '@shared/types';

interface Props {
  data: XxxDetail;
}

export function BasicInfoSection({ data }: Props) {
  return (
    // ...
  );
}
```

`index.tsx`에서 import해 사용:

```tsx
import { BasicInfoSection } from './components/BasicInfoSection';
// ...
<FormSection id='basic' title='기본 정보'>
  <BasicInfoSection data={data} />
</FormSection>
```
