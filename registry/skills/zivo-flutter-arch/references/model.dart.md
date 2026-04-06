# 데이터 모델

API 응답을 Dart 객체로 변환하는 데이터 모델 생성 패턴.

## 기본 모델 템플릿 (수동 fromJson)

```dart
class HospitalDetail {
  final int id;
  final String name;
  final String? description;
  final double rating;
  final List<String> images;

  const HospitalDetail({
    required this.id,
    required this.name,
    this.description,
    required this.rating,
    required this.images,
  });

  factory HospitalDetail.fromJson(Map<String, dynamic> json) {
    return HospitalDetail(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      rating: (json['rating'] as num).toDouble(),
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'rating': rating,
      'images': images,
    };
  }
}
```

## 중첩 모델 파싱

```dart
class Reservation {
  final int id;
  final HospitalDetail hospital;
  final ProcedureDetail procedure;
  final DateTime reservedAt;

  const Reservation({
    required this.id,
    required this.hospital,
    required this.procedure,
    required this.reservedAt,
  });

  factory Reservation.fromJson(Map<String, dynamic> json) {
    return Reservation(
      id: json['id'] as int,
      hospital: HospitalDetail.fromJson(json['hospital']),
      procedure: ProcedureDetail.fromJson(json['procedure']),
      reservedAt: DateTime.parse(json['reservedAt'] as String),
    );
  }
}
```

## json_annotation + build_runner

코드 생성 기반 모델이 필요한 경우:

```dart
import 'package:json_annotation/json_annotation.dart';

part 'refresh_token_request.g.dart';

@JsonSerializable()
class RefreshTokenRequest {
  final String refreshToken;
  final String osType;
  final String deviceInfo;
  final String appVersion;
  final String? latitude;
  final String? longitude;

  const RefreshTokenRequest({
    required this.refreshToken,
    required this.osType,
    required this.deviceInfo,
    required this.appVersion,
    this.latitude,
    this.longitude,
  });

  factory RefreshTokenRequest.fromJson(Map<String, dynamic> json) =>
      _$RefreshTokenRequestFromJson(json);

  Map<String, dynamic> toJson() => _$RefreshTokenRequestToJson(this);
}
```

코드 생성 실행:
```bash
dart run build_runner build --delete-conflicting-outputs
```

## Equatable 사용 패턴

값 비교가 필요한 모델에 사용 (상태 변경 감지, 리스트 비교 등):

```dart
import 'package:equatable/equatable.dart';

class Hospital extends Equatable {
  final int id;
  final String name;

  const Hospital({required this.id, required this.name});

  @override
  List<Object?> get props => [id, name];

  factory Hospital.fromJson(Map<String, dynamic> json) {
    return Hospital(
      id: json['id'] as int,
      name: json['name'] as String,
    );
  }
}
```

**Equatable 사용 기준**: Provider에서 상태 비교가 필요하거나, 리스트에서 중복 제거가 필요한 모델에만 적용한다. 단순 표시용 모델은 불필요.

## API 응답 래핑 패턴

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

## 모델 파일 위치

| 모델 성격 | 위치 |
|----------|------|
| API 응답 모델 | `data/models/{domain}/` |
| 요청 DTO | `data/models/{domain}/` |
| 피처 내부 상태 | `feature/{name}/` 내부 |
