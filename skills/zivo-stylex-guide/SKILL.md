---
name: zivo-stylex-guide
description: ZIVO Admin StyleX 스타일링 가이드. StyleX(@stylexjs/stylex) 사용 시 토큰 명명 규칙, breakpoint 로컬 상수 필수 패턴, 조건부 스타일 적용, 빈 객체 금지 등 ZIVO_ADMIN 프로젝트 전용 지뢰를 다룬다. StyleX, 스타일, CSS, 반응형, breakpoint, 토큰, ZIVO_ADMIN 스타일링 작업 시 반드시 참조.
triggers:
  - stylex
  - StyleX
  - 스타일
  - CSS
  - 반응형
  - breakpoint
  - 토큰
  - ZIVO_ADMIN 스타일
  - tokens.stylex
  - stylex.create
  - stylex.props
metadata:
  author: ZIVO Team
  version: "1.0.0"
  tags:
    - stylex
    - css-in-js
    - admin
    - frontend
    - styling
---

# ZIVO Admin StyleX 스타일링 가이드

ZIVO_ADMIN 프로젝트에서 StyleX를 올바르게 사용하기 위한 가이드. 잘못 사용하면 빌드 에러 또는 런타임에서 스타일이 적용되지 않는다.

## References 라우팅

작업에 맞는 references 파일을 읽고 따른다.

| 작업 | 읽을 파일 |
|------|----------|
| 토큰 사용 (color, space, fontSize, font, radius) | `references/stylex-tokens.md` |
| 반응형 스타일, breakpoint 설정 | `references/stylex-responsive.md` |
| 에러 발생 시 원인 파악 및 해결 | `references/stylex-gotchas.md` |

---

## StyleX 사용 전 필수 체크

StyleX 코드를 작성하기 전에 아래 항목을 확인한다.

### 1. 토큰명 alias 금지

```typescript
// GOOD
import { color, space, fontSize, font, radius } from '@app/styles/tokens.stylex';

// BAD - alias 사용 금지
import { colors, spacing, fontSizes } from '@app/styles/tokens.stylex'; // 존재하지 않음
```

### 2. Breakpoint는 반드시 파일 내 로컬 상수로

```typescript
// GOOD - 파일 상단에 로컬 상수 선언
const BP_MOBILE_ONLY = '@media (max-width: 719px)';
const BP_TABLET = '@media (min-width: 720px)';
const BP_DESKTOP = '@media (min-width: 1280px)';

// BAD - 외부 파일에서 import → Invalid empty selector 에러
import { BP_MOBILE_ONLY } from '@app/styles/breakpoints';
```

### 3. 빈 객체 `{}` 금지

```typescript
// GOOD
styles.active  // 조건 없을 때는 null 사용
isActive && styles.active

// BAD
isActive ? styles.active : {}  // 빈 객체 금지
```

### 4. 조건부 스타일 스프레드 패턴

```tsx
// GOOD
<div {...stylex.props(
  styles.base,
  isActive && styles.active,
  ...(variant === 'primary' ? [styles.primary] : []),
)} />
```

---

## 기본 파일 구조

```typescript
import * as stylex from '@stylexjs/stylex';
import { color, space, fontSize, font, radius } from '@app/styles/tokens.stylex';

// breakpoint는 여기서 로컬 상수로 선언
const BP_MOBILE_ONLY = '@media (max-width: 719px)';
const BP_TABLET = '@media (min-width: 720px)';
const BP_DESKTOP = '@media (min-width: 1280px)';

export const styles = stylex.create({
  container: {
    backgroundColor: color.white,
    padding: {
      default: space.lg,
      [BP_MOBILE_ONLY]: space.md,
    },
  },
});
```
