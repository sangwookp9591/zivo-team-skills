# Riverpod 상태관리 패턴 선택 가이드

Provider 유형별 **언제 사용하는가** 판단 기준. 선언 위치는 `zivo-flutter-arch/references/provider.dart.md`를 참조한다.

## Provider 유형별 가이드

### Provider - 단순 DI

변하지 않는 의존성 주입에 사용. Repository, Service 등.

```dart
final hospitalRepositoryProvider = Provider<HospitalRepository>((ref) {
  return HospitalRepository(ref.watch(dioProvider));
});
```

**사용 시점**: 값이 변하지 않고 다른 Provider에서 주입받을 때.

### FutureProvider.family.autoDispose - 단건 비동기 조회

상세 페이지 등 파라미터 기반 단건 데이터 조회.

```dart
final hospitalDetailProvider = FutureProvider.family.autoDispose<HospitalDetail, int>(
  (ref, hospitalId) async {
    final repo = ref.watch(hospitalRepositoryProvider);
    return repo.getHospitalDetail(hospitalId);
  },
);
```

**사용 시점**: 파라미터로 1건 조회, 캐싱 + 자동 해제가 필요할 때.

**UI에서 사용**:
```dart
final detail = ref.watch(hospitalDetailProvider(widget.hospitalId));
return detail.when(
  data: (hospital) => _buildContent(hospital),
  loading: () => const CircularProgressIndicator(),
  error: (error, stack) => Text('$error'),
);
```

### StateNotifierProvider - 복잡한 상태 변경

목록, 폼, 다중 상태 관리. `CursorListNotifier` 등과 함께 사용.

```dart
final hospitalListProvider = StateNotifierProvider.autoDispose<
    CursorListNotifier<Hospital>,
    CursorListState<Hospital>>((ref) {
  final repo = ref.watch(hospitalRepositoryProvider);
  return CursorListNotifier<Hospital>(
    ({int? cursor}) => repo.getHospitalList(cursor: cursor),
  );
});
```

**사용 시점**: 상태 변경 로직이 복잡하거나 (loadMore, refresh 등), 여러 필드를 가진 상태 객체가 필요할 때.

### NotifierProvider - 전역 상태

앱 전역에서 공유하는 상태. 로케일, 인증 상태 등.

```dart
final localeProvider = NotifierProvider<LocaleNotifier, Locale>(
  LocaleNotifier.new,
);

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() => AppLocaleState.instance.locale;

  Future<void> setLocale(Locale locale) async {
    AppLocaleState.instance.setLocale(locale);
    state = locale;
  }
}
```

**사용 시점**: autoDispose하지 않아야 하는 앱 전역 상태.

## ref.read vs ref.watch 기준

| 메서드 | 사용 위치 | 목적 |
|--------|----------|------|
| `ref.watch` | `build()` 메서드 내 | 값 변경 시 위젯 리빌드 |
| `ref.read` | 이벤트 핸들러, 콜백 | 현재 값 1회 읽기 (구독 안 함) |
| `ref.listen` | `build()` 또는 `initState()` | 값 변경 시 사이드 이펙트 (네비게이션 등) |

```dart
@override
Widget build(BuildContext context) {
  // 리빌드가 필요한 데이터는 watch
  final locale = ref.watch(localeProvider);

  return ElevatedButton(
    onPressed: () {
      // 이벤트 핸들러에서는 read
      ref.read(localeProvider.notifier).setLocale(const Locale('ko'));
    },
    child: Text(locale.languageCode),
  );
}
```

## GlobalContainer 패턴

위젯 트리 밖(FCM 서비스, Interceptor 등)에서 Provider에 접근할 때 사용.

```dart
// main.dart에서 설정
final container = ProviderContainer();
setGlobalContainer(container);

// 위젯 트리 밖에서 접근
globalContainer?.read(someProvider);
globalContainer?.invalidate(someProvider);  // 상태 초기화 + 리빌드

// FCM 서비스에서 사용 예시
class FcmService {
  static Future<void> _handleMessage(RemoteMessage message) async {
    // 위젯 트리가 없는 백그라운드에서도 Provider 접근 가능
    final notifier = globalContainer?.read(notificationProvider.notifier);
    notifier?.addNotification(message);
  }
}
```

## locale 의존 Provider 자동 재조회

locale이 변경되면 관련 데이터를 자동으로 다시 가져오는 패턴:

```dart
final hospitalListProvider = FutureProvider.autoDispose<List<Hospital>>((ref) async {
  // locale을 watch하면 locale 변경 시 자동 재조회
  ref.watch(localeProvider);

  final repo = ref.watch(hospitalRepositoryProvider);
  return repo.getHospitalList();
});
```

## autoDispose + family 조합

```dart
// family: 파라미터별 독립 인스턴스
// autoDispose: 화면 벗어나면 자동 해제
final procedureDetailProvider = FutureProvider.family.autoDispose<ProcedureDetail, int>(
  (ref, procedureId) async {
    final repo = ref.watch(procedureRepositoryProvider);
    return repo.getProcedureDetail(procedureId);
  },
);
```

**autoDispose 사용 기준**:
- 화면별 데이터 (상세, 목록) -> `autoDispose` 사용
- 앱 전역 데이터 (인증, 로케일) -> `autoDispose` 미사용
