# 로케일 시스템 전체 구조

39개 로케일을 관리하는 4개 클래스의 역할과 구현.

## AppLocales - 정적 로케일 정의

```dart
class AppLocaleMetadata {
  final String name;      // "한국어", "English" 등
  final String timezone;  // "Asia/Seoul" 등
  final String flag;      // 국기 이모지

  const AppLocaleMetadata({
    required this.name,
    required this.timezone,
    required this.flag,
  });
}

class AppLocales {
  const AppLocales._();

  static const Locale defaultLocale = Locale('en');

  static const List<Locale> supportedLocales = [
    Locale('ko'),
    Locale('ja'),
    Locale('en'),
    Locale.fromSubtags(languageCode: 'zh', countryCode: 'CN'),
    Locale.fromSubtags(languageCode: 'zh', countryCode: 'TW'),
    Locale.fromSubtags(languageCode: 'zh', countryCode: 'HK'),
    // ... 39개 전체
  ];

  static const List<String> supportedTags = [
    'ko', 'ja', 'en', 'zh-CN', 'zh-TW', 'zh-HK',
    'en-SG', 'th', 'id', 'en-AU', 'en-CA', 'ms', 'en-GB',
    'mn', 'vi', 'fil',
    'ru', 'ru-KZ', 'ru-UZ', 'ru-KG', 'ru-TJ', 'ru-AM', 'ru-BY', 'ru-AZ', 'ru-MD',
    'ar', 'ar-AE', 'ar-QA', 'ar-KW', 'ar-BH', 'ar-OM', 'ar-YE', 'ar-IQ', 'ar-JO', 'ar-LB', 'ar-PS', 'ar-EG',
    'he-IL', 'fa-IR',
  ];

  static const Map<String, AppLocaleMetadata> metadata = {
    'ko': AppLocaleMetadata(name: '한국어', timezone: 'Asia/Seoul', flag: '🇰🇷'),
    'ja': AppLocaleMetadata(name: '日本語', timezone: 'Asia/Tokyo', flag: '🇯🇵'),
    'en': AppLocaleMetadata(name: 'English', timezone: 'America/New_York', flag: '🇺🇸'),
    // ... 39개 전체
  };
}
```

### 로케일 정규화 (normalize)

```dart
static Locale normalize(Locale locale) {
  // 1단계: 히브리어(he), 페르시아어(fa) -> 아랍어(ar) 폴백
  const _arabicFallbackLanguages = {'he', 'fa'};
  if (_arabicFallbackLanguages.contains(locale.languageCode)) {
    return const Locale('ar');
  }

  // 2단계: 정확히 일치하는 로케일 검색
  for (final supported in supportedLocales) {
    if (supported == locale) return supported;
  }

  // 3단계: 언어코드 + 국가코드 매칭 (대소문자 무시)
  final languageCode = locale.languageCode;
  final countryCode = locale.countryCode;
  if (countryCode != null && countryCode.isNotEmpty) {
    for (final supported in supportedLocales) {
      if (supported.languageCode == languageCode &&
          supported.countryCode?.toLowerCase() == countryCode.toLowerCase()) {
        return supported;
      }
    }
  }

  // 4단계: 언어코드만 매칭 (국가코드 없는 것 우선)
  for (final supported in supportedLocales) {
    if (supported.languageCode == languageCode &&
        (supported.countryCode == null || supported.countryCode!.isEmpty)) {
      return supported;
    }
  }

  // 5단계: 언어코드만 매칭 (국가코드 있는 것도 허용)
  for (final supported in supportedLocales) {
    if (supported.languageCode == languageCode) return supported;
  }

  // 6단계: 기본 로케일
  return defaultLocale;
}
```

### 태그 변환

```dart
static String toTag(Locale locale) {
  final country = locale.countryCode;
  if (country == null || country.isEmpty) return locale.languageCode;
  return '${locale.languageCode}-$country';
}

static Locale fromTag(String tag) {
  final normalized = tag.replaceAll('_', '-');
  final parts = normalized.split('-');
  if (parts.length >= 2) {
    return normalize(Locale.fromSubtags(languageCode: parts[0], countryCode: parts[1]));
  }
  return normalize(Locale(normalized));
}
```

## LocaleNotifier - Riverpod 상태

```dart
final localeProvider = NotifierProvider<LocaleNotifier, Locale>(
  LocaleNotifier.new,
);

class LocaleNotifier extends Notifier<Locale> {
  bool _initialized = false;
  bool get isInitialized => _initialized;

  @override
  Locale build() => AppLocaleState.instance.locale;

  void initialize(Locale locale, {String? countryCodeOverride}) {
    if (_initialized) return;
    AppLocaleState.instance.setLocale(locale, countryCodeOverride: countryCodeOverride);
    state = AppLocaleState.instance.locale;
    _initialized = true;
  }

  Future<void> setLocale(Locale locale, {String? saveTag, String? countryCodeOverride}) async {
    AppLocaleState.instance.setLocale(locale, countryCodeOverride: countryCodeOverride);
    state = AppLocaleState.instance.locale;
    _initialized = true;
  }
}
```

## AppLocaleState - 동기 접근 싱글턴

ref 없이 어디서든 현재 로케일에 접근할 수 있는 메모리 캐시. Interceptor 등에서 사용.

```dart
class AppLocaleState {
  AppLocaleState._();
  static final AppLocaleState instance = AppLocaleState._();

  Locale _locale = const Locale('en');
  String? _countryCodeOverride;

  Locale get locale => _locale;

  String get localeTag {
    final lang = _locale.languageCode;
    final cc = _locale.countryCode;
    // zh 계열: "zh-CN" 형태로 전송
    if (lang == 'zh' && cc != null && cc.isNotEmpty) return 'zh-$cc';
    return lang;
  }

  String get countryCode {
    final override = _countryCodeOverride;
    if (override != null && override.isNotEmpty) return override;
    final cc = _locale.countryCode;
    if (cc != null && cc.isNotEmpty) return cc;
    return PlatformDispatcher.instance.locale.countryCode ?? '';
  }

  void setLocale(Locale locale, {String? countryCodeOverride}) {
    _locale = locale;
    _countryCodeOverride = countryCodeOverride;
  }
}
```

## LocaleSync - easy_localization 동기화

Riverpod의 localeProvider와 easy_localization의 context.locale을 동기화하는 위젯.

```dart
class LocaleSync extends ConsumerStatefulWidget {
  const LocaleSync({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<LocaleSync> createState() => _LocaleSyncState();
}

class _LocaleSyncState extends ConsumerState<LocaleSync> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initializeLocale());
  }

  Future<void> _initializeLocale() async {
    final storedTag = await LocaleStorage.readTag();
    final locale = storedTag != null
        ? AppLocales.fromTag(storedTag)
        : AppLocales.normalize(WidgetsBinding.instance.platformDispatcher.locale);
    ref.read(localeProvider.notifier).initialize(locale);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<Locale>(localeProvider, (previous, next) {
      if (context.locale != next) context.setLocale(next);
    });
    return widget.child;
  }
}
```

## LocaleStorage - 영속화

```dart
class LocaleStorage {
  static const String _key = 'app_locale';

  static Future<String?> readTag() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_key);
  }

  static Future<void> writeTag(String tag) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, tag);
  }
}
```

---

## 새 로케일 추가 체크리스트

1. **AppLocales.supportedLocales**에 `Locale` 추가
2. **AppLocales.supportedTags**에 태그 문자열 추가
3. **AppLocales.metadata**에 `AppLocaleMetadata` 추가 (name, timezone, flag)
4. **assets/translations/{tag}.json** 번역 파일 생성 (기존 언어 파일 복사 후 번역)
5. **pubspec.yaml** assets 섹션에 번역 파일 경로 확인
6. (선택) RTL 언어인 경우 `rtl-support.dart.md` 참조하여 RTL 대응 확인
7. (선택) 약관 파일 필요 시 `assets/terms/{tag}/` 디렉토리 생성
