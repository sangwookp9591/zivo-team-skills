# 리스트 페이지 보일러플레이트

`src/pages/general/{domain}/{PageName}/index.tsx`

데스크톱 Table + 모바일 MobileCardList 분기, URL 기반 필터/페이지 상태 관리 패턴.

```tsx
import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format, parseISO } from '@shared/utils/dateUtils';
import * as stylex from '@stylexjs/stylex';
import {
  PageHeader,
  StatsGrid,
  StatCard,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSkeletonRow,
  TableCard,
  TableHeader,
  Badge,
  Pagination,
  FilterSection as CommonFilterSection,
  type FilterFieldConfig,
  type FilterValue,
  TableCountHeader,
} from '@/shared/ui';
import { Button } from '@shared/ui/Button/Button';
import {
  MobileCardList,
  MobileDetailDrawer,
  type MobileCardConfig,
} from '@/shared/ui/MobileTable';
import { useIsMobile } from '@/shared/hooks';
import { PageContainer } from '@shared/ui/PageContainer';
// TODO: 실제 queries import로 교체
import { xxxQueries } from '@shared/api/queries/xxxQueries';
import type { XxxListRequest, XxxStatus } from '@shared/types';
import { styles } from './styles.stylex';

// TODO: 상태 타입 정의
type StatusFilter = 'all' | XxxStatus;

// TODO: 상태 라벨 맵
const STATUS_LABELS: Record<XxxStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
};

const STATUS_VARIANTS: Record<XxxStatus, 'success' | 'warning' | 'error' | 'gray'> = {
  ACTIVE: 'success',
  INACTIVE: 'gray',
};

function parseFiltersFromParams(searchParams: URLSearchParams) {
  return {
    searchType: (searchParams.get('searchType') || 'name') as string,
    searchValue: searchParams.get('searchValue') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    status: (searchParams.get('status') || '') as XxxStatus | '',
    // TODO: 도메인별 필터 추가
  };
}

export function XxxListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const page = Number(searchParams.get('page') || '0');
  const size = Number(searchParams.get('size') || '10');

  const appliedFilters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);
  const selectedStatus: StatusFilter = appliedFilters.status || 'all';

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSelectedItem, setMobileSelectedItem] = useState<any>(null);
  const [filters, setFilters] = useState(() => parseFiltersFromParams(searchParams));

  const PARAM_DEFAULTS: Record<string, string> = {
    searchType: 'name',
    page: '0',
    size: '10',
  };

  const updateSearchParams = useCallback((updates: Record<string, string | number>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        const strValue = String(value);
        if (strValue === '' || PARAM_DEFAULTS[key] === strValue) {
          next.delete(key);
        } else {
          next.set(key, strValue);
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // TODO: 쿼리 파라미터 빌드
  const queryPayload: XxxListRequest = {
    page,
    size,
    ...(appliedFilters.status && { status: appliedFilters.status }),
    ...(appliedFilters.searchValue.trim() && {
      [appliedFilters.searchType]: appliedFilters.searchValue.trim(),
    }),
    ...(appliedFilters.startDate && { createdAtFrom: `${appliedFilters.startDate}T00:00:00` }),
    ...(appliedFilters.endDate && { createdAtTo: `${appliedFilters.endDate}T23:59:59` }),
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...xxxQueries.list(queryPayload),
    placeholderData: keepPreviousData,
  });

  // TODO: 응답 구조에 맞게 조정
  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const totalCount = pagination?.totalCount ?? 0;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = page + 1;

  const handleStatusFilter = (status: StatusFilter) => {
    const nextStatus = status === 'all' ? '' : status;
    setFilters(prev => ({ ...prev, status: nextStatus as XxxStatus | '' }));
    updateSearchParams({ status: nextStatus, page: 0 });
  };

  const handleSearch = () => {
    updateSearchParams({
      searchType: filters.searchType,
      searchValue: filters.searchValue,
      startDate: filters.startDate,
      endDate: filters.endDate,
      status: filters.status,
      page: 0,
    });
  };

  const handleReset = () => {
    const reset = {
      searchType: 'name',
      searchValue: '',
      startDate: '',
      endDate: '',
      status: '' as XxxStatus | '',
    };
    setFilters(reset);
    setSearchParams({}, { replace: true });
    refetch();
  };

  const filterFields: FilterFieldConfig[] = [
    {
      name: 'search',
      label: '검색어',
      type: 'search-combo',
      searchOptions: [
        { value: 'name', label: '이름' },
        // TODO: 도메인별 검색 옵션 추가
      ],
      placeholder: '검색어를 입력하세요',
    },
    {
      name: 'dateRange',
      label: '등록일',
      type: 'date-range',
    },
    {
      name: 'status',
      label: '상태',
      type: 'select',
      options: [
        { value: '', label: '전체' },
        { value: 'ACTIVE', label: '활성' },
        { value: 'INACTIVE', label: '비활성' },
      ],
    },
  ];

  const filterValues: Record<string, FilterValue> = {
    search: filters.searchValue,
    searchType: filters.searchType,
    dateRange: { from: filters.startDate, to: filters.endDate },
    status: filters.status || '',
  };

  const handleFilterChange = (name: string, value: FilterValue) => {
    setFilters(prev => {
      const next = { ...prev };
      if (name === 'search') {
        next.searchValue = typeof value === 'string' ? value : '';
      } else if (name === 'searchType') {
        next.searchType = value as string;
      } else if (
        name === 'dateRange' &&
        value && typeof value === 'object' && 'from' in value && 'to' in value
      ) {
        next.startDate = (value as { from: string; to: string }).from;
        next.endDate = (value as { from: string; to: string }).to;
      } else if (name === 'status') {
        next.status = value as string as XxxStatus | '';
      }
      return next;
    });
  };

  // 모바일 카드 config
  const mobileCardConfig: MobileCardConfig<any> = {
    primary: { key: 'name' },
    secondary: { key: 'email' },
    badge: {
      key: 'status',
      render: row => (
        <Badge variant={STATUS_VARIANTS[row.status as XxxStatus] ?? 'gray'}>
          {STATUS_LABELS[row.status as XxxStatus] ?? row.status}
        </Badge>
      ),
    },
  };

  return (
    <PageContainer>
      <PageHeader title='TODO: 페이지 제목' />

      {/* TODO: 필요 시 StatsGrid 제거 */}
      <StatsGrid columns={isMobile ? 2 : 4}>
        <StatCard
          label='전체'
          value={totalCount}
          active={selectedStatus === 'all'}
          onClick={() => handleStatusFilter('all')}
        />
        <StatCard
          label='활성'
          value={0}
          active={selectedStatus === 'ACTIVE'}
          onClick={() => handleStatusFilter('ACTIVE')}
        />
      </StatsGrid>

      <CommonFilterSection
        layout='standard-v2'
        fields={filterFields}
        values={filterValues}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
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
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={newPage => updateSearchParams({ page: newPage - 1 })}
              pageSize={size}
              onPageSizeChange={newSize => updateSearchParams({ size: newSize, page: 0 })}
              pageSizeOptions={[10, 20, 50]}
            />
          }
        >
          <Table minWidth='900px' hover>
            <TableHead>
              <TableRow>
                <TableCell isHeader width='60px'>번호</TableCell>
                <TableCell isHeader width='100px'>상태</TableCell>
                {/* TODO: 컬럼 추가 */}
                <TableCell isHeader align='center' width='90px'>상세</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isError && (
                <TableRow hover={false}>
                  <TableCell colSpan={3} {...stylex.props(styles.emptyCell)}>
                    데이터를 불러오지 못했습니다.
                  </TableCell>
                </TableRow>
              )}
              {(isLoading || isFetching) && !isError &&
                Array.from({ length: size }).map((_, i) => (
                  <TableSkeletonRow key={`skeleton-${i}`} columns={3} />
                ))}
              {!isLoading && !isFetching && !isError && items.length === 0 && (
                <TableRow hover={false}>
                  <TableCell colSpan={3} {...stylex.props(styles.emptyCell)}>
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isFetching && !isError && items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell width='60px'>{item.id}</TableCell>
                  <TableCell width='100px'>
                    <Badge variant={STATUS_VARIANTS[item.status as XxxStatus] ?? 'gray'}>
                      {STATUS_LABELS[item.status as XxxStatus] ?? item.status}
                    </Badge>
                  </TableCell>
                  {/* TODO: 데이터 컬럼 추가 */}
                  <TableCell align='center' width='90px'>
                    <Button
                      variant='outlineGray'
                      size='sm'
                      onClick={() => navigate(`/admin/xxx/${item.id}`)}
                    >
                      상세보기
                    </Button>
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
          { label: '상태', render: (row: any) => STATUS_LABELS[row.status as XxxStatus] ?? row.status },
          // TODO: 필드 추가
        ]}
        title='TODO: 항목 제목'
        footer={
          <Button
            variant='outlineGray'
            size='lg'
            onClick={() => { setMobileDrawerOpen(false); navigate(`/admin/xxx/${mobileSelectedItem?.id}`); }}
            fullWidth
          >
            상세보기
          </Button>
        }
      />
    </PageContainer>
  );
}
```
