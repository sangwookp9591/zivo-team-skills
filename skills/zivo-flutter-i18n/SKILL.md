---
name: zivo-flutter-i18n
description: ZIVO Flutter 다국어/로케일 시스템 가이드 - 39개 로케일, RTL 지원, 서버 동적 번역. 새 로케일 추가, 번역 키 작성, API 로케일 전달, RTL 대응을 다룬다.
triggers:
  - i18n
  - locale
  - 번역
  - translation
  - RTL
  - 다국어
  - easy_localization
  - localization
  - 로케일
metadata:
  author: ZIVO Team
  version: "1.0.0"
  tags:
    - flutter
    - i18n
    - localization
    - RTL
---

# ZIVO Flutter 다국어/로케일 시스템

39개 로케일을 지원하는 다국어 시스템. easy_localization(정적 번역) + 서버 API(동적 번역) 이중 구조.

## 로케일 시스템 아키텍처

```
AppLocales (정적 정의: 39개 로케일 목록, 메타데이터, 정규화)
    ↓
LocaleNotifier (Riverpod 상태: 현재 로케일 관리)
    ↓
AppLocaleState (싱글턴: ref 없이 동기 접근, Interceptor 등에서 사용)
    ↓
LocaleStorage (SharedPreferences: 로케일 태그 영속화)
    ↓
LocaleSync (ConsumerStatefulWidget: easy_localization과 Riverpod 동기화)
```

## 지원 로케일 그룹

| 그룹 | 로케일 | 비고 |
|------|--------|------|
| 동아시아 | ko, ja, zh-CN, zh-TW, zh-HK | 핵심 시장 |
| 영어권 | en, en-SG, en-AU, en-CA, en-GB | 국가별 변형 |
| 동남아시아 | th, id, ms, vi, fil | |
| CIS | ru, ru-KZ, ru-UZ, ru-KG, ru-TJ, ru-AM, ru-BY, ru-AZ, ru-MD | 러시아어 기반 국가 변형 |
| 아랍어권 | ar, ar-AE, ar-QA, ar-KW, ar-BH, ar-OM, ar-YE, ar-IQ, ar-JO, ar-LB, ar-PS, ar-EG | RTL |
| 기타 | mn, he-IL (RTL), fa-IR (RTL) | |

## References 라우팅

| 작업 | 읽을 파일 |
|------|----------|
| 로케일 시스템 구조 이해 | `references/locale-system.dart.md` |
| 새 로케일 추가 | `references/locale-system.dart.md` (체크리스트 섹션) |
| 번역 키 작성/추가 | `references/translation-keys.md` |
| API에 로케일 전달 방식 | `references/api-locale.dart.md` |
| RTL 언어 대응 | `references/rtl-support.dart.md` |
| 서버 동적 번역 사용 | `references/dynamic-translation.dart.md` |
| Dio interceptor에서 locale 처리 | `zivo-flutter-arch/references/network-dio.dart.md` (외부 참조) |

---

## 핵심 규칙

1. **로케일 정규화**: `he`(히브리어), `fa`(페르시아어) -> `ar`(아랍어)로 폴백. 번역 파일이 아랍어에만 있기 때문.
2. **국가 변형**: `ru-KZ`, `ar-AE` 등은 언어 번역을 공유하되 국가코드만 다르다. 컨텐츠 필터링용.
3. **API 전달**: 모든 API 요청에 `locale` + `countryCode`가 자동 전달된다 (`LocaleInterceptor`).
4. **새 로케일 추가**: `AppLocales` + JSON 파일 + `metadata` 3곳 동시 수정 필요.
5. **정적 vs 동적**: UI 텍스트는 정적 번역(JSON), 사용자 콘텐츠는 동적 번역(API).

---

## 다른 스킬과의 병합 사용

### zivo-flutter-arch와 함께 사용

- `network-dio.dart.md`의 인터셉터 체인에서 `LocaleInterceptor` 슬롯을 참조한다.
- `localeProvider`의 위치는 `core/localization/locale_provider.dart` (arch의 provider 위치 규칙 준수).

### zivo-flutter-patterns와 함께 사용

- locale 변경 시 Provider 자동 재조회 패턴은 `zivo-flutter-patterns/references/riverpod-patterns.dart.md`를 참조한다.
- `TranslationProvider`의 StateNotifier 패턴은 patterns 스킬의 Riverpod 패턴 가이드를 따른다.
