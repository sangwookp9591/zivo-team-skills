# HTML Class → ZIVO_ADMIN 공통 컴포넌트 매핑표

`ZIVO_DESIGN/admin/` HTML CSS class를 `ZIVO_ADMIN/src/shared/ui/index.ts` export 컴포넌트에 매핑.

import 경로: `import { ComponentName } from '@/shared/ui';`

---

## 레이아웃

| HTML class / 구조 | ZIVO_ADMIN 컴포넌트 | 비고 |
|-----------------|-------------------|------|
| `.admin-container` | 변환 불필요 | App Layout이 처리 |
| `.sidebar` | 변환 불필요 | App Layout이 처리 |
| `.admin-header` | 변환 불필요 | App Layout이 처리 |
| `.main-body` / `.page-content` | `ContentLayout` | 페이지 콘텐츠 래퍼 |
| `.page-header` | `PageHeader` | 제목 + 액션 버튼 영역 |

---

## 테이블

| HTML class | ZIVO_ADMIN 컴포넌트 | props 비고 |
|-----------|-------------------|-----------|
| `<table class="table">` | `Table` | |
| `<thead>` | `TableHead` | |
| `<tbody>` | `TableBody` | |
| `<tr>` | `TableRow` | |
| `<td>` / `<th>` | `TableCell` / `TableHeader` | |
| `.table-section` / `.table-wrapper` | `TableCard` | header/footer 포함 카드 |
| `.pagination` | `Pagination` | `page`, `totalPages`, `onChange` |
| `.table-info` / `.result-count` | `TableCountHeader` / `TableInfoHeader` | |
| 페이지사이즈 선택 | `TableHeaderPageSizeSelector` | |

---

## 필터

| HTML class | ZIVO_ADMIN 컴포넌트 | props 비고 |
|-----------|-------------------|-----------|
| `.filter-section` | `FilterSection` | 기존 필터 (상품 목록 패턴) |
| `.search-filter-bar` | `FilterSection` | |
| 호텔 스타일 composable 필터 | `FilterSectionV2` + `FilterRow` + `FilterField` | |
| 필터 내 텍스트 입력 | `FilterInput` | |
| 필터 내 select | `FilterSelect` | |
| 필터 버튼 그룹 | `FilterActions` | 검색/초기화 버튼 |

---

## 폼

| HTML class | ZIVO_ADMIN 컴포넌트 | props 비고 |
|-----------|-------------------|-----------|
| `.form-group` | `FormGroup` | label + input 묶음 |
| `.form-group` (상세 폼) | `DetailFormGroup` | 상세 페이지용 |
| `.form-section` | `FormSection` | 폼 섹션 래퍼 |
| `.form-label` / `<label>` | `FormLabel` | |
| `.form-input` / `<input>` | `FormInput` | 기존 래퍼 |
| `<input>` (범용) | `Input` | variant, size props |
| `<select>` | `Select` / `StyledSelect` | StyledSelect는 커스텀 스타일 |
| `<select multiple>` | `MultiSelectDropdown` | |
| `<textarea>` | `Textarea` | |
| `.toggle-switch` | `Switch` | |
| `<input type="checkbox">` | `Checkbox` / `CheckboxGroup` | |
| `<input type="radio">` | `Radio` / `RadioGroup` | |
| `.settings-section` | `SettingsSection` | 설정 페이지 섹션 |

---

## 버튼

| HTML class | ZIVO_ADMIN 컴포넌트 | variant props |
|-----------|-------------------|--------------|
| `.btn.btn-primary` | `Button` | `variant='primary'` |
| `.btn.btn-secondary` | `Button` | `variant='secondary'` |
| `.btn.btn-outline` | `Button` | `variant='outline'` |
| `.btn.btn-ghost` | `Button` | `variant='ghost'` |
| `.btn.btn-success` | `Button` | `variant='success'` |
| `.btn.btn-error` | `Button` | `variant='danger'` |
| `.btn.btn-approve` | `Button` | `variant='primary'` |
| `.btn.btn-reject` | `Button` | `variant='outline'` |
| `.btn.btn-reject-danger` | `Button` | `variant='danger'` |
| `.btn.btn-outline-gray` | `Button` | `variant='outlineGray'` |
| `.btn.btn-outline-danger` | `Button` | `variant='outlineDanger'` |
| `.btn-icon` | `Button` | `variant='icon'` size='md' |
| `.btn-icon-sm` | `Button` | `variant='icon'` size='sm' |
| `.btn-sm` | `Button` | `size='sm'` |
| `.btn-lg` | `Button` | `size='lg'` |

---

## 배지

| HTML class | ZIVO_ADMIN 컴포넌트 | variant props |
|-----------|-------------------|--------------|
| `.badge.badge-success` | `Badge` | `variant='success'` |
| `.badge.badge-error` | `Badge` | `variant='error'` |
| `.badge.badge-warning` | `Badge` | `variant='warning'` |
| `.badge.badge-info` | `Badge` | `variant='info'` |
| `.badge.badge-primary` | `Badge` | `variant='primary'` |
| `.badge.badge-secondary` | `Badge` | `variant='secondary'` |
| `.badge.badge-neutral` | `Badge` | `variant='neutral'` |
| 점 상태 표시 | `DotBadge` | `variant` prop |

---

## 카드 / 통계

| HTML class | ZIVO_ADMIN 컴포넌트 | 비고 |
|-----------|-------------------|------|
| `.card` | `Card` | `CardHeader`, `CardBody`, `CardFooter` 조합 |
| `.kpi-grid` / `.stats-grid` | `StatsGrid` | KPI 그리드 레이아웃 |
| `.kpi-card` / `.stat-card` | `StatCard` | KPI 단위 카드 |
| stats 컨테이너 | `StatsContainer` | |

---

## 모달

| HTML class | ZIVO_ADMIN 컴포넌트 | 비고 |
|-----------|-------------------|------|
| `.modal-overlay` + `.modal` | `Modal` | `isOpen`, `onClose` props |
| `.modal-header` | `ModalHeader` | |
| `.modal-footer` | `ModalFooter` | |
| 확인/취소 모달 | `ConfirmModal` | |

---

## 상세 패널

| HTML class | ZIVO_ADMIN 컴포넌트 | 비고 |
|-----------|-------------------|------|
| 드래그 리사이즈 패널 | `DetailPanelLayout` | 호텔 UI 패턴 |
| `.detail-header` | `DetailHeader` | |
| `.detail-body` | `DetailBody` | |
| `.detail-actions` | `DetailActions` | |
| `.detail-section` | `DetailSection` | |
| `.detail-grid` | `DetailGrid` | |
| `.detail-field` | `DetailField` | label + value |
| 상세 스켈레톤 | `DetailSkeleton` | |
| 접기/펼치기 섹션 | `CollapsibleSection` | |

---

## 탭 네비게이션

| HTML class | ZIVO_ADMIN 컴포넌트 | 비고 |
|-----------|-------------------|------|
| `.tab-nav` | `UnderlineTabLayout` | 탭 + 콘텐츠 통합 |
| `.tab-nav` (탭만) | `TabNav` | 탭 바만 렌더링 |
| 테이블 전용 탭 | `UnderlineTabTable` | 탭별 테이블 전환 |

---

## 기타 UI

| HTML class / 요소 | ZIVO_ADMIN 컴포넌트 | 비고 |
|----------------|-------------------|------|
| `.alert` / 알림 메시지 | `Alert` | `type='success'|'error'|'warning'|'info'` |
| 로딩 스피너 | `ZivoLoading` | |
| 파일 업로드 | `FileUpload` | |
| 태그 입력 | `Tag` / `TagList` | |
| 날짜 선택 | `DatePicker` | |
| 시간 선택 | `TimePicker` / `TimeSelect` | |
| 날짜 범위 | `DateRangePicker` | |
| 월 선택 | `MonthPicker` | |
| 국가 선택 | `CountrySelector` | |
| 칩 선택 | `SelectionChip` / `SelectionGrid` | |
| 미리보기 패널 | `PreviewPanel` | |
| 마스터-디테일 레이아웃 | `MasterDetailLayout` | |
| 드래그 레이아웃 | `DraggableLayout` | `showCompanyFooter` prop 주의 |
| 스크롤 동기 레이아웃 | `SyncNavLayout` | `showCompanyFooter` prop 주의 |

---

## 매핑 없음 (변환 불필요 또는 로컬 처리)

| HTML 요소 | 처리 방법 |
|----------|---------|
| `.sidebar` | App Layout이 전담, 페이지에서 구현 불필요 |
| `.admin-header` | App Layout이 전담, 페이지에서 구현 불필요 |
| `.admin-container` | App Layout 래퍼, 페이지에서 구현 불필요 |
| 커스텀 차트/그래프 | 로컬 컴포넌트로 구현 (공통 컴포넌트 없음) |
| 복잡한 드래그앤드롭 | 로컬 구현 또는 `DraggableLayout` 활용 |
