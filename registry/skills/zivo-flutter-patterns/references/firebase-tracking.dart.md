# [인프라 패턴] Firebase + Airbridge 트래킹

Firebase Analytics, Crashlytics, FCM, Airbridge 연동 패턴.

## AnalyticsService (Firebase Analytics)

```dart
class AnalyticsService {
  static final FirebaseAnalytics _analytics = FirebaseAnalytics.instance;

  /// 화면 조회 이벤트
  static Future<void> logScreenView(String screenName) async {
    await _analytics.logScreenView(screenName: screenName);
  }

  /// 커스텀 이벤트
  static Future<void> logEvent({
    required String name,
    Map<String, Object>? parameters,
  }) async {
    await _analytics.logEvent(name: name, parameters: parameters);
  }

  /// 사용자 속성 설정
  static Future<void> setUserProperty({
    required String name,
    required String? value,
  }) async {
    await _analytics.setUserProperty(name: name, value: value);
  }
}
```

## TrackingService (Airbridge + 커스텀)

```dart
class TrackingService {
  /// 화면 조회 트래킹
  static void trackScreenView(String screenName) {
    AnalyticsService.logScreenView(screenName);
    AirbridgeService.trackScreenView(screenName);
  }

  /// 이벤트 트래킹
  static void trackEvent(String eventName, {Map<String, dynamic>? params}) {
    AnalyticsService.logEvent(name: eventName, parameters: params);
    AirbridgeService.trackEvent(eventName, params: params);
  }

  /// 전환 이벤트 (예약 완료, 결제 완료 등)
  static void trackConversion(String eventName, {double? revenue}) {
    AnalyticsService.logEvent(name: eventName, parameters: {
      if (revenue != null) 'revenue': revenue,
    });
    AirbridgeService.trackConversion(eventName, revenue: revenue);
  }
}
```

## TrackingRouteObserver (자동 화면 트래킹)

go_router의 observer로 등록하여 화면 전환 시 자동 트래킹.

```dart
class TrackingRouteObserver extends NavigatorObserver {
  @override
  void didPush(Route route, Route? previousRoute) {
    _trackScreenView(route);
  }

  @override
  void didReplace({Route? newRoute, Route? oldRoute}) {
    if (newRoute != null) _trackScreenView(newRoute);
  }

  void _trackScreenView(Route route) {
    final name = route.settings.name;
    if (name != null && name.isNotEmpty) {
      final screenName = TrackingRouteConfig.getScreenName(name);
      TrackingService.trackScreenView(screenName);
    }
  }
}

// AppRouter에 등록
static final GoRouter router = GoRouter(
  observers: [
    TrackingRouteObserver(),
  ],
  // ...
);
```

## TrackingRouteConfig

라우트 경로를 트래킹용 화면명으로 매핑.

```dart
class TrackingRouteConfig {
  static const Map<String, String> _screenNames = {
    '/main': 'home',
    '/hospitals': 'hospital_list',
    '/hospitals/:id': 'hospital_detail',
    '/procedures': 'procedure_list',
    '/procedures/:id': 'procedure_detail',
    '/reservations': 'reservation_list',
    '/settings': 'settings',
  };

  static String getScreenName(String routePath) {
    return _screenNames[routePath] ?? routePath;
  }
}
```

## AirbridgeService

```dart
class AirbridgeService {
  static Future<void> initialize() async {
    // Airbridge SDK 초기화
  }

  static void trackScreenView(String screenName) {
    // Airbridge 화면 조회 이벤트
  }

  static void trackEvent(String eventName, {Map<String, dynamic>? params}) {
    // Airbridge 커스텀 이벤트
  }

  static void trackConversion(String eventName, {double? revenue}) {
    // Airbridge 전환 이벤트
  }
}
```

## FCM 서비스 (푸시 알림)

```dart
class FcmService {
  static Future<void> initialize() async {
    // 1. 알림 권한 요청
    await FirebaseMessaging.instance.requestPermission();

    // 2. FCM 토큰 획득
    final token = await FirebaseMessaging.instance.getToken();

    // 3. 포그라운드 메시지 핸들러
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 4. 백그라운드 메시지 핸들러
    FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);

    // 5. 알림 탭 핸들러 (앱이 백그라운드/종료 상태에서 알림 탭)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);
  }

  static void _handleForegroundMessage(RemoteMessage message) {
    // 로컬 알림으로 표시 (flutter_local_notifications)
    LocalNotificationService.show(message);
  }
}
```

## 신규 트래킹 이벤트 추가 가이드

1. `TrackingService`에 이벤트 메서드 추가 (또는 기존 `trackEvent` 사용)
2. `TrackingRouteConfig`에 화면명 매핑 추가 (화면 이벤트인 경우)
3. 호출하는 곳에서 `TrackingService.trackEvent('event_name')` 호출
4. 전환 이벤트(매출 관련)는 `trackConversion` 사용

## 파일 위치

```
core/tracking/
├── tracking_service.dart         # 메인 트래킹 서비스
├── tracking_route_observer.dart  # 자동 화면 트래킹
├── tracking_route_config.dart    # 라우트 -> 화면명 매핑
├── tracking_config.dart          # 트래킹 설정
├── tracking_repository.dart      # 트래킹 데이터 저장
└── airbridge_service.dart        # Airbridge SDK 래퍼

core/firebase/
├── analytics_service.dart        # Firebase Analytics
└── fcm_service.dart              # Firebase Cloud Messaging
```
