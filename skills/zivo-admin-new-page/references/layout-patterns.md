# 레이아웃 패턴 가이드

ZIVO_ADMIN에는 3가지 주요 레이아웃 패턴이 있다. 페이지 성격에 맞는 패턴을 선택한다.

## 패턴 선택 기준

| 패턴 | 언제 사용 |
|------|----------|
| 기본 리스트 | 단순 목록 조회/관리 페이지 |
| DraggableLayout | 목록 클릭 → 우측 패널에서 상세 확인 (eSIM, hotel settings 등) |
| SyncNavLayout | 긴 폼/상세 페이지에서 섹션 네비게이션 필요 시 (회원 상세, 병원 정보 등) |

---

## 1. 기본 리스트 패턴

`PageContainer` + `TableCard` + `Pagination` 조합. Footer는 Layout 레벨에서 렌더링됨.

```tsx
import { PageContainer } from '@shared/ui/PageContainer';
import { PageHeader, TableCard, Table, ... } from '@/shared/ui';

export function XxxListPage() {
  return (
    <PageContainer>
      <PageHeader title='목록 제목' />
      {/* 필터, 테이블, 페이지네이션 */}
    </PageContainer>
  );
}
```

상세 보일러플레이트는 `references/page-scaffold.tsx.md` 참조.

---

## 2. DraggableLayout (Master-Detail 패턴)

좌측 리스트(master) + 우측 드래그 가능 상세 패널(detail). 패널 너비를 사용자가 조절 가능.

**사용처**: eSIM 관련 페이지(UsagePage, DeviceManagementPage, CustomerPage, CSPage, IssuePage, ProductPage, OrderPage), hotel SettingsPage

```tsx
import { DraggableLayout } from '@shared/ui';

export function XxxPage() {
  const [selectedItem, setSelectedItem] = useState<XxxItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleRowClick = (item: XxxItem) => {
    setSelectedItem(item);
    setIsPanelOpen(true);
  };

  return (
    <DraggableLayout
      masterPanel={
        // 좌측: 리스트 영역
        <div>
          {/* PageHeader, FilterSection, Table 등 */}
          <Table>
            {items.map(item => (
              <TableRow key={item.id} onClick={() => handleRowClick(item)}>
                {/* ... */}
              </TableRow>
            ))}
          </Table>
        </div>
      }
      detailPanel={
        // 우측: 상세 패널 (isOpen=false일 때 숨겨짐)
        selectedItem ? <XxxDetailPanel item={selectedItem} /> : null
      }
      isOpen={isPanelOpen}
      onClose={() => setIsPanelOpen(false)}
      title={selectedItem?.name ?? '상세'}
      statusBadge={
        selectedItem ? (
          <Badge variant='success'>{selectedItem.status}</Badge>
        ) : undefined
      }
      actions={
        // 패널 헤더 우측 액션 버튼
        <Button variant='outlineGray' size='sm' onClick={handleEdit}>
          수정
        </Button>
      }
      initialWidth={480}        // 패널 초기 너비 (px), 기본값 있음
      showCompanyFooter         // Footer를 DraggableLayout 내부에서 렌더링
    />
  );
}
```

### DraggableLayout Props

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `masterPanel` | `ReactNode` | O | 좌측 리스트 영역 |
| `detailPanel` | `ReactNode` | O | 우측 상세 패널 |
| `isOpen` | `boolean` | O | 패널 열림 여부 |
| `onClose` | `() => void` | O | 패널 닫기 핸들러 |
| `title` | `string` | - | 패널 헤더 타이틀 |
| `statusBadge` | `ReactNode` | - | 타이틀 옆 배지 |
| `actions` | `ReactNode` | - | 패널 헤더 우측 액션 버튼 |
| `initialWidth` | `number` | - | 패널 초기 너비(px) |
| `showCompanyFooter` | `boolean` | - | 내부 Footer 렌더링 여부 |

---

## 3. SyncNavLayout (섹션 네비게이션 패턴)

좌측 섹션 목록 클릭 → 우측 해당 섹션으로 스크롤. 스크롤 시 활성 섹션 자동 하이라이트(scroll spy).

**사용처**: UserDetailPage, HospitalInfoManagementPage, 긴 등록/상세 페이지

```tsx
import { SyncNavLayout, FormSection, FormGroup } from '@/shared/ui';

// 섹션 정의 — id는 FormSection의 id prop과 일치해야 함
const sections = [
  { id: 'basic', label: '기본 정보' },
  { id: 'contact', label: '연락처' },
  { id: 'system', label: '시스템 정보' },
];

export function XxxDetailPage() {
  return (
    <SyncNavLayout
      sections={sections}
      showCompanyFooter           // Footer를 SyncNavLayout 내부에서 렌더링
      footer={
        // 하단 고정 액션 바 (선택)
        <div>
          <Button onClick={handleSave}>저장</Button>
        </div>
      }
    >
      {/* FormSection id가 sections[].id와 일치해야 스크롤 연동 됨 */}
      <FormSection id='basic' title='기본 정보'>
        <FormGroup label='이름'>
          <input type='text' value={data.name} />
        </FormGroup>
        {/* ... */}
      </FormSection>

      <FormSection id='contact' title='연락처'>
        {/* ... */}
      </FormSection>

      <FormSection id='system' title='시스템 정보'>
        {/* ... */}
      </FormSection>
    </SyncNavLayout>
  );
}
```

### SyncNavLayout Props

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `sections` | `SectionConfig[]` | O | `{ id: string; label: string }[]` |
| `children` | `ReactNode` | O | FormSection 목록 |
| `footer` | `ReactNode` | - | 하단 고정 액션 바 |
| `theme` | `'default' \| 'white'` | - | 배경 테마 |
| `showCompanyFooter` | `boolean` | - | 내부 Footer 렌더링 여부 |

---

## Footer 중복 방지 규칙

Footer가 두 번 렌더링되는 문제를 방지한다.

| 레이아웃 | Footer 처리 |
|---------|------------|
| 기본 리스트 (`PageContainer`) | Layout 레벨에서 자동 렌더링 — 별도 처리 불필요 |
| `SyncNavLayout` 사용 | `showCompanyFooter` prop 추가, 외부 Footer 제거 |
| `DraggableLayout` 사용 | `showCompanyFooter` prop 추가, 외부 Footer 제거 |

> 레이아웃 컴포넌트(예: BeautySalonLayout)에서는 `isSyncNavPage` 체크로 SyncNavLayout 페이지일 때 외부 Footer를 자동으로 숨긴다. `showCompanyFooter`를 빠뜨리면 Footer가 아예 안 보이므로 반드시 추가할 것.
