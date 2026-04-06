# go_router 라우팅 + 딥링크

go_router 기반 라우팅 시스템. AppRoutes 상수 관리, GoRoute 등록, 딥링크 처리를 다룬다.

## AppRoutes 상수

```dart
class AppRoutes {
  const AppRoutes._();

  // 메인
  static const String splash = '/';
  static const String main = '/main';

  // 병원
  static const String hospitalList = '/hospitals';
  static const String hospitalDetail = '/hospitals/:id';

  // 시술
  static const String procedureList = '/procedures';
  static const String procedureDetail = '/procedures/:id';

  // 마이페이지
  static const String login = '/login';
  static const String signup = '/signup';
  static const String settings = '/settings';
  static const String settingsLanguage = '/settings/language';

  // 에러
  static const String error = '/error';
}
```

## GoRoute 등록 템플릿

### pathParameters 사용 (상세 페이지)

```dart
GoRoute(
  path: AppRoutes.hospitalDetail,
  builder: (context, state) {
    final hospitalId = int.parse(state.pathParameters['id']!);
    return HospitalDetailPage(hospitalId: hospitalId);
  },
),
```

### queryParameters 사용 (검색/필터)

```dart
GoRoute(
  path: AppRoutes.hospitalList,
  builder: (context, state) {
    final category = state.uri.queryParameters['category'];
    return HospitalListPage(category: category);
  },
),
```

### extra 사용 (객체 전달)

```dart
// 등록
GoRoute(
  path: AppRoutes.reservationDetail,
  builder: (context, state) {
    final reservation = state.extra as Reservation;
    return ReservationDetailPage(reservation: reservation);
  },
),

// 이동
context.push(AppRoutes.reservationDetail, extra: reservation);
```

## AppRouter 구조

```dart
class AppRouter {
  static final GlobalKey<NavigatorState> rootNavigatorKey =
      GlobalKey<NavigatorState>();

  static final GoRouter router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    observers: [
      AppRouter.routeObserver,
      TrackingRouteObserver(),
    ],
    routes: [
      GoRoute(path: AppRoutes.splash, builder: (_, __) => const SplashPage()),
      // ... 모든 라우트 등록
    ],
    errorBuilder: (context, state) => const ErrorPage(),
  );

  static final RouteObserver<ModalRoute<void>> routeObserver =
      RouteObserver<ModalRoute<void>>();
}
```

## 딥링크 처리

### DeepLinkPattern 추상 클래스

```dart
abstract class DeepLinkPattern {
  bool match(Uri uri);
  Future<void> handle(Uri uri);
}
```

### 구현 예시

```dart
class HospitalDetailPattern extends DeepLinkPattern {
  // /hospitals/123 형태 매칭
  static final RegExp _regex = RegExp(r'^/hospitals/(\d+)$');

  @override
  bool match(Uri uri) => _regex.hasMatch(uri.path);

  @override
  Future<void> handle(Uri uri) async {
    final match = _regex.firstMatch(uri.path)!;
    final hospitalId = int.parse(match.group(1)!);
    AppRouter.router.push('${AppRoutes.hospitalDetail}'.replaceFirst(':id', '$hospitalId'));
  }
}
```

### DeepLinkRouter에 등록

```dart
class DeepLinkRouter {
  static final List<DeepLinkPattern> patterns = [
    HospitalDetailPattern(),
    ProcedureDetailPattern(),
    PasswordResetPattern(),
  ];

  static Future<bool> handle(Uri uri) async {
    for (final pattern in patterns) {
      if (pattern.match(uri)) {
        await pattern.handle(uri);
        return true;
      }
    }
    return false;
  }
}
```

## TrackingRouteObserver 연동

화면 전환 시 자동으로 트래킹 이벤트를 발생시킨다:

```dart
class TrackingRouteObserver extends NavigatorObserver {
  @override
  void didPush(Route route, Route? previousRoute) {
    _trackScreenView(route);
  }

  void _trackScreenView(Route route) {
    final name = route.settings.name;
    if (name != null) {
      TrackingService.trackScreenView(name);
    }
  }
}
```

## 라우트 추가 체크리스트

1. `AppRoutes`에 상수 추가
2. `AppRouter.router`의 `routes` 배열에 `GoRoute` 등록
3. 필요 시 `DeepLinkRouter.patterns`에 딥링크 패턴 등록
4. 트래킹 설정 (`TrackingRouteConfig`에 화면명 매핑)
