# Repository 클래스

Dio 기반 Repository 생성 패턴. API 호출, 응답 파싱, 에러 처리를 담당한다.

## 기본 Repository 템플릿

```dart
import 'package:dio/dio.dart';

class HospitalRepository {
  HospitalRepository(this._dio);

  final Dio _dio;

  /// 병원 상세 조회
  Future<HospitalDetail> getHospitalDetail(int hospitalId) async {
    final response = await _dio.get('/api/hospitals/$hospitalId');
    return HospitalDetail.fromJson(response.data['data']);
  }

  /// 병원 목록 조회 (커서 페이지네이션)
  Future<CursorPage<Hospital>> getHospitalList({int? cursor}) async {
    final response = await _dio.get('/api/hospitals', queryParameters: {
      if (cursor != null) 'cursor': cursor,
      'size': 20,
    });

    final data = response.data['data'];
    final items = (data['list'] as List)
        .map((json) => Hospital.fromJson(json))
        .toList();

    return CursorPage(
      items: items,
      hasNext: data['hasNext'] as bool,
      nextCursor: data['nextCursor'] as int?,
    );
  }

  /// POST 요청 예시
  Future<void> createReview({
    required int hospitalId,
    required String content,
    required int rating,
  }) async {
    await _dio.post('/api/hospitals/$hospitalId/reviews', data: {
      'content': content,
      'rating': rating,
    });
  }
}
```

## Repository Provider 등록

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:zivo_flutter/core/network/app_dio.dart';

final hospitalRepositoryProvider = Provider<HospitalRepository>((ref) {
  return HospitalRepository(ref.watch(dioProvider));
});
```

**위치**: `data/repository/hospital_repository.dart` 또는 `feature/{name}/` 내부에 둘 수 있으나, 현재 프로젝트는 `data/repository/`에 통합 관리한다.

## 에러 처리 패턴

Repository에서 직접 에러를 처리하지 않는다. `ErrorHandlingInterceptor`가 DioException을 자동으로 래핑하므로, Repository는 단순히 예외를 전파한다.

```dart
// 특정 에러를 별도 처리해야 하는 경우만 try-catch 사용
Future<bool> checkAvailability(int hospitalId) async {
  try {
    await _dio.get(
      '/api/hospitals/$hospitalId/availability',
      options: Options(extra: {'suppressErrorAlert': true}),
    );
    return true;
  } on DioException catch (e) {
    if (e.response?.statusCode == 404) return false;
    rethrow;
  }
}
```

## suppressErrorAlert 옵션

에러 알럿을 자동으로 표시하지 않으려면 `extra`에 옵션을 전달한다:

```dart
await _dio.get(
  '/api/some-endpoint',
  options: Options(extra: {
    'suppressErrorAlert': true,   // 에러 알럿 표시 안 함
    'suppressErrorLog': true,     // 에러 로그 출력 안 함
    'suppressRecovery': true,     // 네트워크 복구 UI 표시 안 함
  }),
);
```

## Retrofit 기반 API 인터페이스 (선택)

코드 생성 기반 API 정의가 필요한 경우:

```dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';

part 'hospital_api.g.dart';

@RestApi()
abstract class HospitalApi {
  factory HospitalApi(Dio dio, {String baseUrl}) = _HospitalApi;

  @GET('/api/hospitals/{id}')
  Future<HttpResponse<dynamic>> getHospitalDetail(@Path('id') int id);
}
```

`build_runner` 실행: `dart run build_runner build --delete-conflicting-outputs`
