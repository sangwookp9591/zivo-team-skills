---
name: zivo-flutter-arch
description: ZIVO Flutter 아키텍처 가이드 - Riverpod + Dio + go_router, Feature-based 구조. Flutter 프로젝트 구조, 신규 피처 생성, Repository/Provider 선언 위치, 네트워크 설정, 라우팅, 에러 처리를 다룬다. zivo-flutter-patterns와 함께 사용하면 각 계층에서 적합한 패턴을 안내한다.
triggers:
  - flutter
  - dart
  - riverpod
  - dio
  - go_router
  - feature 생성
  - 피처 구조
  - viewmodel
metadata:
  author: ZIVO Team
  version: "1.0.0"
  tags:
    - flutter
    - dart
    - architecture
    - mobile
---

# ZIVO Flutter Architecture Guide

Riverpod + Dio + go_router 기반 Flutter 앱. Feature-based 구조로 17개 피처 모듈을 관리한다.

**핵심 원칙**: 이 스킬은 **"어디에 무엇을 놓는가"(구조)**에 집중한다. **"어떤 Provider를 쓰는가"(판단)**는 `zivo-flutter-patterns` 스킬이 담당한다.

## 프로젝트 구조

```
lib/
├── core/           # 앱 전역 인프라 (auth, network, localization, router, firebase, tracking)
├── common/         # 공용 유틸/위젯/테마 (translation, payment, theme, widgets, utils)
├── data/           # 데이터 계층 (models/, repository/)
├── feature/        # 피처 모듈 (chat, hospital, procedure, reservation, sim, taxi 등 17개)
└── main.dart       # 앱 진입점
```

## 데이터 흐름

```
Page (View) -> Provider (ViewModel) -> Repository -> Dio -> API
     ↑                                                    ↓
     └──────────── 상태 변경 (Riverpod) ←── JSON 파싱 ←──┘
```

## References 라우팅

작업에 맞는 references 파일을 읽고 따른다.

| 작업 | 읽을 파일 |
|------|----------|
| 신규 피처 폴더 생성 | `references/feature-structure.dart.md` |
| Repository 클래스 생성 | `references/repository.dart.md` |
| Provider 선언 위치/파일 결정 | `references/provider.dart.md` |
| Dio 설정/인터셉터 추가 | `references/network-dio.dart.md` |
| 라우트 추가/딥링크 등록 | `references/router.dart.md` |
| 데이터 모델 생성 | `references/model.dart.md` |
| 에러 처리 추가 | `references/error-handling.dart.md` |
| Provider 유형 선택 판단 | `zivo-flutter-patterns/references/riverpod-patterns.dart.md` (외부 참조) |

---

## 핵심 규칙

1. **Feature 구조**: `feature/{name}/` 하위에 `detail/`, `list/`, `home/` 등 화면 단위로 분리. 각 화면은 `view/`, `view_model/`, `widgets/` 구조.
2. **Repository**: Dio 직접 주입, `response.data` 파싱, `DioException` 타입 체크.
3. **Provider 위치**: 전역은 `core/provider/`, 피처 로컬은 `feature/{name}/view_model/`.
4. **라우트**: `AppRoutes` 상수 추가 + `GoRoute` 등록 + 필요 시 `DeepLinkPattern` 등록.
5. **에러 처리**: `ErrorHandlingInterceptor`가 DioException을 `AppNetworkException`으로 래핑.

---

## 다른 스킬과의 병합 사용

### zivo-flutter-patterns와 함께 사용

`zivo-flutter-arch`가 계층 위치를 결정하고, `zivo-flutter-patterns`가 해당 위치의 구현 패턴을 제공한다.

| arch가 결정하는 것 | patterns가 제공하는 것 |
|-------------------|---------------------|
| Provider 파일 위치 (`feature/{name}/view_model/`) | Provider 유형 선택 (FutureProvider vs StateNotifierProvider) |
| Repository 폴더 구조 (`data/repository/`) | 커서 페이지네이션 구현 |
| 공통 위젯 위치 (`common/widgets/`) | BasePage, PrimaryButton 사용법 |
| 네트워크 인터셉터 위치 (`core/network/`) | 인증 흐름 (토큰 갱신/로그아웃) |

### zivo-flutter-i18n과 함께 사용

- `network-dio.dart.md`에서 인터셉터 체인의 `LocaleInterceptor` 슬롯을 언급한다. 구현 상세는 `zivo-flutter-i18n/references/api-locale.dart.md`를 참조한다.
- 로케일 관련 Provider(`localeProvider`)의 위치는 이 스킬에서, 사용 패턴은 `zivo-flutter-i18n`에서 다룬다.

---

## 신규 피처 생성 체크리스트

1. `feature/{name}/` 디렉토리 생성 (구조는 `feature-structure.dart.md` 참조)
2. 데이터 모델 생성 (`model.dart.md` 참조)
3. Repository 생성 + Provider 등록 (`repository.dart.md` 참조)
4. ViewModel Provider 생성 (`provider.dart.md`에서 위치, `zivo-flutter-patterns`에서 유형 선택)
5. Page 위젯 생성 (ConsumerStatefulWidget)
6. `AppRoutes` 상수 추가 + `GoRoute` 등록 (`router.dart.md` 참조)
7. 필요 시 딥링크 패턴 등록
8. 트래킹 이벤트 추가 (`zivo-flutter-patterns/references/firebase-tracking.dart.md` 참조)
