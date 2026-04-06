# 서버 기반 동적 번역

사용자 생성 콘텐츠(리뷰, 채팅 등)를 서버 API로 실시간 번역하는 시스템.

## 정적 번역 vs 동적 번역

| 구분 | 정적 번역 (JSON) | 동적 번역 (API) |
|------|-----------------|----------------|
| 대상 | UI 텍스트, 버튼, 라벨 | 사용자 콘텐츠, 리뷰, 채팅 메시지 |
| 방식 | `'key'.tr()` (easy_localization) | `TranslationNotifier.translate()` |
| 타이밍 | 앱 시작 시 로드 | 사용자 요청 시 실시간 |
| 저장 | `assets/translations/*.json` | 서버 캐시 |
| 오프라인 | 지원 | 미지원 |

## TranslationRepository

```dart
class TranslationRepository {
  TranslationRepository(this._dio);
  final Dio _dio;

  /// 단일 텍스트 번역
  Future<TranslationResponse> translateSingle({
    required String text,
    required String targetLang,
    String? sourceLang,
    String type = 'GENERAL',
  }) async {
    final response = await _dio.post('/api/translations/single', data: {
      'text': text,
      'targetLang': targetLang,
      if (sourceLang != null) 'sourceLang': sourceLang,
      'type': type,
    });
    return TranslationResponse.fromJson(response.data['data']);
  }
}
```

## TranslationResponse 모델

```dart
class TranslationResponse {
  final bool success;
  final String? translatedText;

  const TranslationResponse({required this.success, this.translatedText});

  factory TranslationResponse.fromJson(Map<String, dynamic> json) {
    return TranslationResponse(
      success: json['success'] as bool? ?? false,
      translatedText: json['translatedText'] as String?,
    );
  }
}
```

## TranslationState + TranslationNotifier

```dart
class TranslationState {
  final bool isLoading;
  final String? translatedText;
  final String? error;

  const TranslationState({
    this.isLoading = false,
    this.translatedText,
    this.error,
  });

  TranslationState copyWith({
    bool? isLoading,
    String? translatedText,
    String? error,
    bool clearError = false,
    bool clearTranslatedText = false,
  }) {
    return TranslationState(
      isLoading: isLoading ?? this.isLoading,
      translatedText: clearTranslatedText ? null : (translatedText ?? this.translatedText),
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class TranslationNotifier extends StateNotifier<TranslationState> {
  final TranslationRepository _repository;

  TranslationNotifier(this._repository) : super(const TranslationState());

  /// 단일 텍스트 번역
  Future<String?> translate({
    required String text,
    required String targetLang,
    String? sourceLang,
    String type = 'GENERAL',
  }) async {
    state = state.copyWith(isLoading: true, clearError: true, clearTranslatedText: true);

    try {
      final response = await _repository.translateSingle(
        text: text,
        targetLang: targetLang,
        sourceLang: sourceLang,
        type: type,
      );

      if (response.success && response.translatedText != null) {
        state = state.copyWith(isLoading: false, translatedText: response.translatedText);
        return response.translatedText;
      } else {
        state = state.copyWith(isLoading: false, error: 'common.translation.failed'.tr());
        return null;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'common.translation.unavailable'.tr());
      return null;
    }
  }

  void reset() => state = const TranslationState();
}
```

## Provider 등록

```dart
final translationRepositoryProvider = Provider<TranslationRepository>((ref) {
  return TranslationRepository(ref.watch(dioProvider));
});

final translationProvider =
    StateNotifierProvider<TranslationNotifier, TranslationState>((ref) {
  return TranslationNotifier(ref.watch(translationRepositoryProvider));
});
```

## 사용 예시

```dart
// 위젯에서 번역 요청
class ReviewTranslateButton extends ConsumerWidget {
  final String originalText;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final translationState = ref.watch(translationProvider);

    return Column(
      children: [
        TextButton(
          onPressed: translationState.isLoading
              ? null
              : () async {
                  final localeTag = AppLocaleState.instance.localeTag;
                  await ref.read(translationProvider.notifier).translate(
                    text: originalText,
                    targetLang: localeTag,
                    type: 'REVIEW',
                  );
                },
          child: translationState.isLoading
              ? const CircularProgressIndicator()
              : Text('common.button.translate'.tr()),
        ),
        if (translationState.translatedText != null)
          Text(translationState.translatedText!),
        if (translationState.error != null)
          Text(translationState.error!, style: TextStyle(color: Colors.red)),
      ],
    );
  }
}
```

## 번역 타입

| type | 용도 |
|------|------|
| `GENERAL` | 일반 텍스트 |
| `REVIEW` | 리뷰 텍스트 (의료 용어 최적화) |
| `CHAT` | 채팅 메시지 |
