# StyleX 스타일 파일 템플릿

`src/pages/general/{domain}/{PageName}/styles.stylex.ts`

## 지뢰 요약

| 규칙 | 올바름 | 금지 |
|------|--------|------|
| 토큰명 | `color`, `space`, `fontSize`, `font`, `radius` | `colors`, `spacing`, `fontSizes` 등 alias |
| Breakpoint 상수 | 파일 내 `const BP_XXX = '...'` | 외부 파일에서 import |
| 빈 객체 | `null` | `{}` |
| 조건부 스타일 | `...(cond ? [styles.x] : [])` | `cond && styles.x` |

## 기본 템플릿

```typescript
import * as stylex from '@stylexjs/stylex';
import { color, space, fontSize, font, radius } from '@app/styles/tokens.stylex';

// 반드시 파일 내 로컬 상수로 정의 (외부 import 금지!)
const BP_MOBILE_ONLY = '@media (max-width: 719px)';
const BP_TABLET = '@media (min-width: 720px)';
const BP_DESKTOP = '@media (min-width: 1280px)';

export const styles = stylex.create({
  // 빈 셀 (테이블 no-data/error)
  emptyCell: {
    textAlign: 'center',
    padding: space.xl,
    color: color.gray500,
  },

  // 로딩 래퍼
  loadingWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
    color: color.gray500,
  },

  // 에러 래퍼
  errorWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    color: color.gray600,
  },

  // 상세 페이지 인포 테이블
  infoTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  th: {
    width: '140px',
    padding: space.sm,
    textAlign: 'left',
    fontSize: fontSize.sm,
    fontWeight: font.medium,
    color: color.gray600,
    backgroundColor: color.gray50,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.gray200,
    verticalAlign: 'top',
  },

  td: {
    padding: space.sm,
    fontSize: fontSize.sm,
    color: color.gray900,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.gray200,
  },

  // 액션 바 (상세 페이지 하단)
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: space.sm,
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: color.gray200,
  },
});
```

## 반응형 스타일 예시

```typescript
export const styles = stylex.create({
  container: {
    padding: {
      [BP_MOBILE_ONLY]: space.md,   // 719px 이하
      [BP_TABLET]: space.lg,         // 720px 이상
      [BP_DESKTOP]: space.xl,        // 1280px 이상
    },
  },

  grid: {
    display: {
      [BP_MOBILE_ONLY]: 'flex',
      [BP_TABLET]: 'grid',
      [BP_DESKTOP]: 'grid',
    },
    flexDirection: {
      [BP_MOBILE_ONLY]: 'column',
      [BP_TABLET]: null,   // grid일 때는 null
      [BP_DESKTOP]: null,
    },
    gridTemplateColumns: {
      [BP_MOBILE_ONLY]: null,
      [BP_TABLET]: 'repeat(2, 1fr)',
      [BP_DESKTOP]: 'repeat(3, 1fr)',
    },
    gap: space.md,
  },
});
```

## stylex.props 사용 패턴

```tsx
// 단순 적용
<div {...stylex.props(styles.container)} />

// 조건부 (스프레드 패턴 필수)
<div {...stylex.props(styles.base, ...(isActive ? [styles.active] : []))} />

// 여러 스타일 조합
<div {...stylex.props(styles.base, styles.variant, styles.size)} />
```
