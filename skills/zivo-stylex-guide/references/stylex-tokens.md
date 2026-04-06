# StyleX 토큰 사용법

ZIVO_ADMIN에서 StyleX 토큰은 5종만 사용 가능하다. alias 이름은 존재하지 않으므로 반드시 정확한 이름을 사용한다.

## import 경로

```typescript
import { color, space, fontSize, font, radius } from '@app/styles/tokens.stylex';
```

---

## 사용 가능한 토큰 5종

### color

UI 색상 전반에 사용.

```typescript
color.white        // #ffffff
color.black        // #000000
color.gray100      // 가장 밝은 회색
color.gray200
color.gray300
color.gray400
color.gray500      // 중간 회색
color.gray600
color.gray700
color.gray800
color.gray900      // 가장 어두운 회색
color.primary      // 브랜드 주 색상
color.primaryLight
color.danger       // 에러/삭제
color.warning      // 경고
color.success      // 성공
```

### space

여백(padding, margin, gap)에 사용.

```typescript
space.xs    // 4px
space.sm    // 8px
space.md    // 12px
space.lg    // 16px
space.xl    // 24px
space.xxl   // 32px
```

### fontSize

폰트 크기에 사용.

```typescript
fontSize.xs    // 11px
fontSize.sm    // 12px
fontSize.md    // 14px
fontSize.lg    // 16px
fontSize.xl    // 18px
fontSize.xxl   // 24px
```

### font

폰트 굵기(fontWeight)에 사용.

```typescript
font.regular    // 400
font.medium     // 500
font.semibold   // 600
font.bold       // 700
```

### radius

border-radius에 사용.

```typescript
radius.sm    // 4px
radius.md    // 8px
radius.lg    // 12px
radius.xl    // 16px
radius.full  // 9999px (원형)
```

---

## 금지 alias 목록

아래 이름은 존재하지 않는다. import 시 undefined가 되어 스타일이 깨진다.

| 금지 (BAD) | 올바른 이름 (GOOD) |
|-----------|-----------------|
| `colors` | `color` |
| `spacing` | `space` |
| `spaces` | `space` |
| `fontSizes` | `fontSize` |
| `fonts` | `font` |
| `fontWeights` | `font` |
| `radii` | `radius` |
| `borderRadius` | `radius` |

---

## 올바른/잘못된 예시 비교

**BAD** — alias 사용, 직접 값 하드코딩

```typescript
// BAD: alias 이름 사용
import { colors, spacing } from '@app/styles/tokens.stylex';

export const styles = stylex.create({
  card: {
    backgroundColor: colors.white,   // undefined
    padding: spacing.lg,             // undefined
    fontSize: '14px',                // 하드코딩 금지
    color: '#333333',                // 하드코딩 금지
  },
});
```

**GOOD** — 정확한 토큰명 사용

```typescript
// GOOD: 정확한 토큰명 사용
import { color, space, fontSize } from '@app/styles/tokens.stylex';

export const styles = stylex.create({
  card: {
    backgroundColor: color.white,
    padding: space.lg,
    fontSize: fontSize.md,
    color: color.gray900,
  },
});
```
