---
name: zivo-flutter-patterns
description: ZIVO Flutter 디자인 패턴 가이드 - Riverpod 상태관리 패턴 선택, 커서 페이지네이션, UI 위젯, 인증 흐름, 결제, 트래킹, 테스트. zivo-flutter-arch와 함께 사용하면 계층 구조 안에서 패턴 적용 위치를 안내한다.
triggers:
  - 상태관리
  - state management
  - 페이지네이션
  - infinite scroll
  - 공통 위젯
  - auth flow
  - 인증
  - 결제
  - payment
  - 트래킹
  - tracking
  - 테스트
  - widget test
metadata:
  author: ZIVO Team
  version: "1.0.0"
  tags:
    - flutter
    - design-patterns
    - riverpod
    - testing
---

# ZIVO Flutter Design Patterns

Flutter 프로젝트에서 재사용 가능한 패턴 가이드. 패턴 이론보다 **"언제, 왜 쓰는가"**와 **"정말 필요한가"**에 집중한다.

## 다른 스킬과의 병합 사용

### zivo-flutter-arch와 함께 사용

`zivo-flutter-arch` 스킬이 계층 위치를 결정하고, 이 스킬이 해당 위치의 구현 패턴을 제공한다.

| 패턴 | 계층 위치 | 해당 arch reference |
|------|----------|---------------------|
| FutureProvider.family.autoDispose | `feature/{name}/view_model/` | `provider.dart.md` |
| CursorListNotifier | `feature/{name}/view_model/` | `provider.dart.md` |
| NotifierProvider (전역) | `core/provider/` | `provider.dart.md` |
| GlobalContainer | `core/provider/` | `provider.dart.md` |
| BasePage/PrimaryButton | `common/widgets/` | `feature-structure.dart.md` |
| AuthInterceptor | `core/network/` | `network-dio.dart.md` |
| TrackingService | `core/tracking/` | - |
| Widget Test | `test/feature/{name}/` | `feature-structure.dart.md` |

### zivo-flutter-i18n과 함께 사용

- locale 변경 시 자동 재조회: `riverpod-patterns.dart.md`의 "locale 의존 Provider" 섹션
- 번역 키 사용: `'key'.tr()` 패턴은 `translation-keys.md` 참조
- 동적 번역: `TranslationNotifier`는 StateNotifier 패턴의 실 사례

### 병합 사용 규칙

1. **아키텍처 스킬이 위치를 결정**하고, 패턴 스킬이 해당 위치의 구현 방법을 제공한다
2. 기존 공통 패턴(CursorListNotifier 등)이 있으면 **중복 구현하지 않는다**
3. 패턴 적용 후 **코드가 아키텍처 스킬의 계층 규칙을 위반하지 않는지** 확인한다

---

## References 라우팅

| 작업 | 읽을 파일 |
|------|----------|
| Provider 유형 선택 (NotifierProvider vs StateNotifierProvider 등) | `references/riverpod-patterns.dart.md` |
| 목록 + 무한스크롤 구현 | `references/cursor-pagination.dart.md` |
| 공통 위젯 사용/생성 | `references/ui-widgets.dart.md` |
| 인증 관련 구현 | `references/auth-flow.dart.md` |
| 결제 연동 | `references/payment.dart.md` |
| 트래킹 이벤트 추가 | `references/firebase-tracking.dart.md` |
| 테스트 작성 | `references/testing.dart.md` |

---

## 패턴 선택 매트릭스

| 상황 | 추천 패턴 | Reference |
|------|----------|-----------|
| 단건 데이터 조회 (상세 페이지) | FutureProvider.family.autoDispose | riverpod-patterns |
| 목록 + 무한스크롤 | CursorListNotifier + StateNotifierProvider | cursor-pagination |
| 전역 상태 (로그인, 로케일) | NotifierProvider | riverpod-patterns |
| 단순 DI (repository, dio) | Provider | riverpod-patterns |
| 폼 입력 + 유효성 검사 | StateNotifier + 폼 위젯 | riverpod-patterns |
| 페이지 레이아웃 기본 틀 | BasePage / BasePageWithAppBar | ui-widgets |
| 인증 필요 화면 진입 | AuthInterceptor 401 -> 로그인 리다이렉트 | auth-flow |
| 결제 플로우 | EximbayPaymentLauncher / NicePay | payment |
| 화면 전환 트래킹 | TrackingRouteObserver | firebase-tracking |
| 기능 테스트 | Widget Test + ProviderScope | testing |

---

## 오버엔지니어링 판단 기준

패턴을 적용하기 전에 아래 체크리스트를 반드시 확인한다. 하나라도 해당하면 패턴 적용을 재고한다.

### 적용하지 않는 경우 (YAGNI)

| 상황 | 이유 | 대안 |
|------|------|------|
| 상태가 위젯 내부에서만 사용 | Provider 오버헤드가 가독성을 해침 | `StatefulWidget` 내 `setState` 유지 |
| Provider가 1개 화면에서만 사용되고 재사용 계획 없음 | autoDispose로도 과도 | 화면 내 로컬 상태 |
| 리스트가 20개 이하 고정 데이터 | 페이지네이션 불필요 | `FutureProvider`로 한번에 로드 |
| 에러 표시가 단순 Toast 1줄 | 복잡한 에러 처리 불필요 | `catch` -> `AppAlert.showError()` |
| 위젯이 1곳에서만 사용 | 공통 위젯으로 추출 불필요 | 인라인 위젯 유지 |

### 적용하는 경우

| 상황 | 근거 |
|------|------|
| 같은 데이터를 3개 이상 화면에서 공유 | Provider로 캐싱하면 중복 API 호출 방지 |
| 목록이 계속 늘어나고 성능이 중요 | CursorListNotifier로 무한스크롤 |
| 여러 위젯이 동일한 상태에 반응 | NotifierProvider로 중앙 상태 관리 |
| 위젯 트리 밖에서 상태 접근 필요 | GlobalContainer 패턴 |
| 테스트에서 의존성 주입 필요 | Provider로 감싸서 override |

### 판단 플로우

```
상태 관리가 필요한가?
  → 위젯 1개에서만 사용? (YES면 setState, STOP)
  → 2~3개 위젯에서 공유? (callback 전달로 충분하면 STOP)
  → 앱 전역 또는 3개 이상 화면? (Provider 사용, GO)
  → 목록 + 페이지네이션? (CursorListNotifier, GO)
```

**패턴을 추천할 때 반드시 오버엔지니어링 판단을 함께 제시한다.**
