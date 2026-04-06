# 공통 UI 위젯 사용법

프로젝트에서 재사용하는 공통 위젯과 UI 패턴.

## BasePage / BasePageWithAppBar

페이지의 기본 레이아웃을 제공하는 위젯.

```dart
// AppBar가 있는 페이지
BasePageWithAppBar(
  title: 'hospital.detail.title'.tr(),
  backgroundColor: AppColors.gray50,
  actions: [
    IconButton(
      icon: const Icon(Icons.share),
      onPressed: () => _share(),
    ),
  ],
  child: SingleChildScrollView(
    child: Column(children: [...]),
  ),
)

// AppBar가 없는 페이지 (홈, 스플래시 등)
BasePage(
  backgroundColor: AppColors.white,
  child: Column(children: [...]),
)
```

## PrimaryButton

앱 전체에서 사용하는 주요 버튼.

```dart
PrimaryButton(
  text: 'common.button.confirm'.tr(),
  onPressed: () => _submit(),
  isLoading: isSubmitting,
  enabled: isFormValid,
)

// 비활성화 상태
PrimaryButton(
  text: 'common.button.next'.tr(),
  onPressed: null,  // null이면 비활성화
)
```

## AuthNetworkImage

인증이 필요한 이미지 로딩. Bearer 토큰을 자동으로 헤더에 추가.

```dart
AuthNetworkImage(
  imageUrl: hospital.imageUrl,
  width: double.infinity,
  height: 200,
  fit: BoxFit.cover,
  placeholder: const Center(child: CircularProgressIndicator()),
  errorWidget: const Icon(Icons.broken_image),
)
```

## Toast (AppAlert)

```dart
// 에러 메시지
AppAlert.showError('errors.network.timeout'.tr());

// 성공 메시지
AppAlert.showSuccess('reservation.created'.tr());

// 정보 메시지
AppAlert.showInfo('common.copied'.tr());
```

## ResultOverlay

작업 완료 시 결과를 오버레이로 표시하는 패턴.

```dart
ResultOverlay.show(
  context,
  isSuccess: true,
  message: 'review.created'.tr(),
  onDismiss: () => context.pop(),
);
```

## SpringAnimatedSection

스프링 애니메이션 기반 확장/축소 섹션.

```dart
SpringAnimatedSection(
  isExpanded: _isExpanded,
  child: Column(
    children: [
      // 확장 시 표시할 내용
    ],
  ),
)
```

## ImageViewer

이미지 상세 보기 (CarouselSlider 기반).

```dart
// 이미지 탭 시 전체 화면 뷰어 이동
context.push(AppRoutes.imageViewer, extra: {
  'images': imageUrls,
  'initialIndex': tappedIndex,
});
```

## 위젯 분리 기준

| 조건 | 위치 | 예시 |
|------|------|------|
| 1곳에서만 사용 | 해당 화면의 `widgets/` | `hospital_detail_header.dart` |
| 같은 피처 내 2곳 | 피처 루트 `widgets/` | `hospital_card.dart` |
| 3곳 이상 재사용 | `common/widgets/` | `primary_button.dart` |
| 앱 전체 레이아웃 | `common/widgets/` | `base_page.dart` |
| 특정 도메인 로직 포함 | 해당 `feature/` 유지 | `payment_method_selector.dart` |

## AppColors / AppTheme 사용

```dart
// 색상 사용
Container(color: AppColors.primary)
Text('title', style: TextStyle(color: AppColors.gray900))

// 테마 기반 스타일 (권장)
Text('title', style: Theme.of(context).textTheme.titleMedium)

// 주요 색상
AppColors.primary    // 주요 색상
AppColors.secondary  // 보조 색상
AppColors.error      // 에러 빨강
AppColors.gray50     // 배경 회색
AppColors.gray200    // 구분선
AppColors.gray400    // 힌트 텍스트
AppColors.gray900    // 본문 텍스트
AppColors.white      // 흰색
```
