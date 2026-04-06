# Provider 선언 위치와 폴더 규칙

Provider의 **유형 선택**(FutureProvider vs StateNotifierProvider 등)은 `zivo-flutter-patterns/references/riverpod-patterns.dart.md`를 참조한다. 이 문서는 **어디에 Provider를 선언하는가**만 다룬다.

## 위치 규칙

| Provider 성격 | 위치 | 예시 |
|--------------|------|------|
| 앱 전역 (DI, 인프라) | `core/provider/` 또는 해당 core 모듈 | `dioProvider`, `localeProvider` |
| 피처 전체 공유 | `feature/{name}/view_model/` | `hospitalRepositoryProvider` |
| 특정 화면 전용 | `feature/{name}/detail/view_model/` | `hospitalDetailProvider` |
| 데이터 레이어 DI | `data/repository/` 또는 `common/translation/` | `translationRepositoryProvider` |

## 전역 Provider 예시

```dart
// core/network/app_dio.dart
final dioProvider = Provider<Dio>((ref) {
  return AppDio.init().dio;
});

// core/localization/locale_provider.dart
final localeProvider = NotifierProvider<LocaleNotifier, Locale>(
  LocaleNotifier.new,
);

// core/provider/global_provider_container.dart
ProviderContainer? _globalContainer;
void setGlobalContainer(ProviderContainer container) {
  _globalContainer = container;
}
ProviderContainer? get globalContainer => _globalContainer;
```

## 피처 Provider 예시

```dart
// feature/hospital/detail/view_model/hospital_detail_providers.dart
final hospitalDetailProvider = FutureProvider.family.autoDispose<HospitalDetail, int>(
  (ref, hospitalId) async {
    final repo = ref.watch(hospitalRepositoryProvider);
    return repo.getHospitalDetail(hospitalId);
  },
);

// feature/hospital/list/view_model/hospital_list_providers.dart
final hospitalListProvider = StateNotifierProvider.autoDispose<...>((ref) {
  return HospitalListNotifier(ref.watch(hospitalRepositoryProvider));
});
```

## 파일 네이밍 규칙

| 패턴 | 파일명 |
|------|--------|
| 한 화면의 모든 Provider 모음 | `{name}_providers.dart` |
| 특정 타입 Provider 단독 | `{name}_{type}_provider.dart` |
| Repository Provider 포함 시 | 해당 Repository 파일 내 하단에 선언 |

## Provider 간 의존성

Provider가 다른 Provider를 참조할 때는 `ref.watch`로 구독한다:

```dart
// hospitalRepositoryProvider -> dioProvider 의존
final hospitalRepositoryProvider = Provider<HospitalRepository>((ref) {
  return HospitalRepository(ref.watch(dioProvider));
});

// hospitalDetailProvider -> hospitalRepositoryProvider 의존
final hospitalDetailProvider = FutureProvider.family.autoDispose<HospitalDetail, int>(
  (ref, id) async {
    final repo = ref.watch(hospitalRepositoryProvider);
    return repo.getHospitalDetail(id);
  },
);
```
