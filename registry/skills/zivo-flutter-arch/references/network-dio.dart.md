# AppDio 싱글턴 + 인터셉터 체인

Dio 기반 HTTP 클라이언트 설정. 싱글턴 패턴으로 앱 전체에서 하나의 인스턴스를 공유한다.

## AppDio 구조

```dart
class AppDio {
  AppDio._internal() {
    final options = BaseOptions(
      baseUrl: 'https://dev.zivo.travel/',
      connectTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 25),
      responseType: ResponseType.json,
      contentType: Headers.jsonContentType,
    );

    _dio = Dio(options);

    // 인터셉터 등록 순서 (onError는 역순 실행):
    // onRequest:  Auth -> ErrorHandling -> Locale -> RequestLog
    // onError:    RequestLog -> Locale -> ErrorHandling -> Auth
    _dio.interceptors.add(AuthInterceptor(_dio));
    _dio.interceptors.add(ErrorHandlingInterceptor());
    _dio.interceptors.add(LocaleInterceptor());
    _dio.interceptors.add(RequestLogInterceptor());
  }

  static AppDio? _instance;
  late final Dio _dio;

  static AppDio init() {
    _instance ??= AppDio._internal();
    return _instance!;
  }

  static AppDio get instance => _instance!;
  Dio get dio => _dio;
}
```

## Riverpod Provider

```dart
final dioProvider = Provider<Dio>((ref) {
  return AppDio.init().dio;
});
```

## 인터셉터 체인 실행 순서

```
[요청 전송 시 - onRequest 순방향]
Auth → ErrorHandling → Locale → RequestLog → 서버

[에러 발생 시 - onError 역순]
서버 → RequestLog → Locale → ErrorHandling → Auth
```

**이 순서가 중요한 이유**: ErrorHandling이 Locale보다 먼저 등록되어 있으므로, onError에서는 ErrorHandling이 Locale보다 나중에 실행된다. 이를 통해 Locale 처리 후 에러가 ErrorHandling으로 전달된다.

## 각 인터셉터 역할

| 인터셉터 | 역할 | 상세 |
|---------|------|------|
| `AuthInterceptor` | 토큰 관리 | Bearer 헤더 추가, 만료 시 갱신, 401 재시도, 강제 로그아웃 |
| `ErrorHandlingInterceptor` | 에러 래핑 | DioException -> AppNetworkException 변환, 알럿 표시, 복구 UI |
| `LocaleInterceptor` | 로케일 전달 | query param에 locale/countryCode 추가, body에 countryCode 추가 |
| `RequestLogInterceptor` | 요청 로깅 | 디버그용 요청/응답 로그 출력 |

## 신규 인터셉터 추가 가이드

1. `core/network/` 디렉토리에 인터셉터 파일 생성
2. `Interceptor` 클래스 상속, 필요한 메서드 오버라이드 (`onRequest`, `onResponse`, `onError`)
3. `AppDio._internal()`에서 적절한 위치에 등록

**위치 결정 기준**:
- 인증 관련 → Auth 다음
- 에러 변환 → ErrorHandling 위치
- 요청 데이터 추가 → Locale 위치 (Auth 이후)
- 로깅/모니터링 → 가장 마지막

## LocaleInterceptor 참고

LocaleInterceptor의 구현 상세는 `zivo-flutter-i18n/references/api-locale.dart.md`를 참조한다. 이 인터셉터는 모든 API 요청에 locale과 countryCode를 자동으로 추가한다.
