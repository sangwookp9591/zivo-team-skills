# LocaleInterceptor + API 로케일 전달

모든 API 요청에 현재 로케일과 국가코드를 자동으로 추가하는 Dio 인터셉터.

## LocaleInterceptor 구현

```dart
class LocaleInterceptor extends Interceptor {
  LocaleInterceptor();

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // AppLocaleState에서 locale tag 가져오기 (zh-CN, zh-TW 등 지원)
    final localeTag = AppLocaleState.instance.localeTag;

    // ResidenceCountryStorage에서 저장된 국가 코드 가져옴
    // 저장된 값이 없으면 AppLocaleState.countryCode 사용
    final savedCountryCode = await ResidenceCountryStorage.read();
    final countryCode = savedCountryCode ?? AppLocaleState.instance.countryCode;

    // 1. Query Parameters에 추가 (컨텐츠 필터링용)
    options.queryParameters = {
      ...options.queryParameters,
      'locale': localeTag,
      'countryCode': countryCode,
    };

    // 2. Request Body에 추가 (명시적 countryCode는 보존)
    if (options.data is Map<String, dynamic>) {
      final body = Map<String, dynamic>.from(
        options.data as Map<String, dynamic>,
      );
      body.putIfAbsent('countryCode', () => countryCode);
      options.data = body;
    }

    // 3. FormData 처리
    if (options.data is FormData) {
      final formData = options.data as FormData;
      final hasLocale = formData.fields.any((e) => e.key == 'languageCode');
      final hasCountry = formData.fields.any((e) => e.key == 'countryCode');
      if (!hasLocale) {
        formData.fields.add(MapEntry('languageCode', localeTag));
      }
      if (!hasCountry) {
        formData.fields.add(MapEntry('countryCode', countryCode));
      }
    }

    handler.next(options);
  }
}
```

## 전달되는 데이터

| 위치 | 키 | 값 예시 | 용도 |
|------|---|--------|------|
| Query Param | `locale` | `ko`, `zh-CN`, `en` | 서버 응답 언어 결정 |
| Query Param | `countryCode` | `KR`, `CN`, `US` | 컨텐츠 필터링 (국가별 노출) |
| Body | `countryCode` | `KR` | 회원가입 등 명시적 국가 설정 |
| FormData | `languageCode` | `ko` | 파일 업로드 시 언어 정보 |
| FormData | `countryCode` | `KR` | 파일 업로드 시 국가 정보 |

## AuthInterceptor의 X-Country-Code 헤더

AuthInterceptor도 별도로 국가코드를 헤더로 전달한다:

```dart
// AuthInterceptor.onRequest 내부
if (!options.headers.containsKey('X-Country-Code')) {
  // 1순위: 사용자 프로필에 저장된 국가코드
  final user = await UserProfileStorage.getUserData();
  final countryCode = user?['countryCode'];
  if (countryCode is String && countryCode.isNotEmpty) {
    options.headers['X-Country-Code'] = countryCode;
  }

  // 2순위: 시스템 로케일에서 추출
  if (!options.headers.containsKey('X-Country-Code')) {
    options.headers['X-Country-Code'] = _fallbackCountryCode();
  }
}
```

## countryCode 우선순위

```
1. ResidenceCountryStorage (사용자가 설정한 거주 국가)
2. AppLocaleState.countryCode (현재 로케일의 국가코드)
3. PlatformDispatcher.locale.countryCode (시스템 로케일)
4. 기본값 'KR' (AuthInterceptor fallback)
```

## locale vs countryCode 구분

| 항목 | locale | countryCode |
|------|--------|-------------|
| 용도 | UI 언어, 번역 텍스트 | 컨텐츠 필터링, 가격 표시 |
| 예시 | `ko`, `zh-CN`, `en` | `KR`, `CN`, `US` |
| 변경 시점 | 언어 설정 변경 시 | 거주 국가 설정 변경 시 |
| 저장소 | LocaleStorage | ResidenceCountryStorage |
