# Widget / Integration 테스트 패턴

Flutter 테스트 작성 가이드. Provider override를 활용한 의존성 주입 테스트.

## Widget Test 기본 템플릿

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('HospitalDetailPage에 병원 이름이 표시된다', (tester) async {
    // Arrange: Provider override로 테스트 데이터 주입
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hospitalDetailProvider(1).overrideWith(
            (ref) async => const HospitalDetail(
              id: 1,
              name: '테스트 병원',
              rating: 4.5,
              images: [],
            ),
          ),
        ],
        child: const MaterialApp(
          home: HospitalDetailPage(hospitalId: 1),
        ),
      ),
    );

    // Act: 비동기 데이터 로딩 대기
    await tester.pumpAndSettle();

    // Assert
    expect(find.text('테스트 병원'), findsOneWidget);
  });
}
```

## Provider Override 패턴

### FutureProvider override

```dart
// 성공 케이스
hospitalDetailProvider(1).overrideWith(
  (ref) async => const HospitalDetail(id: 1, name: '테스트'),
),

// 에러 케이스
hospitalDetailProvider(1).overrideWith(
  (ref) async => throw Exception('네트워크 에러'),
),
```

### StateNotifierProvider override

```dart
// 목록 Provider override
hospitalListProvider.overrideWith(
  (ref) => CursorListNotifier<Hospital>(
    ({int? cursor}) async => const CursorPage(
      items: [Hospital(id: 1, name: '테스트 병원')],
      hasNext: false,
      nextCursor: null,
    ),
  ),
),
```

### Provider (DI) override

```dart
// Repository를 Mock으로 교체
hospitalRepositoryProvider.overrideWithValue(MockHospitalRepository()),
```

## 로케일 테스트

다국어 텍스트를 테스트할 때 easy_localization 초기화 필요:

```dart
testWidgets('한국어 로케일에서 제목이 올바르게 표시된다', (tester) async {
  await tester.pumpWidget(
    EasyLocalization(
      supportedLocales: const [Locale('ko')],
      path: 'assets/translations',
      fallbackLocale: const Locale('ko'),
      child: ProviderScope(
        overrides: [...],
        child: const MaterialApp(home: SomePage()),
      ),
    ),
  );
  await tester.pumpAndSettle();
  // assert
});
```

## 테스트 파일 위치

```
test/
├── feature/
│   ├── hospital/
���   │   ├── hospital_detail_page_test.dart
│   ��   └── hospital_list_page_test.dart
│   ├── reservation/
│   │   └── reservation_detail_page_test.dart
│   └── ...
├── common/
│   └── widgets/
│       ├── primary_button_test.dart
│       └── ...
└── core/
    └── localization/
        └── app_locales_test.dart
```

## 테스트 작성 체크리스트

1. `ProviderScope`으로 감싸기 (Riverpod Provider 사용하는 위젯)
2. 필요한 Provider를 `overrides`로 테스트 데이터 주입
3. `pumpAndSettle()` 로 비동기 로�� 대기
4. `find.text()`, `find.byType()` 등으로 위젯 검증
5. 사용자 액션: `tester.tap()`, `tester.enterText()` 등

## Integration Test

통합 테스트는 `integration_test/` 디렉토리에 작성:

```dart
// integration_test/app_test.dart
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('병원 목록에서 상세로 이��', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    // 병원 목록 항목 탭
    await tester.tap(find.text('테스트 병원'));
    await tester.pumpAndSettle();

    // 상세 페이지 확인
    expect(find.text('병원 상세'), findsOneWidget);
  });
}
```

실행: `flutter test integration_test/`

## Mock 클래스 작성

```dart
class MockHospitalRepository implements HospitalRepository {
  @override
  Future<HospitalDetail> getHospitalDetail(int hospitalId) async {
    return const HospitalDetail(id: 1, name: '테스트 병원', rating: 4.5, images: []);
  }

  @override
  Future<CursorPage<Hospital>> getHospitalList({int? cursor}) async {
    return const CursorPage(
      items: [Hospital(id: 1, name: '테스트 병원')],
      hasNext: false,
      nextCursor: null,
    );
  }
}
```
