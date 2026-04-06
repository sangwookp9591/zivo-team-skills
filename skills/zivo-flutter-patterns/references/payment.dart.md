# [도메인 패턴] 결제 연동

Eximbay, NicePay 결제 시스템 연동 패턴.

## 결제 흐름 개요

```
결제 수단 선택 (PaymentMethodSelector)
  → 결제 준비 API 호출
  → WebView 결제 페이지 표시
  → 결제 완료 콜백 수신
  → 결제 결과 처리
  → 완료 페이지 이동
```

## PaymentMethodSelector

결제 수단 선택 UI 위���.

```dart
PaymentMethodSelector(
  onMethodSelected: (PaymentMethod method) {
    // 선택된 결제 수단으로 결제 시작
    _startPayment(method);
  },
)
```

## Eximbay 결제

### EximbayPaymentLauncher

```dart
class EximbayPaymentLauncher {
  /// 결제 시작
  static Future<void> launch({
    required BuildContext context,
    required String orderId,
    required double amount,
    required String currency,
    required String itemName,
    required Function(PaymentResult) onComplete,
    required Function(String) onError,
  }) async {
    // 1. fgkey 생성 (SHA256 해시)
    final fgkey = _generateFgKey(orderId, amount, currency);

    // 2. WebView 결제 페이지로 이동
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => EximbayPaymentPage(
          orderId: orderId,
          amount: amount,
          currency: currency,
          fgkey: fgkey,
          onComplete: onComplete,
          onError: onError,
        ),
      ),
    );
  }

  static String _generateFgKey(String orderId, double amount, String currency) {
    // SHA256 해시로 fgkey 생성
    final input = '$orderId|$amount|$currency|${dotenv.env['EXIMBAY_SECRET']}';
    return sha256.convert(utf8.encode(input)).toString();
  }
}
```

### EximbayPaymentPage (WebView)

```dart
class EximbayPaymentPage extends StatefulWidget {
  // WebView로 Eximbay 결제 페이지 표시
  // JavaScript 채널로 결제 결과 수신
  // 결제 완료 시 onComplete 콜백 호출
}
```

## NicePay 결제

국내 결제용. WebView 기반으로 NicePay 결제 페이지를 표시.

```dart
class NicepayPaymentPage extends StatefulWidget {
  const NicepayPaymentPage({
    super.key,
    required this.orderId,
    required this.amount,
    required this.itemName,
    required this.onComplete,
  });

  // InAppWebView로 NicePay 결제 페이지 표시
  // URL 스킴 감지로 결제 결과 판단
}
```

## Eximbay Provider

```dart
final eximbayProvider = Provider<EximbayService>((ref) {
  return EximbayService(ref.watch(dioProvider));
});
```

## 결제 완료 후 라우팅

```dart
void _onPaymentComplete(PaymentResult result) {
  if (result.isSuccess) {
    // 결제 성공 -> 완료 페이지
    context.pushReplacement(
      AppRoutes.purchaseComplete,
      extra: result,
    );
  } else {
    // 결제 실패 -> 에러 표시
    AppAlert.showError(result.errorMessage ?? 'payment.failed'.tr());
  }
}
```

## 결제 관련 파일 위치

```
common/payment/
├─��� payment_method_selector.dart    # 결제 수단 선택 위젯
├── eximbay_payment_launcher.dart   # Eximbay 결제 시작
├── eximbay_payment_page.dart       # Eximbay WebView 페이지
├── eximbay_v2_payment_page.dart    # Eximbay V2 WebView
├── eximbay_providers.dart          # Eximbay Provider
└── nicepay_payment_page.dart       # NicePay WebView 페이지
```
