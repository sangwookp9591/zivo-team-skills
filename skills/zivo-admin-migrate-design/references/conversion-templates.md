# HTML → React+StyleX 변환 템플릿

4가지 주요 패턴의 보일러플레이트. 각 섹션에서 `// TODO:` 주석을 도메인에 맞게 교체한다.

---

## 템플릿 1: 리스트 페이지

**HTML 패턴:**
```html
<div class="main-body">
  <div class="page-header"><h1>목록 제목</h1></div>
  <div class="filter-section">...</div>
  <div class="table-section">
    <table class="table">...</table>
    <div class="pagination">...</div>
  </div>
</div>
```

**변환 결과 — `index.tsx`:**
```tsx
import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import * as stylex from '@stylexjs/stylex';
import {
  PageHeader, TableCard, Table, TableHead, TableBody, TableRow, TableCell,
  TableSkeletonRow, Pagination, FilterSection as CommonFilterSection,
  TableCountHeader, Badge,
  type FilterFieldConfig, type FilterValue,
} from '@/shared/ui';
import { Button } from '@shared/ui/Button/Button';
import { useIsMobile } from '@/shared/hooks';
import { MobileCardList, MobileDetailDrawer, type MobileCardConfig } from '@/shared/ui/MobileTable';
import { PageContainer } from '@shared/ui/PageContainer';
// TODO: import { xxxQueries } from '@shared/api/queries/xxxQueries';
import { styles } from './styles.stylex';

export function XxxListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSelectedItem, setMobileSelectedItem] = useState<any>(null);

  const page = Number(searchParams.get('page') || '0');
  const size = Number(searchParams.get('size') || '10');
  const [filters, setFilters] = useState({
    searchType: searchParams.get('searchType') || 'name',
    searchValue: searchParams.get('searchValue') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    // TODO: 도메인별 필터 추가
  });

  const updateSearchParams = useCallback((updates: Record<string, string | number>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        const strValue = String(value);
        if (!strValue || strValue === '0' && key === 'page') next.delete(key);
        else next.set(key, strValue);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const { data, isLoading, isFetching, isError } = useQuery({
    // TODO: ...xxxQueries.list({ page, size, ...filters }),
    queryKey: ['xxx-list', page, size, filters],
    queryFn: async () => ({ items: [], pagination: { totalCount: 0, totalPages: 1 } }),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const totalCount = data?.pagination?.totalCount ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const filterFields: FilterFieldConfig[] = [
    {
      name: 'search', label: '검색어', type: 'search-combo',
      searchOptions: [{ value: 'name', label: '이름' }], // TODO: 옵션 추가
      placeholder: '검색어를 입력하세요',
    },
    { name: 'dateRange', label: '등록일', type: 'date-range' },
    // TODO: 도메인별 필터 필드 추가
  ];

  const filterValues: Record<string, FilterValue> = {
    search: filters.searchValue,
    searchType: filters.searchType,
    dateRange: { from: filters.startDate, to: filters.endDate },
  };

  const mobileCardConfig: MobileCardConfig<any> = {
    primary: { key: 'name' },       // TODO: 도메인 primary 키
    secondary: { key: 'createdAt' }, // TODO: 도메인 secondary 키
  };

  return (
    <PageContainer>
      <PageHeader title='TODO: 페이지 제목' />
      <CommonFilterSection
        layout='standard-v2'
        fields={filterFields}
        values={filterValues}
        onChange={(name, value) => {
          setFilters(prev => ({ ...prev, [name]: value }));
        }}
        onSearch={() => updateSearchParams({ ...filters, page: 0 })}
        onReset={() => { setFilters({ searchType: 'name', searchValue: '', startDate: '', endDate: '' }); setSearchParams({}, { replace: true }); }}
        responsive
        searchFieldName='search'
        searchPlaceholder='검색어를 입력하세요'
      />
      {isMobile ? (
        <MobileCardList
          data={items as any[]}
          cardConfig={mobileCardConfig}
          rowKey='id'
          onCardClick={item => { setMobileSelectedItem(item); setMobileDrawerOpen(true); }}
          loading={isLoading}
          emptyMessage='데이터가 없습니다'
        />
      ) : (
        <TableCard
          header={<TableCountHeader totalCount={totalCount} />}
          footer={
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              onPageChange={p => updateSearchParams({ page: p - 1 })}
              pageSize={size}
              onPageSizeChange={s => updateSearchParams({ size: s, page: 0 })}
              pageSizeOptions={[10, 20, 50]}
            />
          }
        >
          <Table minWidth='900px' hover>
            <TableHead>
              <TableRow>
                <TableCell isHeader width='60px'>번호</TableCell>
                {/* TODO: 컬럼 헤더 추가 */}
                <TableCell isHeader align='center' width='90px'>상세</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isError && (
                <TableRow hover={false}>
                  <TableCell colSpan={2} {...stylex.props(styles.emptyCell)}>데이터를 불러오지 못했습니다.</TableCell>
                </TableRow>
              )}
              {(isLoading || isFetching) && !isError &&
                Array.from({ length: size }).map((_, i) => <TableSkeletonRow key={i} columns={2} />)}
              {!isLoading && !isFetching && !isError && items.length === 0 && (
                <TableRow hover={false}>
                  <TableCell colSpan={2} {...stylex.props(styles.emptyCell)}>데이터가 없습니다.</TableCell>
                </TableRow>
              )}
              {!isLoading && !isFetching && !isError && items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell width='60px'>{item.id}</TableCell>
                  {/* TODO: 데이터 컬럼 추가 */}
                  <TableCell align='center' width='90px'>
                    <Button variant='outlineGray' size='sm'>상세보기</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      <MobileDetailDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        data={mobileSelectedItem}
        fields={[
          { label: '번호', key: 'id' },
          // TODO: 필드 추가
        ]}
        title='TODO: 항목 제목'
      />
    </PageContainer>
  );
}
```

**`styles.stylex.ts`:**
```ts
import * as stylex from '@stylexjs/stylex';

// StyleX breakpoints는 반드시 파일 내 로컬 상수로 정의 (외부 import 금지)
const sm = '@media (max-width: 768px)';
const md = '@media (max-width: 1024px)';

export const styles = stylex.create({
  emptyCell: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#888',
  },
  // TODO: 도메인별 스타일 추가
});
```

---

## 템플릿 2: DraggableLayout (Master-Detail)

**HTML 패턴:**
```html
<div class="main-body">
  <div class="list-section">
    <div class="filter-bar">...</div>
    <table class="table">...</table>
  </div>
  <div class="detail-panel">
    <div class="panel-header">...</div>
    <div class="panel-body">...</div>
  </div>
</div>
```

**변환 결과 — `index.tsx`:**
```tsx
import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import * as stylex from '@stylexjs/stylex';
import {
  DraggableLayout, PageHeader, Table, TableHead, TableBody, TableRow, TableCell,
  TableSkeletonRow, Badge,
} from '@/shared/ui';
import { Button } from '@shared/ui/Button/Button';
// TODO: import { xxxQueries } from '@shared/api/queries/xxxQueries';
// TODO: import { XxxDetailPanel } from './components/XxxDetailPanel';
import { styles } from './styles.stylex';

export function XxxPage() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    // TODO: ...xxxQueries.list(queryPayload),
    queryKey: ['xxx-list'],
    queryFn: async () => ({ items: [] }),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];

  const handleRowClick = (item: any) => {
    setSelectedItem(item);
    setIsPanelOpen(true);
  };

  return (
    <DraggableLayout
      masterPanel={
        <div>
          <PageHeader title='TODO: 페이지 제목' />
          {/* TODO: FilterSection 추가 */}
          <Table minWidth='700px' hover>
            <TableHead>
              <TableRow>
                <TableCell isHeader>TODO: 컬럼</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(isLoading || isFetching) &&
                Array.from({ length: 10 }).map((_, i) => <TableSkeletonRow key={i} columns={3} />)}
              {!isLoading && items.map((item: any) => (
                <TableRow
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  {...stylex.props(selectedItem?.id === item.id && styles.selectedRow)}
                >
                  <TableCell>{item.id}</TableCell>
                  {/* TODO: 데이터 컬럼 추가 */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
      detailPanel={
        selectedItem
          ? <div {...stylex.props(styles.detailContent)}>
              {/* TODO: XxxDetailPanel 컴포넌트로 분리 */}
              <p>ID: {selectedItem.id}</p>
            </div>
          : null
      }
      isOpen={isPanelOpen}
      onClose={() => setIsPanelOpen(false)}
      title={selectedItem?.name ?? '상세'}
      statusBadge={
        selectedItem
          ? <Badge variant='success'>{selectedItem.status}</Badge> // TODO: status 매핑
          : undefined
      }
      actions={
        <Button variant='outlineGray' size='sm' onClick={() => {}}>
          수정
        </Button>
      }
      initialWidth={480}
      showCompanyFooter  // DraggableLayout 사용 시 필수 — Footer 중복 방지
    />
  );
}
```

**`styles.stylex.ts`:**
```ts
import * as stylex from '@stylexjs/stylex';

const sm = '@media (max-width: 768px)';

export const styles = stylex.create({
  selectedRow: {
    backgroundColor: '#f0f7ff',
  },
  detailContent: {
    padding: '16px',
  },
});
```

---

## 템플릿 3: SyncNavLayout (섹션 네비게이션)

**HTML 패턴:**
```html
<div class="register-container">
  <nav class="section-nav">
    <ul>
      <li class="active"><a href="#basic">기본 정보</a></li>
      <li><a href="#contact">연락처</a></li>
    </ul>
  </nav>
  <div class="register-main">
    <div class="register-body">
      <section id="basic">...</section>
      <section id="contact">...</section>
    </div>
    <div class="register-footer">
      <button>저장</button>
    </div>
  </div>
</div>
```

**변환 결과 — `index.tsx`:**
```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as stylex from '@stylexjs/stylex';
import { SyncNavLayout, FormSection } from '@/shared/ui';
import { Button } from '@shared/ui/Button/Button';
import { PageContainer } from '@shared/ui/PageContainer';
// TODO: import { xxxQueries } from '@shared/api/queries/xxxQueries';
import { styles } from './styles.stylex';

// HTML <nav> 항목 → sections 배열로 변환 (id는 FormSection id와 일치)
const sections = [
  { id: 'basic', label: '기본 정보' },
  { id: 'contact', label: '연락처' },
  // TODO: HTML nav 항목 추가
];

export function XxxDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    // TODO: ...xxxQueries.detail(Number(id)),
    queryKey: ['xxx-detail', id],
    queryFn: async () => null,
    enabled: !!id,
  });

  if (isLoading) {
    return <PageContainer><div {...stylex.props(styles.loadingWrapper)}>로딩 중...</div></PageContainer>;
  }
  if (isError || !data) {
    return (
      <PageContainer>
        <div {...stylex.props(styles.errorWrapper)}>
          데이터를 불러오지 못했습니다.
          <Button variant='outlineGray' size='sm' onClick={() => navigate(-1)}>뒤로가기</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <SyncNavLayout
      sections={sections}
      showCompanyFooter  // SyncNavLayout 사용 시 필수 — Footer 중복 방지
      footer={
        <div {...stylex.props(styles.footerActions)}>
          <Button variant='outlineGray' size='md' onClick={() => navigate(-1)}>목록으로</Button>
          {/* TODO: 저장/수정 버튼 추가 */}
        </div>
      }
    >
      {/* HTML <section id="basic"> → FormSection id="basic" */}
      <FormSection id='basic' title='기본 정보'>
        <table {...stylex.props(styles.infoTable)}>
          <tbody>
            <tr>
              <th {...stylex.props(styles.th)}>ID</th>
              <td {...stylex.props(styles.td)}>{(data as any).id}</td>
            </tr>
            {/* TODO: HTML <tr> 항목 → React tr로 변환 */}
          </tbody>
        </table>
      </FormSection>

      <FormSection id='contact' title='연락처'>
        {/* TODO: HTML 섹션 내용 변환 */}
      </FormSection>
    </SyncNavLayout>
  );
}
```

**`styles.stylex.ts`:**
```ts
import * as stylex from '@stylexjs/stylex';

const sm = '@media (max-width: 768px)';

export const styles = stylex.create({
  loadingWrapper: { padding: '40px', textAlign: 'center' },
  errorWrapper: { padding: '40px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' },
  footerActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  infoTable: { width: '100%', borderCollapse: 'collapse' },
  th: {
    width: '160px',
    padding: '10px 12px',
    backgroundColor: '#f5f5f5',
    fontWeight: 500,
    textAlign: 'left',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 12px',
    verticalAlign: 'top',
  },
});
```

---

## 템플릿 4: 대시보드

**HTML 패턴:**
```html
<div class="dashboard-container">
  <div class="kpi-grid">
    <div class="kpi-card"><span class="label">전체</span><span class="value">1,234</span></div>
  </div>
  <div class="chart-section">...</div>
  <div class="recent-table">...</div>
</div>
```

**변환 결과 — `index.tsx`:**
```tsx
import { useQuery } from '@tanstack/react-query';
import * as stylex from '@stylexjs/stylex';
import {
  PageHeader, StatsGrid, StatCard,
  Table, TableHead, TableBody, TableRow, TableCell, TableCard, TableSkeletonRow,
} from '@/shared/ui';
import { useIsMobile } from '@/shared/hooks';
import { PageContainer } from '@shared/ui/PageContainer';
// TODO: import { xxxQueries } from '@shared/api/queries/xxxQueries';
import { styles } from './styles.stylex';

export function XxxDashboardPage() {
  const isMobile = useIsMobile();

  const { data, isLoading } = useQuery({
    // TODO: ...xxxQueries.dashboard(),
    queryKey: ['xxx-dashboard'],
    queryFn: async () => ({ total: 0, active: 0, pending: 0, recent: [] }),
  });

  return (
    <PageContainer>
      <PageHeader title='TODO: 대시보드 제목' />

      {/* HTML .kpi-grid → StatsGrid + StatCard */}
      <StatsGrid columns={isMobile ? 2 : 4}>
        <StatCard label='전체' value={data?.total ?? 0} />
        <StatCard label='활성' value={data?.active ?? 0} />
        <StatCard label='대기' value={data?.pending ?? 0} />
        {/* TODO: KPI 카드 추가 */}
      </StatsGrid>

      {/* TODO: HTML .chart-section → 차트 컴포넌트 (recharts 등) */}

      {/* HTML .recent-table → TableCard */}
      <TableCard header={<span {...stylex.props(styles.sectionTitle)}>최근 데이터</span>}>
        <Table minWidth='600px'>
          <TableHead>
            <TableRow>
              <TableCell isHeader>번호</TableCell>
              {/* TODO: 컬럼 헤더 추가 */}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <TableSkeletonRow key={i} columns={3} />)}
            {!isLoading && (data?.recent ?? []).map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                {/* TODO: 데이터 컬럼 추가 */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </PageContainer>
  );
}
```

**`styles.stylex.ts`:**
```ts
import * as stylex from '@stylexjs/stylex';

const sm = '@media (max-width: 768px)';

export const styles = stylex.create({
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
  },
});
```

---

## 공통 변환 규칙

### Material Icons
```tsx
// HTML: <span class="material-icons">home</span>
// React: import { Home } from '@mui/icons-material';
//        <Home sx={{ fontSize: 20 }} />
// StyleX 환경: sx prop 대신 style prop 사용
```

### CSS 인라인 스타일 → StyleX
```tsx
// HTML: style="display: flex; gap: 8px; color: #333;"
// StyleX:
const styles = stylex.create({
  row: { display: 'flex', gap: '8px', color: '#333' },
});
// 사용: <div {...stylex.props(styles.row)}>

// 주의: StyleX breakpoints는 파일 내 로컬 상수 필수
// const sm = '@media (max-width: 768px)';  ← 이렇게 파일 상단에 선언
```

### CSS 클래스 → StyleX
```tsx
// HTML: <button class="btn btn-primary btn-sm">
// React: <Button variant='primary' size='sm'>

// HTML: <span class="badge badge-success">활성</span>
// React: <Badge variant='success'>활성</Badge>

// HTML: <div class="table-responsive"><table class="table table-hover">
// React: <TableCard><Table minWidth='900px' hover>
```
