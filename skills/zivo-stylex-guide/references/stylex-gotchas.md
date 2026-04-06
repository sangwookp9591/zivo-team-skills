# StyleX 자주 발생하는 에러와 해결법

## 에러 1: `Invalid empty selector`

**원인**: Breakpoint 문자열을 외부 파일에서 import함. StyleX 빌드 타임에 값 추론 불가.

**BAD**
```typescript
// breakpoints.ts
export const BP_MOBILE = '@media (max-width: 719px)';

// MyComponent.stylex.ts
import { BP_MOBILE } from '@app/styles/breakpoints'; // 외부 import → 에러

export const styles = stylex.create({
  box: {
    padding: {
      default: space.lg,
      [BP_MOBILE]: space.md,  // Invalid empty selector 발생
    },
  },
});
```

**GOOD**
```typescript
// MyComponent.stylex.ts — 로컬 상수로 선언
const BP_MOBILE_ONLY = '@media (max-width: 719px)';

export const styles = stylex.create({
  box: {
    padding: {
      default: space.lg,
      [BP_MOBILE_ONLY]: space.md,  // 정상 동작
    },
  },
});
```

---

## 에러 2: 빈 객체 `{}` 사용

**원인**: StyleX는 `{}` 빈 객체를 유효한 스타일 값으로 처리하지 않는다.

**BAD**
```typescript
export const styles = stylex.create({
  item: {
    padding: isActive ? space.lg : {},  // 빈 객체 금지
  },
});
```

**GOOD**
```typescript
// 옵션 1: null 사용 (해당 스타일 무시)
export const styles = stylex.create({
  item: {
    padding: space.lg,
  },
  itemInactive: {
    padding: null,  // 또는 삭제
  },
});

// 옵션 2: 조건부 스타일 키 사용
<div {...stylex.props(
  styles.item,
  isActive && styles.itemActive,
)} />
```

---

## 에러 3: 조건부 스타일 적용 실패

**원인**: StyleX는 `style` prop에 직접 객체를 넘기는 방식이 아니라 `stylex.props()`를 통해 적용한다.

**BAD**
```tsx
// 일반 CSS-in-JS 방식 — StyleX에서 동작하지 않음
<div style={isActive ? activeStyle : baseStyle} />

// 조건부 삼항에서 빈 배열 — 의도와 다르게 동작할 수 있음
<div {...stylex.props(isActive ? styles.active : styles.base)} />
```

**GOOD**
```tsx
// 스프레드 패턴: 기본 + 조건부 추가
<div {...stylex.props(
  styles.base,
  isActive && styles.active,           // boolean && style
  isDisabled && styles.disabled,
)} />

// 배열 스프레드 패턴: 복잡한 조건
<div {...stylex.props(
  styles.base,
  ...(variant === 'primary' ? [styles.primary] : []),
  ...(size === 'large' ? [styles.large] : []),
)} />
```

---

## 에러 4: 토큰 alias 사용

**원인**: `colors`, `spacing` 등 alias 이름은 export되지 않는다.

**BAD**
```typescript
import { colors, spacing, fontSizes } from '@app/styles/tokens.stylex';
// colors, spacing, fontSizes → 전부 undefined
```

**GOOD**
```typescript
import { color, space, fontSize, font, radius } from '@app/styles/tokens.stylex';
// color, space, fontSize, font, radius → 정상 import
```

---

## 에러 5: 반응형 + pseudo 동일 속성 혼합

**원인**: StyleX는 같은 속성 안에서 pseudo selector와 media query를 동시에 처리할 수 없다.

**BAD**
```typescript
export const styles = stylex.create({
  btn: {
    backgroundColor: {
      default: color.primary,
      ':hover': color.primaryLight,        // pseudo
      [BP_MOBILE_ONLY]: color.gray200,     // 반응형 — 혼합 불가 에러
    },
  },
});
```

**GOOD**
```typescript
export const styles = stylex.create({
  btn: {
    backgroundColor: {
      default: color.primary,
      ':hover': color.primaryLight,        // pseudo만
    },
  },
  btnMobile: {
    backgroundColor: {
      default: color.gray200,             // 반응형은 별도 키
    },
  },
});

// 적용 시 분리
<button {...stylex.props(
  styles.btn,
  isMobile && styles.btnMobile,
)} />
```

---

## 에러 6: `default` 키 누락

**원인**: 반응형 객체에 `default` 키가 없으면 일부 환경에서 스타일이 적용되지 않는다.

**BAD**
```typescript
padding: {
  [BP_MOBILE_ONLY]: space.md,  // default 없음 → 모바일 외 환경에서 padding 없음
},
```

**GOOD**
```typescript
padding: {
  default: space.lg,           // 필수: 기본값
  [BP_MOBILE_ONLY]: space.md,
},
```

---

## 빠른 체크리스트

StyleX 코드 작성 후 확인:

- [ ] `import { color, space, fontSize, font, radius }` — 정확한 5개 이름
- [ ] breakpoint 상수가 현재 파일 안에 `const BP_...` 로 선언되어 있는가
- [ ] `{}` 빈 객체가 없는가 (조건부는 `null` 또는 별도 스타일 키)
- [ ] 반응형 객체에 `default:` 키가 있는가
- [ ] pseudo + 반응형을 같은 속성에 혼합하지 않았는가
- [ ] `stylex.props()` 패턴으로 조건부 스타일을 적용하는가
