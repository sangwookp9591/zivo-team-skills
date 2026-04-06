# 에러 처리 체계

DioException을 사용자 친화적 에러로 변환하는 시스템. `ErrorHandlingInterceptor`가 자동으로 처리한다.

## AppNetworkException

```dart
enum AppNetworkErrorType {
  timeout,      // 연결/전송/수신 타임아웃
  connection,   // 네트워크 연결 불가
  badResponse,  // 4xx/5xx 서버 응답
  cancel,       // 요청 취소
  unknown,      // 알 수 없는 에러
}

class AppNetworkException implements Exception {
  final AppNetworkErrorType type;
  final int? statusCode;
  final String message;
  final dynamic data;

  const AppNetworkException({
    required this.type,
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() => 'AppNetworkException($type, $statusCode, $message)';
}
```

## ErrorHandlingInterceptor 동작 흐름

```
DioException 발생
  ├── cancel? → 바로 전달 (알럿 없음)
  ├── timeout/connection? → NetworkRecovery UI 표시 → Splash 이동
  ├── 5xx? → 에러 페이지 이동
  └── 기타? → 서버 메시지 또는 기본 에러 메시지 Toast 표시
```

### DioExceptionType 매핑

```dart
AppNetworkException _wrapError(DioException err) {
  switch (err.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return AppNetworkException(
        type: AppNetworkErrorType.timeout,
        message: 'errors.network.timeout'.tr(),
      );
    case DioExceptionType.connectionError:
      return AppNetworkException(
        type: AppNetworkErrorType.connection,
        message: 'errors.network.connection'.tr(),
      );
    case DioExceptionType.badResponse:
      return _mapStatusError(err);  // 상태 코드별 세분화
    case DioExceptionType.cancel:
      return AppNetworkException(
        type: AppNetworkErrorType.cancel,
        message: 'errors.network.cancel'.tr(),
      );
    case DioExceptionType.unknown:
      return AppNetworkException(
        type: AppNetworkErrorType.unknown,
        message: 'errors.network.unknown'.tr(),
      );
  }
}
```

### HTTP 상태 코드별 처리

| 상태 코드 | 처리 |
|----------|------|
| 401 | `errors.network.unauthorized` 메시지 (AuthInterceptor에서 토큰 갱신 시도) |
| 403 | `errors.network.forbidden` 메시지 |
| 404 | `errors.network.notFound` 메시지 |
| 5xx | `errors.network.server` 메시지 + 에러 페이지 이동 |
| 기타 | `errors.network.default` 메시지 |

## 서버 에러 메시지 추출

서버가 `errorCode`를 반환하면 번역된 메시지를 우선 사용:

```dart
String? _extractServerMessage(DioException err) {
  final data = err.response?.data;
  if (data is Map<String, dynamic>) {
    // 에러 코드가 있으면 번역 키로 변환
    final errorCode = data['errorCode'];
    if (errorCode is String && errorCode.isNotEmpty) {
      final translatedKey = 'errorCodes.$errorCode';
      final translated = translatedKey.tr();
      if (translated != translatedKey) return translated;
    }
    // 번역이 없으면 서버 메시지 직접 사용
    final message = data['message'];
    if (message is String && message.isNotEmpty) return message;
  }
  return null;
}
```

## suppress 옵션

Repository에서 에러 처리를 커스터마이즈할 때 `extra`에 전달:

```dart
// 에러 알럿을 표시하지 않음 (직접 처리)
options: Options(extra: {'suppressErrorAlert': true})

// 에러 로그를 출력하지 않음
options: Options(extra: {'suppressErrorLog': true})

// 네트워크 복구 UI를 표시하지 않음
options: Options(extra: {'suppressRecovery': true})
```

## NetworkRecovery 패턴

타임아웃/연결 에러 발생 시 복구 UI를 표시하고 Splash로 이동:

```dart
class NetworkRecovery {
  static final ValueNotifier<bool> isRecovering = ValueNotifier<bool>(false);
  static int _retryCount = 0;

  static bool start({String? message}) {
    if (isRecovering.value) return true;
    if (_retryCount >= 1) return false;  // 1회 초과 시 앱 종료
    isRecovering.value = true;
    return true;
  }

  static void clear() {
    isRecovering.value = false;
    _retryCount = 0;
  }

  static void markRetried() {
    _retryCount += 1;
  }
}
```

## 에러 표시 방법

| 에러 유형 | 표시 방법 | 코드 |
|----------|----------|------|
| 일반 API 에러 | Toast | `AppAlert.showError(message)` |
| 서버 에러 (5xx) | 에러 페이지 이동 | `AppRouter.router.push('/error?type=server')` |
| 네트워크 불안정 | 복구 UI + Splash 이동 | `NetworkRecovery.start()` |
| 요청 취소 | 무시 | 알럿/로깅 없음 |

## 에러 번역 키 구조

```json
{
  "errors": {
    "network": {
      "timeout": "연결 시간이 초과되었습니다",
      "connection": "네트워크 연결을 확인해주세요",
      "unauthorized": "로그인이 필요합니다",
      "forbidden": "접근 권한이 없습니다",
      "notFound": "요청한 정보를 찾을 수 없습니다",
      "server": "서버에 문제가 발생했습니다",
      "default": "오류가 발생했습니다"
    }
  },
  "errorCodes": {
    "HOSPITAL_NOT_FOUND": "병원을 찾을 수 없습니다",
    "RESERVATION_CONFLICT": "이미 예약된 시간입니다"
  }
}
```
