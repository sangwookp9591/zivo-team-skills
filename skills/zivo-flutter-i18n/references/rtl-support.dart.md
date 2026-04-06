# RTL 언어 대응 패턴

아랍어(ar), 히브리어(he-IL), 페르시아어(fa-IR) 등 오른쪽에서 왼쪽으로 읽는 언어 대응.

## RTL 대상 로케일

| 로케일 | 언어 | 정규화 |
|--------|------|--------|
| ar, ar-AE, ar-QA, ar-KW, ar-BH, ar-OM, ar-YE, ar-IQ, ar-JO, ar-LB, ar-PS, ar-EG | 아랍어 | 그대로 사용 |
| he-IL | 히브리어 | `ar`로 정규화 |
| fa-IR | 페르시아어 | `ar`로 정규화 |

## he/fa -> ar 정규화 이유

히브리어와 페르시아어는 별도 번역 파일을 유지하지 않고 아랍어 번역을 공유한다. `AppLocales.normalize()`에서 자동 변환:

```dart
static Locale normalize(Locale locale) {
  const _arabicFallbackLanguages = {'he', 'fa'};
  if (_arabicFallbackLanguages.contains(locale.languageCode)) {
    return const Locale('ar');
  }
  // ...
}
```

## RTL 레이아웃 대응

### 1. 패딩/마진 - EdgeInsetsDirectional 사용

```dart
// 잘못된 방법 (LTR 고정)
padding: EdgeInsets.only(left: 16, right: 8)

// 올바른 방법 (RTL 자동 반전)
padding: EdgeInsetsDirectional.only(start: 16, end: 8)

// 대칭인 경우는 EdgeInsets.symmetric 사용 가능
padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8)
```

### 2. 아이콘 방향 - TextDirection 활용

```dart
// 잘못된 방법 (화살표가 항상 오른쪽)
Icon(Icons.arrow_forward)

// 올바른 방법 (RTL에서 자동 반전)
Icon(Icons.arrow_forward,
  textDirection: Directionality.of(context),
)

// 또는 directional 아이콘 사용
Icon(Icons.arrow_forward)  // Material이 자동으로 미러링하는 아이콘
```

### 3. 텍스트 정렬 - TextAlign.start/end 사용

```dart
// 잘못된 방법 (항상 왼쪽 정렬)
Text('hello', textAlign: TextAlign.left)

// 올바른 방법 (RTL에서 자동으로 오른쪽 정렬)
Text('hello', textAlign: TextAlign.start)

// 오른쪽 정렬이 필요한 경우
Text('hello', textAlign: TextAlign.end)
```

### 4. Row 내 위젯 순서

RTL에서 `Row`의 children 순서가 자동으로 반전된다. 별도 처리 불필요.

```dart
// LTR: [아이콘] [텍스트] [화살표]
// RTL: [화살표] [텍스트] [아이콘]  <- 자동 반전
Row(
  children: [
    Icon(Icons.location_on),
    Text('hospital.address'.tr()),
    Icon(Icons.chevron_right),
  ],
)
```

### 5. Positioned/Alignment 위젯

```dart
// 잘못된 방법
Positioned(left: 16, child: ...)
Align(alignment: Alignment.centerLeft, child: ...)

// 올바른 방법
PositionedDirectional(start: 16, child: ...)
Align(alignment: AlignmentDirectional.centerStart, child: ...)
```

## RTL 확인 방법

개발 시 RTL 레이아웃을 테스트하려면 로케일을 아랍어로 변경:

```dart
// 설정 페이지에서 아랍어 선택
ref.read(localeProvider.notifier).setLocale(const Locale('ar'));
```

## RTL 체크리스트

새 UI를 구현할 때 다음을 확인:

- [ ] `EdgeInsets.only(left/right)` 대신 `EdgeInsetsDirectional.only(start/end)` 사용
- [ ] `TextAlign.left/right` 대신 `TextAlign.start/end` 사용
- [ ] 방향성 있는 아이콘이 올바르게 미러링되는지 확인
- [ ] `Positioned` 대신 `PositionedDirectional` 사용
- [ ] 아랍어 로케일로 전환하여 레이아웃 확인
