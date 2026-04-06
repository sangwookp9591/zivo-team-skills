# [도메인 패턴] 인증 흐름

토큰 저장, 자동 갱신, 401 재시도, 강제 로그아웃 흐름.

## AuthTokenStorage (SecureStorage 기반)

```dart
class AuthTokenStorage {
  static const FlutterSecureStorage _storage = FlutterSecureStorage(
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock,
    ),
  );
  static AuthTokens? _cachedTokens;  // 메모리 캐시

  static Future<AuthTokens?> getTokens() async {
    if (_cachedTokens != null) return _cachedTokens;
    try {
      final accessToken = await _storage.read(key: 'access_token');
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (accessToken == null || refreshToken == null) return null;

      final tokens = AuthTokens(
        accessToken: accessToken,
        accessTokenExpiresAt: int.tryParse(
          await _storage.read(key: 'access_token_expires_at') ?? '',
        ) ?? 0,
        refreshToken: refreshToken,
        refreshTokenExpiresAt: int.tryParse(
          await _storage.read(key: 'refresh_token_expires_at') ?? '',
        ) ?? 0,
      );
      _cachedTokens = tokens;
      return tokens;
    } catch (_) {
      // Keychain 접근 불가 시 (잠금/백그라운드) 캐시만 사용
      return _cachedTokens;
    }
  }

  static Future<void> setTokens(AuthTokens tokens) async {
    _cachedTokens = tokens;
    await _storage.write(key: 'access_token', value: tokens.accessToken);
    await _storage.write(key: 'refresh_token', value: tokens.refreshToken);
    await _storage.write(
      key: 'access_token_expires_at',
      value: tokens.accessTokenExpiresAt.toString(),
    );
    await _storage.write(
      key: 'refresh_token_expires_at',
      value: tokens.refreshTokenExpiresAt.toString(),
    );
  }

  static Future<void> clearTokens() async {
    _cachedTokens = null;
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
    await _storage.delete(key: 'access_token_expires_at');
    await _storage.delete(key: 'refresh_token_expires_at');
  }
}
```

## AuthInterceptor 토큰 갱신 흐름

### onRequest - 사전 갱신

```
요청 전송 전
  ├── skipAuth == true? → 토큰 없이 전송
  ├── 토큰 존재? → Bearer 헤더 추가
  │   ├── 만료됨? → refreshToken으로 갱신
  │   │   ├── 성공 → 새 토큰으로 헤더 업데이트
  │   │   └── 실패 → 강제 로그아웃
  │   └── 유효 → 그대로 전송
  └── 토큰 없음? → 그대로 전송 (비로그인 API)
```

### onError 401 - 사후 갱신 + 재시도

```
401 응답 수신
  ├── skipAuth/retry == true? → 그대로 전달
  ├── refreshToken 없음? → 강제 로그아웃
  └── refreshToken 존재?
      ├── 갱신 성공 → 토큰 업데이트 → 원본 요청 재시도
      └── 갱신 실패 → 강제 로그아웃
```

### 동시 갱신 방지

```dart
Future<AuthTokens?>? _refreshFuture;

// 여러 요청이 동시에 401을 받아도 갱신은 1번만 실행
_refreshFuture ??= _refreshTokens(refreshToken);
refreshed = await _refreshFuture;
// ...
_refreshFuture = null;  // finally에서 초기화
```

## 강제 로그아웃 흐름

```dart
Future<void> _forceLogoutToLogin() async {
  // 1. 토큰 삭제
  await AuthTokenStorage.clearTokens();

  // 2. 로그인 상태 해제
  await AuthStorage.setLoggedIn(false);

  // 3. 사용자 프로필 삭제
  await UserProfileStorage.clear();

  // 4. Riverpod Provider 갱신 (UI 즉시 반영)
  globalContainer?.invalidate(tokenLoggedInProvider);

  // 5. 로그인 화면으로 이동
  AppRouter.router.push(AppRoutes.login);
}
```

**핵심**: `globalContainer?.invalidate()`로 Provider를 무효화하면 해당 Provider를 `watch`하는 모든 위젯이 즉시 리빌드된다.

## skipAuth 옵션

인증이 불필요한 API 호출 시:

```dart
await _dio.get(
  '/api/public/hospitals',
  options: Options(extra: {'skipAuth': true}),
);
```

## LogoutCleanup

로그아웃 시 정리해야 할 데이터:

```dart
class LogoutCleanup {
  static Future<void> execute() async {
    await AuthTokenStorage.clearTokens();
    await AuthStorage.setLoggedIn(false);
    await UserProfileStorage.clear();
    await LocationStorage.clear();
    // Provider 무효화
    globalContainer?.invalidate(tokenLoggedInProvider);
    globalContainer?.invalidate(favoriteListProvider);
  }
}
```
