# ErrorCode Template

도메인별 에러 코드 enum 생성 시 이 템플릿을 사용한다.

## 위치

`{도메인}/support/exception/{Domain}ErrorCode.java`

## 템플릿

```java
package com.example.demo.{domain}.support.exception;

import com.example.demo.common.exception.CommonErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum {Domain}ErrorCode implements CommonErrorCode {

    // ── 조회 ────────────────────────────────────────────────────
    NOT_FOUND("{PREFIX}_001", "{리소스}을(를) 찾을 수 없습니다"),

    // ── 상태 ────────────────────────────────────────────────────
    ALREADY_DELETED("{PREFIX}_002", "이미 삭제된 {리소스}입니다"),
    ALREADY_INACTIVE("{PREFIX}_003", "이미 비활성화된 {리소스}입니다"),

    // ── 권한 ────────────────────────────────────────────────────
    NO_PERMISSION("{PREFIX}_004", "해당 {리소스}에 대한 권한이 없습니다"),

    // ── 검증 ────────────────────────────────────────────────────
    INVALID_STATUS("{PREFIX}_005", "유효하지 않은 상태 값입니다"),
    DUPLICATE_NAME("{PREFIX}_006", "이미 존재하는 이름입니다");

    private final String code;
    private final String message;
}
```

## 사용법

```java
throw new BusinessException({Domain}ErrorCode.NOT_FOUND);
```

## 핵심 규칙

- `CommonErrorCode` 인터페이스를 구현
- 코드 prefix는 도메인 약어 사용 (예: `QR_001`, `ESIM_001`, `RSV_001`)
- 메시지는 사용자에게 노출될 수 있으므로 한글로 명확하게 작성
