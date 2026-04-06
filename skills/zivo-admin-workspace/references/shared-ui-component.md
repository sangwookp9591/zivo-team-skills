# 공유 UI 컴포넌트 생성 가이드

`src/shared/ui/`에 위치한 재사용 가능한 UI 컴포넌트 작성 규칙.

---

## 디렉토리 구조

```
src/shared/ui/{ComponentName}/
  ├── {ComponentName}.tsx        # 메인 컴포넌트
  ├── index.ts                   # barrel export
  ├── styles.stylex.ts           # StyleX 스타일 (선택 — 스타일이 많으면 분리)
  └── types.ts                   # 타입 (선택 — Props가 크면 분리, 작으면 컴포넌트 내 정의)
```

컴포넌트를 만든 후 반드시 `src/shared/ui/index.ts`에 re-export를 추가한다.

---

## Props 인터페이스 패턴

```tsx
// {ComponentName}.tsx

interface {ComponentName}Props {
  // 필수 props
  label: string;
  // 선택 props
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
  // 자식 컴포넌트가 있으면
  children?: React.ReactNode;
  // className은 StyleX 방식으로 — style prop 사용
  style?: stylex.StyleXStyles;
}

export function {ComponentName}({ label, variant = 'primary', ...props }: {ComponentName}Props) {
  // ...
}
```

---

## StyleX 스타일 분리 규칙

스타일이 5줄 이하면 컴포넌트 파일 내 인라인 정의도 허용. 그 이상이면 `styles.stylex.ts`로 분리.

```ts
// styles.stylex.ts
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../app/styles/tokens.stylex';

// breakpoints는 반드시 로컬 상수로 정의 (외부 import 금지)
const MOBILE = '@media (max-width: 768px)';
const TABLET = '@media (max-width: 1024px)';

export const styles = stylex.create({
  root: {
    display: 'flex',
    padding: tokens.space,
    backgroundColor: tokens.color,
    borderRadius: tokens.radius,
  },
  mobile: {
    [MOBILE]: {
      flexDirection: 'column',
    },
  },
});
```

**주의**: `tokens.stylex.ts`의 토큰명 — `color`, `space`, `fontSize`, `font`, `radius`. alias 금지.

---

## barrel export 규칙

```ts
// src/shared/ui/{ComponentName}/index.ts
export { ComponentName } from './{ComponentName}';
export type { ComponentNameProps } from './{ComponentName}';

// src/shared/ui/index.ts 에 추가
export * from './{ComponentName}';
```

---

## 기존 컴포넌트 목록 (중복 생성 방지)

아래 컴포넌트는 이미 존재한다. 새로 만들기 전에 확인할 것.

**입력/폼**: Button, Checkbox, Radio, Switch, Toggle, FormInput, FormLabel, FormGroup, FormSection, Textarea, Select, StyledSelect, MultiSelectDropdown, CountrySelector

**날짜/시간**: DateInput, DatePicker, DateRangePicker, DateRangeInput, MonthPicker, TimePicker, TimeSelect, TimeSlotGrid, Calendar, CardCalendar

**테이블/목록**: Table, TableCard, TableHeader, MobileTable, Pagination

**레이아웃**: ContentLayout, DetailPanelLayout, DraggableLayout, MasterDetailLayout, PageContainer, PageHeader, SyncNavLayout, UnderlineTabLayout, UnderlineTabTable, SettingsSection, FilterSection, PreviewPanel

**피드백/상태**: Alert, Badge, Tag, StatusDot, Modal, MobileFullPageModal, Toast, ZivoLoading

**카드/통계**: Card, StatCard, Stats, StatsGrid, UsageBar, PricingProgressBar

**미디어**: FileUpload, ImageUploadGrid, ImageLightbox, MobilePreviewFrame

**기타**: ExpandableText, Tooltip, SelectionChip, ViewToggle, WeeklySchedule, ServiceSelectGrid 등

---

## 레이아웃 컴포넌트 사용 가이드

레이아웃 컴포넌트는 페이지 전체 구조를 결정하므로 선택 시 주의가 필요하다.

### DraggableLayout

Master-Detail 패턴. 좌측 리스트 + 우측 드래그 가능 상세 패널.

```tsx
<DraggableLayout
  masterPanel={<ListPanel />}
  detailPanel={<DetailPanel />}
  isOpen={isDetailOpen}
  onClose={() => setIsDetailOpen(false)}
  title="상세 정보"           // 선택
  showCompanyFooter={true}   // 선택 — Footer 내장 렌더링
/>
```

사용처: eSIM 페이지들, hotel SettingsPage 등 목록+상세 패턴.

### SyncNavLayout

좌측 섹션 네비게이션 + 우측 스크롤 영역 (scroll spy). 긴 폼/상세 페이지에 사용.

```tsx
const sections: SectionConfig[] = [
  { id: 'basic', label: '기본 정보' },
  { id: 'detail', label: '상세 정보' },
];

<SyncNavLayout
  sections={sections}
  footer={<FooterButtons />}  // 선택
  theme="default"             // 선택
  showCompanyFooter={false}   // 선택
>
  <FormSection id="basic">...</FormSection>
  <FormSection id="detail">...</FormSection>
</SyncNavLayout>
```

- `SectionConfig = { id: string; label: string }`
- `FormSection` + `FormGroup` 컴포넌트와 함께 사용
- 사용처: UserDetailPage, HospitalInfoManagementPage, 등록/상세 페이지들

### Footer 이중 렌더링 방지 (중요)

`SyncNavLayout`과 `DraggableLayout`은 `showCompanyFooter` prop으로 내부에 Footer를 렌더링할 수 있다. 이 경우 외부 레이아웃에서 Footer를 별도 렌더링하면 **이중으로 표시**된다.

```tsx
// Layout 컴포넌트에서 SyncNavLayout 페이지 감지 후 외부 Footer 숨기기
// isSyncNavPage 패턴 — 해당 페이지에서 showCompanyFooter를 직접 제어
{!isSyncNavPage && <CompanyFooter />}
```

**규칙**: 레이아웃 컴포넌트의 `showCompanyFooter`를 `true`로 설정했다면, 외부 레이아웃에서 같은 Footer를 렌더링하지 않는다.

---

## 새 컴포넌트 생성 step-by-step

1. `src/shared/ui/` 에서 유사 컴포넌트가 없는지 확인
2. `src/shared/ui/{ComponentName}/` 디렉토리 생성
3. `{ComponentName}.tsx` 작성 — Props interface 정의, 컴포넌트 함수 export
4. `index.ts` 작성 — named export
5. 스타일이 많으면 `styles.stylex.ts` 분리
6. `src/shared/ui/index.ts`에 `export * from './{ComponentName}'` 추가
7. 필요 시 `src/shared/types/` 에 관련 타입 추가
