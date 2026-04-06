# 새 공통 컴포넌트 제안 프로세스

ZIVO_DESIGN HTML에서 ZIVO_ADMIN 공통 컴포넌트로 매핑할 수 없는 요소를 발견했을 때 사용한다.
결정 전에 반드시 3단계 프로세스를 순서대로 거쳐야 한다.

---

## Step 1: 기존 컴포넌트 조합으로 해결 가능한가?

기존 컴포넌트 + 로컬 StyleX 스타일로 충분하면 새 컴포넌트를 만들지 않는다.

- `.segment-control` → `UnderlineTabLayout` 또는 `RadioGroup`으로 대체
- `.data-table` → `Table` + 페이지 로컬 `styles.stylex.ts`로 스타일링
- `.stat-card` → `StatCard` 또는 `Card` + `StatsGrid`로 대체

**결론**: 기존 컴포넌트로 충분하면 로컬 스타일만 추가하고 종료.

---

## Step 2: 기존 컴포넌트에 prop 추가로 해결 가능한가?

새 variant나 옵션이 필요한 경우 기존 컴포넌트 확장을 먼저 검토한다.

- `Button`에 새 variant 필요 → `Button.tsx`에 variant 추가 제안
- `Badge`에 새 색상 필요 → `Badge`에 variant 추가 제안
- `Table`에 행 그룹핑 필요 → `TableSection` 활용 또는 prop 추가 제안

**결론**: 확장이 자연스러우면 기존 컴포넌트 PR로 처리하고 종료.

---

## Step 3: 새 공통 컴포넌트가 실제로 필요한가?

아래 조건을 모두 충족할 때만 새 공통 컴포넌트로 생성한다:

- **2개 이상** 페이지에서 반복되는 패턴
- 기존 컴포넌트로 대체/확장이 어색하거나 불가능
- 도메인 로직 없이 순수 UI 컴포넌트

조건 미충족 시 → **페이지 로컬 컴포넌트** (`src/pages/{domain}/{PageName}/components/`)

---

## 기존 공통 컴포넌트 목록 (중복 생성 금지)

`ZIVO_ADMIN/src/shared/ui/index.ts` 기준. 이 목록에 있는 컴포넌트를 새로 만들지 마라.

**레이아웃**: `PageContainer`, `ContentLayout`, `MasterDetailLayout`, `DetailPanelLayout`,
`DraggableLayout`, `SyncNavLayout`, `UnderlineTabLayout`, `UnderlineTabTable`, `FormSection`

**테이블**: `Table`, `TableCard`, `TableHeader`, `TableInfoHeader`, `TableCountHeader`,
`MobileCardList`, `MobileDetailDrawer`, `ResponsiveTable`

**폼**: `Input`, `Select`, `StyledSelect`, `MultiSelectDropdown`, `CountrySelector`,
`Checkbox`, `CheckboxGroup`, `Radio`, `RadioGroup`, `Switch`, `Toggle`, `Textarea`,
`DatePicker`, `DateRangePicker`, `DateRangeInput`, `MonthPicker`, `TimePicker`, `TimeSelect`,
`TimeSlotGrid`, `FileUpload`, `ImageUploadGrid`, `FormInput`, `FormLabel`, `FormGroup`, `SelectionChip`, `SelectionGrid`

**모달**: `Modal`, `ConfirmModal`, `PhoneRevealModal`, `MobileFullPageModal`, `HotelSelectModal`

**피드백/상태**: `Alert`, `Toast`, `ZivoLoading`, `Badge`, `DotBadge`, `Tag`, `TagList`, `StatusDot`

**카드/통계**: `Card`, `StatCard`, `StatsGrid`, `StatsContainer`, `UsageBar`, `PricingProgressBar`

**기타**: `Button`, `Pagination`, `FilterSection`, `FilterSectionV2`, `PageHeader`, `SettingsSection`,
`PreviewPanel`, `MobilePreviewFrame`, `ViewToggle`, `CardCalendar`, `Calendar`, `KbdHint`,
`ExpandableText`, `Tooltip`, `WeeklySchedule`, `ImageLightbox`, `CountUp`, `SequentialCountUp`

---

## 새 공통 컴포넌트 생성 규칙

Step 3 조건 충족 시 아래 규칙을 따라 생성한다.

**디렉토리 구조**:
```
src/shared/ui/{ComponentName}/
  ├── {ComponentName}.tsx        # 메인 컴포넌트
  ├── index.ts                   # barrel export
  └── styles.stylex.ts           # StyleX 스타일 (선택)
```

**StyleX 토큰 규칙**:
- 토큰명: `color`, `space`, `fontSize`, `font`, `radius` (alias 금지)
- Breakpoint는 파일 내 로컬 상수로 정의 (`const MOBILE = '@media (max-width: 768px)'`)
- 빈 객체 `{}` 금지 → `null` 사용

**barrel export 추가**:
```ts
// src/shared/ui/index.ts 에 추가
export * from './{ComponentName}';
```

---

## 제안 포맷 (AskUserQuestion 사용 시)

```
## 새 공통 컴포넌트 제안

매핑 불가 요소: `{HTML class/구조 설명}`
반복 횟수: {N}개 페이지에서 발견
제안: `src/shared/ui/{ComponentName}/`

Props:
- {prop}: {type} — {설명}

이 컴포넌트를 공통으로 생성할까요?
1. 공통 컴포넌트로 생성
2. 페이지 로컬 컴포넌트로 유지
3. 기존 컴포넌트 조합으로 대체 (직접 지시)
```
