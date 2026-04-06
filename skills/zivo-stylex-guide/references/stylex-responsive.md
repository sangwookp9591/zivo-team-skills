# StyleX 반응형 패턴

## Breakpoint 로컬 상수 — 왜 필수인가

StyleX는 빌드 타임에 정적 분석으로 CSS를 생성한다. 외부 파일에서 breakpoint 문자열을 import하면 빌드 타임에 값을 추론할 수 없어 `Invalid empty selector` 에러가 발생한다.

**반드시 각 파일 상단에 로컬 상수로 선언한다.**

---

## 표준 Breakpoint 상수 3종

모든 `.stylex.ts` 파일에 동일하게 복사해서 사용한다.

```typescript
const BP_MOBILE_ONLY = '@media (max-width: 719px)';
const BP_TABLET = '@media (min-width: 720px)';
const BP_DESKTOP = '@media (min-width: 1280px)';
```

| 상수명 | 범위 | 용도 |
|--------|------|------|
| `BP_MOBILE_ONLY` | 0 ~ 719px | 모바일 전용 스타일 |
| `BP_TABLET` | 720px ~ | 태블릿 이상 |
| `BP_DESKTOP` | 1280px ~ | 데스크탑 이상 |

---

## 반응형 속성 작성법

반응형 값은 `default` 키 + breakpoint 키로 구성한다. `default`가 없으면 에러가 발생한다.

```typescript
export const styles = stylex.create({
  container: {
    padding: {
      default: space.lg,           // 필수: 기본값
      [BP_MOBILE_ONLY]: space.md,  // 모바일에서 override
    },
    borderRadius: {
      default: radius.lg,
      [BP_MOBILE_ONLY]: radius.md,
    },
    fontSize: {
      default: fontSize.md,
      [BP_DESKTOP]: fontSize.lg,
    },
  },
});
```

---

## pseudo + 반응형 혼합 금지 규칙

동일한 CSS 속성에 pseudo(`:hover`, `:focus` 등)와 반응형을 동시에 사용하면 StyleX가 처리하지 못한다.

**BAD** — 같은 속성에 pseudo + 반응형 혼합

```typescript
export const styles = stylex.create({
  card: {
    // transform에 pseudo(:hover)와 반응형(BP_MOBILE_ONLY)을 동시에 사용 → 에러
    transform: {
      default: 'none',
      ':hover': 'translateY(-2px)',       // pseudo
      [BP_MOBILE_ONLY]: 'scale(0.98)',    // 반응형 — 혼합 불가
    },
  },
});
```

**GOOD** — 별도 스타일 키로 분리

```typescript
export const styles = stylex.create({
  card: {
    // hover 효과는 별도 키
    transform: {
      default: 'none',
      ':hover': 'translateY(-2px)',
    },
  },
  cardMobile: {
    // 반응형은 별도 키
    transform: {
      default: 'none',
      [BP_MOBILE_ONLY]: 'scale(0.98)',
    },
  },
});

// 사용 시 조건부로 결합
<div {...stylex.props(styles.card, isMobile && styles.cardMobile)} />
```

또는 pseudo 없이 반응형만 처리:

```typescript
export const styles = stylex.create({
  card: {
    transform: {
      default: 'none',
      ':hover': 'translateY(-2px)',  // pseudo만
    },
    // 반응형이 필요하면 다른 속성에서 처리하거나 별도 키로 분리
  },
});
```

---

## 실제 프로젝트 예시

```typescript
import * as stylex from '@stylexjs/stylex';
import { color, space, radius } from '@app/styles/tokens.stylex';

// 로컬 상수 선언 (외부 import 금지)
const BP_MOBILE_ONLY = '@media (max-width: 719px)';
const BP_TABLET = '@media (min-width: 720px)';
const BP_DESKTOP = '@media (min-width: 1280px)';

export const styles = stylex.create({
  statCardWrapper: {
    cursor: 'pointer',
    transition: 'transform 0.2s',
    transform: {
      default: 'none',
      ':hover': 'translateY(-2px)',  // pseudo만 사용
    },
    backgroundColor: color.white,
    borderRadius: {
      default: radius.lg,
      [BP_MOBILE_ONLY]: radius.md,
    },
    padding: {
      default: space.lg,
      [BP_MOBILE_ONLY]: space.md,
    },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: color.gray200,
  },
});
```
