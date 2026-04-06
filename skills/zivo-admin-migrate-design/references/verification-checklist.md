# 마이그레이션 완료 검증 체크리스트

ZIVO_DESIGN → ZIVO_ADMIN 마이그레이션 후 PR 제출 전에 7개 카테고리를 모두 확인한다.

---

## 1. 디자인 일치

- [ ] ZIVO_DESIGN HTML의 모든 텍스트(레이블, 플레이스홀더, 버튼 문구)가 React에 100% 복제됨
- [ ] 색상값이 StyleX 토큰으로 정확히 매핑됨 (`design-token-mapping.md` 참조)
- [ ] 간격(padding / margin / gap)이 `space` 토큰으로 매핑됨
- [ ] 폰트 크기/굵기가 `fontSize` / `font` 토큰으로 매핑됨
- [ ] border-radius가 `radius` 토큰으로 매핑됨
- [ ] shadow가 `shadow` 토큰으로 매핑됨
- [ ] 반응형 레이아웃(모바일/태블릿 breakpoint)이 원본과 동일하게 구현됨

---

## 2. Material Icons

- [ ] HTML `<span class="material-symbols-rounded">name</span>` →
  `import NameRounded from '@mui/icons-material/NameRounded'`
- [ ] 아이콘 크기(`fontSize`)와 색상이 원본과 동일
- [ ] `lucide-react`, `react-icons` 등 다른 아이콘 라이브러리 사용 안 함

---

## 3. 공통 컴포넌트 활용

- [ ] `html-component-mapping.md`에서 매핑 가능한 모든 요소에 공통 컴포넌트 사용
- [ ] `PageContainer`, `PageHeader`, `Table`, `Button`, `Badge` 등 기본 컴포넌트 우선 사용
- [ ] 로컬 구현은 매핑 불가 요소에만 한정
- [ ] 새 컴포넌트 생성 전 `new-component-proposal.md` 3단계 프로세스 준수

---

## 4. StyleX 규칙

- [ ] 토큰명: `color`, `space`, `fontSize`, `font`, `radius` (alias `colors`, `spacing` 등 사용 안 함)
- [ ] Breakpoint 상수를 파일 내 로컬 정의 (`const MOBILE = '@media (max-width: 768px)'`)
- [ ] 빈 객체 `{}` 없음 (조건부 스타일은 `null` 사용)
- [ ] `stylex.props` 스프레드 패턴 사용: `...(cond ? [styles.x] : [])`
- [ ] 반응형 + pseudo 동일 속성 혼합 없음 (별도 스타일 키로 분리)

---

## 5. 파일 구조

- [ ] `src/pages/{domain}/{PageName}/index.tsx` (named export)
- [ ] `src/pages/{domain}/{PageName}/styles.stylex.ts` (로컬 breakpoint 포함)
- [ ] 필요 시 `components/`, `hooks/` 서브디렉토리 사용
- [ ] 파일 상단에 출처 주석 추가: `// Migrated from: ZIVO_DESIGN/admin/{file}.html`

---

## 6. TypeScript & Build

- [ ] `tsc --noEmit` 에러 없음
- [ ] ESLint 경고/에러 없음
- [ ] 미사용 import 없음

```bash
# TypeScript 검사
cd ZIVO_ADMIN && npx tsc --noEmit

# ESLint (특정 페이지)
cd ZIVO_ADMIN && npx eslint src/pages/{domain}/{PageName}/
```

---

## 7. 인터랙션 & 라우트

- [ ] 라우트 등록 완료 (`generalRoutes` / `hotelRoutes` / `esimRoutes` 등 해당 파일)
- [ ] `ProtectedRoute` + `allowedLevels` 설정 완료
- [ ] Footer 이중 렌더링 없음: `DraggableLayout` / `SyncNavLayout`의 `showCompanyFooter` 사용 시
  외부 레이아웃에서 Footer를 별도 렌더링하지 않음
- [ ] 버튼 클릭, 테이블 행 선택, 필터, 페이지네이션 기본 동작 확인
- [ ] eSIM 경로(`/esim/*`)는 `theme="white"`, NavLink에 `end` 속성 적용
