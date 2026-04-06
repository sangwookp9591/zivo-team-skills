# Design Token 매핑표

`ZIVO_DESIGN/admin/admin-design-system.css` `:root` CSS 변수 →
`ZIVO_ADMIN/src/app/styles/tokens.stylex.ts` StyleX 토큰 변환 규칙.

---

## 색상 (Color)

### Primary / Secondary

| CSS 변수 | StyleX 토큰 | 값 |
|---------|------------|-----|
| `--primary-color` | `color.primary` | `#1A5DF7` |
| `--primary-dark` | `color.primaryDark` | `#1348C9` |
| `--primary-light` | `color.primaryLight` | `#4A7DF9` |
| `--primary-pale` | `color.primaryPale` | `#E8F0FE` |
| `--secondary-color` | `color.secondary` | `#FFB800` |
| `--secondary-dark` | `color.secondaryDark` | `#CC9300` |
| `--secondary-light` | `color.secondaryLight` | `#FFC817` |
| `--secondary-pale` | `color.secondaryPale` | `#FFF4E0` |

### Gray Scale

| CSS 변수 | StyleX 토큰 | 값 |
|---------|------------|-----|
| `--white` | `color.white` | `#ffffff` |
| `--gray-50` | `color.gray50` | `#F8F9FB` |
| `--gray-100` | `color.gray100` | `#F1F3F6` |
| `--gray-200` | `color.gray200` | `#E8EBF0` |
| `--gray-300` | `color.gray300` | `#D8DCE3` |
| `--gray-400` | `color.gray400` | `#B4BAC5` |
| `--gray-500` | `color.gray500` | `#949BA8` |
| `--gray-600` | `color.gray600` | `#6E7684` |
| `--gray-700` | `color.gray700` | `#575D6B` |
| `--gray-800` | `color.gray800` | `#3D424F` |
| `--gray-900` | `color.gray900` | `#1E2128` |
| `--black` | `color.black` | `#000000` |

### Semantic Colors

| CSS 변수 | StyleX 토큰 | 값 |
|---------|------------|-----|
| `--success` | `color.success` | `#10B981` |
| `--success-light` | `color.successLight` | `#E8F5E9` |
| `--success-dark` | `color.successDark` | `#2E7D32` |
| `--error` | `color.error` | `#EF4444` |
| `--error-light` | `color.errorLight` | `#FFEBEE` |
| `--error-dark` | `color.errorDark` | `#C62828` |
| `--warning` | `color.warning` | `#F59E0B` |
| `--warning-light` | `color.warningLight` | `#FFF3E0` |
| `--warning-dark` | `color.warningDark` | `#F57C00` |
| `--info` | `color.info` | `#3B82F6` |
| `--info-light` | `color.infoLight` | `#DBEAFE` |
| `--info-dark` | `color.infoDark` | `#1E40AF` |
| `--purple` | `color.purple` | `#8b5cf6` |
| `--purple-light` | `color.purpleLight` | `#EDE9FE` |
| `--purple-dark` | `color.purpleDark` | `#6D28D9` |

### UI Alias (용도별 별칭)

| CSS 변수 | StyleX 토큰 | 비고 |
|---------|------------|------|
| `--text-primary` | `color.textMain` | gray-900 |
| `--text-body` | `color.textSecondary` | gray-600 |
| `--text-muted` | `color.textMuted` | gray-500 |
| `--text-disabled` | `color.gray300` | gray-300 |
| `--bg-primary` | `color.background` | white |
| `--bg-secondary` | `color.backgroundSecondary` | gray-50 |
| `--bg-tertiary` | `color.backgroundHover` | gray-100 |
| `--bg-hover` | `color.backgroundHover` | gray-100 |
| `--bg-active` | `color.gray200` | gray-200 |
| `--border-primary` | `color.border` | gray-200 |
| `--border-secondary` | `color.gray300` | gray-300 |
| `--border-hover` | `color.gray400` | gray-400 |
| `--icon-primary` | `color.gray900` | gray-900 |
| `--icon-secondary` | `color.gray600` | gray-600 |
| `--icon-muted` | `color.gray400` | gray-400 |
| `--icon-disabled` | `color.gray300` | gray-300 |

---

## 간격 (Space)

| CSS 변수 | StyleX 토큰 | 값 |
|---------|------------|-----|
| `--space-xs` | `space.xs` | `4px` |
| `--space-sm` | `space.sm` | `8px` |
| `--space-md` | `space.md` | `16px` |
| `--space-lg` | `space.lg` | `24px` |
| `--space-xl` | `space.xl` | `40px` |
| `--space-2xl` | `space.xxl` | `56px` |

---

## 폰트 크기 (Font Size)

⚠️ 주의: CSS 변수 이름과 StyleX 토큰 이름이 1:1 대응되지 않는다.

| CSS 변수 | 값 | StyleX 토큰 | 비고 |
|---------|----|-----------|----|
| `--font-size-xs` | `12px` | `fontSize.xs` | |
| `--font-size-sm` | `14px` | `fontSize.base` | ⚠️ `fontSize.sm`은 13px이므로 `fontSize.base` 사용 |
| `--font-size-base` | `14px` | `fontSize.base` | |
| `--font-size-md` | `16px` | `fontSize.lg` | ⚠️ `fontSize.md`는 15px이므로 `fontSize.lg` 사용 |
| `--font-size-lg` | `16px` | `fontSize.lg` | |
| `--font-size-xl` | `18px` | `fontSize.xl` | |
| `--font-size-2xl` | `20px` | `fontSize._2xl` | |
| `--font-size-3xl` | `24px` | `fontSize._3xl` | |
| `--font-size-4xl` | `28px` | `fontSize._4xl` | |
| `--font-size-5xl` | `32px` | `fontSize._5xl` | |

---

## 폰트 굵기 (Font Weight)

| CSS 변수 | 값 | StyleX 토큰 |
|---------|----|-----------| 
| `--font-weight-regular` | `400` | `font.regular` |
| `--font-weight-medium` | `500` | `font.medium` |
| `--font-weight-semibold` | `600` | `font.semibold` |
| `--font-weight-bold` | `700` | `font.bold` |

---

## 반경 (Border Radius)

| CSS 변수 | 값 | StyleX 토큰 |
|---------|----|-----------| 
| `--radius-sm` | `2px` | `radius.sm` |
| `--radius-md` | `6px` | `radius.md` |
| `--radius-lg` | `8px` | `radius.lg` |
| `--radius-xl` | `12px` | `radius.xl` |
| `--radius-2xl` | `16px` | `radius._2xl` |
| `--radius-3xl` | `24px` | `radius._3xl` |
| `--radius-full` | `9999px` | `radius.full` |
| `--radius` | `4px` | `space._1` 또는 하드코딩 `'4px'` |

---

## 그림자 (Shadow)

| CSS 변수 | StyleX 토큰 |
|---------|-----------|
| `--shadow-sm` | `shadow.sm` |
| `--shadow-md` | `shadow.md` |
| `--shadow-lg` | `shadow.lg` |
| `--shadow-xl` | `shadow.xl` |
| `--shadow-card` | `shadow.card` |

---

## 전환 (Transition)

| CSS 변수 | StyleX 토큰 |
|---------|-----------|
| `--transition-fast` | `transition.fast` |
| `--transition-base` | `transition.normal` |
| `--transition-slow` | `transition.slow` |

---

## BAD / GOOD 비교

```tsx
// BAD - CSS 변수 직접 사용
const styles = stylex.create({
  button: {
    backgroundColor: 'var(--primary-color)',
    fontSize: 'var(--font-size-base)',
    borderRadius: 'var(--radius-md)',
  }
});

// BAD - alias 토큰 사용
import { colors, spacing } from '@/app/styles/tokens.stylex';

// GOOD - 정확한 토큰 이름
import { color, fontSize, radius } from '@/app/styles/tokens.stylex';

const styles = stylex.create({
  button: {
    backgroundColor: color.primary,
    fontSize: fontSize.base,
    borderRadius: radius.md,
  }
});
```

```tsx
// BAD - fontSize 매핑 오류
fontSize: fontSize.sm  // 13px (틀림! CSS --font-size-sm은 14px)

// GOOD - 올바른 매핑
fontSize: fontSize.base  // 14px = CSS --font-size-sm, --font-size-base
```
