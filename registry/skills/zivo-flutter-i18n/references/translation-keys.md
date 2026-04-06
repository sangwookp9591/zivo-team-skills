# 번역 키 작성 규칙

easy_localization 기반 정적 번역. JSON 파일로 관리한다.

## 파일 위치

```
assets/translations/
├── ko.json
├── ja.json
├── en.json
├── zh-CN.json
├── zh-TW.json
├── zh-HK.json
├── th.json
├── id.json
├── ... (39개 로케일)
```

## 키 네이밍 규칙

**도트 표기법** 사용. `{도메인}.{화면}.{요소}` 패턴.

```json
{
  "hospital": {
    "detail": {
      "title": "병원 상세",
      "rating": "평점",
      "reviewCount": "{count}개의 리뷰"
    },
    "list": {
      "title": "병원 목록",
      "empty": "검색 결과가 없습니다"
    }
  },
  "common": {
    "button": {
      "confirm": "확인",
      "cancel": "취소",
      "retry": "다시 시도"
    },
    "translation": {
      "failed": "번역에 실패했습니다",
      "unavailable": "번역 서비스를 사용할 수 없습니다"
    }
  },
  "errors": {
    "network": {
      "timeout": "연결 시간이 초과되었습니다",
      "connection": "네트워크 연결을 확인해주세요"
    }
  },
  "errorCodes": {
    "HOSPITAL_NOT_FOUND": "병원을 찾을 수 없습니다"
  }
}
```

## 코드에서 사용

### 기본 텍스트

```dart
import 'package:easy_localization/easy_localization.dart';

// 단순 텍스트
Text('hospital.detail.title'.tr())

// 파라미터 포함
Text('hospital.detail.reviewCount'.tr(args: ['${review.count}']))

// 복수형
Text('notification.count'.plural(count))
```

### 위젯 외부에서 사용

```dart
// Interceptor, Repository 등 위젯 트리 밖에서도 사용 가능
final message = 'errors.network.timeout'.tr();
```

## 에러 코드 번역

서버가 `errorCode`를 반환하면 `errorCodes.{code}` 키로 자동 번역:

```json
{
  "errorCodes": {
    "RESERVATION_CONFLICT": "이미 예약된 시간입니다",
    "HOSPITAL_NOT_FOUND": "병원을 찾을 수 없습니다",
    "PAYMENT_FAILED": "결제에 실패했습니다"
  }
}
```

`ErrorHandlingInterceptor`가 자동으로 `errorCodes.{code}` 키를 조회하여 번역된 메시지를 표시한다.

## 새 번역 키 추가 절차

1. 키 네이밍 결정 (`{도메인}.{화면}.{요소}` 패턴)
2. **ko.json**에 한국어 텍스트 추가
3. 나머지 38개 JSON 파일에 번역 텍스트 추가
4. 코드에서 `'key'.tr()` 로 사용
5. (선택) 파라미터가 필요한 경우 `{name}` 플레이스홀더 사용

## 키 네이밍 주의사항

| 규칙 | 예시 | 잘못된 예시 |
|------|------|-----------|
| 도트 표기법 사용 | `hospital.detail.title` | `hospital_detail_title` |
| 소문자 camelCase | `reviewCount` | `review_count`, `ReviewCount` |
| 도메인별 그룹화 | `hospital.`, `procedure.` | 최상위에 나열 |
| 공통 텍스트는 common에 | `common.button.confirm` | `hospital.confirm` |
| 에러 코드는 errorCodes에 | `errorCodes.NOT_FOUND` | `errors.NOT_FOUND` |
