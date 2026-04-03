# @NotifyOn 구현 Template

도메인에 워크플로우 트리거(알림 발송 등)를 추가할 때 이 템플릿을 사용한다.

`type` + `subType`은 워크플로우 엔진의 트리거 키로, 워크플로우 엔진이 해당 조합에 설정된 알림 채널(FCM, 카카오, 이메일 등)과 템플릿을 자동 조회하여 발송한다.

## 핵심 규칙

> **모든 `@NotifyOn` / `@NotifyOns`는 반드시 `{Domain}NotifyOnService.java`에서만 사용한다.**
> UseCase, Service, Controller 등 다른 클래스에 `@NotifyOn`을 직접 붙이지 않는다.

## 필요 파일 (순서대로 생성)

1. `{Domain}NotificationPayload` — 페이로드 record
2. `{Domain}PayloadBuilder` — 페이로드 빌더 @Component
3. **`{Domain}NotifyOnService`** — @NotifyOn 전용 서비스 (필수)

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

    /**
     * 스케줄 기반 알림 조건 판단.
     * SpEL에서 호출: @{domain}PayloadBuilder.canScheduleReminder(#request.startDate, 'EVENT_D7')
     * 복잡한 조건 로직을 SpEL 문자열 대신 Java 메서드로 캡슐화하면 가독성과 테스트 용이성이 높아진다.
     */
    public boolean canScheduleReminder(LocalDate targetDate, String reminderType) {
        if (targetDate == null) return false;
        long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), targetDate);
        return switch (reminderType) {
            case "EVENT_D7" -> daysUntil >= 7;
            case "EVENT_D1" -> daysUntil >= 1;
            case "EVENT_TODAY" -> daysUntil == 0;
            default -> false;
        };
    }
}
```

## 3. {Domain}NotifyOnService 템플릿 (필수)

위치: `{도메인}/application/notification/{Domain}NotifyOnService.java`

모든 `@NotifyOn`은 이 서비스에만 위치한다. 비즈니스 로직을 포함하지 않고, 전달받은 결과를 그대로 리턴하면서 AOP가 워크플로우 이벤트를 발행하도록 한다.

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

    @NotifyOn(
        type = "{DOMAIN}",
        subType = "CREATED",
        payload = "#{@{domain}PayloadBuilder.buildForCreated(#result)}",
        condition = "#result != null && @{domain}PayloadBuilder.canNotify(#result)"
    )
    public {AggregateRoot} createNotify({AggregateRoot} result) {
        return result;  // 로직 없이 리턴 → AOP가 워크플로우 트리거
    }

    @NotifyOns({
        @NotifyOn(
            type = "{DOMAIN}", subType = "APPROVED",
            payload = "#{@{domain}PayloadBuilder.buildForStatusChanged(#result, 'APPROVED')}",
            condition = "#result != null && #newStatus == 'APPROVED'"),
        @NotifyOn(
            type = "{DOMAIN}", subType = "REJECTED",
            payload = "#{@{domain}PayloadBuilder.buildForStatusChanged(#result, 'REJECTED')}",
            condition = "#result != null && #newStatus == 'REJECTED'")
    })
    public {AggregateRoot} statusChangeNotify({AggregateRoot} result, String newStatus) {
        return result;
    }
}
```

## 호출 패턴

UseCase 또는 Controller에서 비즈니스 로직 실행 후, NotifyOnService에 결과를 전달한다.

```java
@Service
@RequiredArgsConstructor
public class Create{AggregateRoot}UseCaseImpl implements Create{AggregateRoot}UseCase {

    private final {AggregateRoot}Repository repository;
    private final {Domain}NotifyOnService notifyOnService;

    @Override
    public {Result} execute({Command} command) {
        // 1. 비즈니스 로직
        {AggregateRoot} entity = {AggregateRoot}.create(command.name(), command.userId());
        {AggregateRoot} saved = repository.save(entity);

        // 2. 워크플로우 트리거 (NotifyOnService에 결과 전달)
        notifyOnService.createNotify(saved);

        // 3. 결과 반환
        return {Result}.from(saved);
    }
}
```

## 금지 사항

```java
// ❌ 잘못된 예: UseCase에 직접 @NotifyOn
@Service
public class CreateOrderUseCaseImpl {
    @NotifyOn(type = "ORDER", subType = "CREATED", ...)  // 금지!
    public OrderResult execute(OrderCommand command) { ... }
}

// ❌ 잘못된 예: Controller에 직접 @NotifyOn
@RestController
public class OrderController {
    @NotifyOn(type = "ORDER", subType = "CREATED", ...)  // 금지!
    @PostMapping("/orders")
    public OrderResponse create(...) { ... }
}

// ✅ 올바른 예: NotifyOnService에서만 사용
@Service
public class OrderNotifyOnService {
    @NotifyOn(type = "ORDER", subType = "CREATED", ...)  // 여기서만!
    public OrderResult createNotify(OrderResult result) { return result; }
}
```
