# @NotifyOn 구현 Template

도메인에 알림 발송 기능을 추가할 때 이 템플릿을 사용한다.

## 필요 파일 (순서대로 생성)

1. NotificationPayload
2. FcmRouteInfo
3. PayloadBuilder
4. NotifyOnService (선택: 비즈니스 로직이 다른 서비스에 있을 때)

## 1. NotificationPayload 템플릿

위치: `{도메인}/application/notification/{Domain}NotificationPayload.java`

```java
package com.example.demo.{domain}.application.notification;

import com.example.demo.common.notification.FcmRouteInfo;

public record {Domain}NotificationPayload(
    Long entityId,
    Long userId,
    String status,
    String entityName,
    String userNickname,
    FcmRouteInfo fcmRoute
) {}
```

## 2. PayloadBuilder 템플릿

위치: `{도메인}/application/notification/{Domain}PayloadBuilder.java`

```java
package com.example.demo.{domain}.application.notification;

import com.example.demo.common.notification.FcmRouteInfo;
import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class {Domain}PayloadBuilder {

    public {Domain}NotificationPayload buildForCreated({AggregateRoot} result) {
        return new {Domain}NotificationPayload(
            result.getId(),
            result.getCreatedBy(),
            "CREATED",
            result.getName(),
            null,
            FcmRouteInfo.of("/{route}/detail", result.getId())
        );
    }

    public {Domain}NotificationPayload buildForStatusChanged({AggregateRoot} result, String newStatus) {
        return new {Domain}NotificationPayload(
            result.getId(),
            result.getUpdatedBy(),
            newStatus,
            result.getName(),
            null,
            FcmRouteInfo.of("/{route}/detail", result.getId())
        );
    }

    public boolean canNotify({AggregateRoot} result) {
        return result != null && result.getId() != null;
    }
}
```

## 3. UseCase에 @NotifyOn 적용

```java
@Service
@Transactional
@RequiredArgsConstructor
public class Create{AggregateRoot}UseCaseImpl implements Create{AggregateRoot}UseCase {

    private final {AggregateRoot}Repository repository;

    @NotifyOn(
        type = "{DOMAIN}",
        subType = "CREATED",
        payload = "#{@{domain}PayloadBuilder.buildForCreated(#result)}",
        condition = "#result != null && @{domain}PayloadBuilder.canNotify(#result)"
    )
    @Override
    public {AggregateRoot} execute({Command} command) {
        {AggregateRoot} entity = {AggregateRoot}.create(command.name(), command.userId());
        return repository.save(entity);
    }
}
```

## 4. NotifyOnService 패턴 (선택)

비즈니스 로직이 다른 서비스에 있고, 알림만 별도로 발송해야 할 때 사용.

위치: `{도메인}/application/notification/{Domain}NotifyOnService.java`

```java
package com.example.demo.{domain}.application.notification;

import com.example.demo.common.annotation.NotifyOn;
import com.example.demo.common.annotation.NotifyOns;
import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class {Domain}NotifyOnService {

    @NotifyOns({
        @NotifyOn(
            type = "{DOMAIN}", subType = "CREATED",
            payload = "#{@{domain}PayloadBuilder.buildForCreated(#result)}",
            condition = "#result != null"),
        @NotifyOn(
            type = "{DOMAIN}", subType = "STATUS_CHANGED",
            payload = "#{@{domain}PayloadBuilder.buildForStatusChanged(#result, #newStatus)}",
            condition = "#result != null && #newStatus != null")
    })
    public {AggregateRoot} notifyStatusChange(
            {AggregateRoot} result, String newStatus) {
        return result;  // 로직 없이 리턴 → AOP가 알림 처리
    }
}
```

## 핵심 규칙

- `@NotifyOn`은 반드시 `@Transactional` 서비스 메서드에서 사용
- 컨트롤러에 직접 사용 금지 (AOP가 트랜잭션 커밋 후 이벤트 발행)
- SpEL의 `#result`는 메서드 리턴값, `#paramName`은 파라미터 참조
