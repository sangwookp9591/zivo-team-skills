---
name: springboot-gof
description: Spring Boot에서 GoF 디자인 패턴을 적용하는 가이드. 상황별 패턴 선택 매트릭스와 Spring Boot 코드 예시 제공. 디자인 패턴, 리팩토링, 코드 구조 설계, if-else/switch 분기 제거, 확장성 개선, 결합도 낮추기, 유연한 설계 등을 논의할 때 이 스킬을 사용한다. Strategy, Factory, Template Method, Observer, Builder, Decorator, Adapter, Proxy, Chain of Responsibility, State, Facade, Composite 패턴을 다룬다.
---

# Spring Boot GoF Design Patterns

Spring Boot 프로젝트에서 GoF 패턴을 적용하는 실전 가이드. 패턴 자체의 이론보다 "언제, 왜 쓰는가"에 집중한다.

## 패턴 선택 매트릭스

코드에서 아래 신호를 발견하면 해당 패턴을 고려한다.

| 신호 (코드 냄새) | 추천 패턴 | references 파일 |
|---|---|---|
| 타입별 if-else/switch 분기가 3개 이상 | **Strategy** | `references/behavioral.md` |
| 조건에 따라 다른 객체 생성 | **Factory Method** | `references/creational.md` |
| 알고리즘 뼈대는 같고 세부 단계만 다름 | **Template Method** | `references/behavioral.md` |
| 이벤트 발생 시 여러 후속 처리 필요 | **Observer** (Spring Event) | `references/behavioral.md` |
| 생성자 파라미터가 5개 이상 | **Builder** | `references/creational.md` |
| 기존 객체에 동적으로 기능 추가 | **Decorator** | `references/structural.md` |
| 외부 라이브러리 인터페이스 불일치 | **Adapter** | `references/structural.md` |
| 메서드 호출 전후에 횡단 관심사 | **Proxy** (AOP) | `references/structural.md` |
| 요청을 여러 핸들러가 순차 처리 | **Chain of Responsibility** | `references/behavioral.md` |
| 객체 상태에 따라 행위가 완전히 변경 | **State** | `references/behavioral.md` |
| 복잡한 서브시스템을 단순 인터페이스로 | **Facade** | `references/structural.md` |
| 트리 구조의 재귀적 구성 | **Composite** | `references/structural.md` |

## 사용법

1. 위 매트릭스에서 현재 상황에 맞는 패턴을 찾는다
2. 해당 `references/` 파일을 읽어 Spring Boot 구현 예시를 확인한다
3. 프로젝트에 맞게 적용한다

## 패턴 적용 원칙

- **과도한 패턴 적용 금지**: 분기가 2개 이하면 단순 if-else가 낫다. 패턴은 복잡성을 관리하는 도구이지, 단순한 코드를 복잡하게 만드는 도구가 아니다.
- **Spring이 이미 제공하는 것 활용**: Spring의 DI, AOP, Event 시스템이 이미 많은 GoF 패턴을 내장하고 있다. 직접 구현하기 전에 Spring이 제공하는 방법을 먼저 확인한다.
- **인터페이스 기반 설계**: 패턴 적용 시 구현체가 아닌 인터페이스에 의존한다. Spring의 DI가 이를 자연스럽게 지원한다.

---

## 자주 쓰는 패턴 요약 (Quick Reference)

### 1. Strategy — 타입별 분기 제거

**Before** (코드 냄새):
```java
public BigDecimal calculate(Order order) {
    switch (order.getType()) {
        case REGULAR: return order.getAmount();
        case PREMIUM: return order.getAmount().multiply(new BigDecimal("0.9"));
        case VIP: return order.getAmount().multiply(new BigDecimal("0.8"));
        default: throw new IllegalArgumentException();
    }
}
```

**After** (Strategy + Spring DI):
```java
public interface PricingStrategy {
    OrderType getType();
    BigDecimal calculate(Order order);
}

@Component
public class VipPricingStrategy implements PricingStrategy {
    @Override public OrderType getType() { return OrderType.VIP; }
    @Override public BigDecimal calculate(Order order) {
        return order.getAmount().multiply(new BigDecimal("0.8"));
    }
}

// Strategy Registry (Spring이 자동 수집)
@Component
@RequiredArgsConstructor
public class PricingStrategyRegistry {
    private final Map<OrderType, PricingStrategy> strategyMap;

    public PricingStrategyRegistry(List<PricingStrategy> strategies) {
        this.strategyMap = strategies.stream()
            .collect(Collectors.toMap(PricingStrategy::getType, Function.identity()));
    }

    public PricingStrategy getStrategy(OrderType type) {
        return Optional.ofNullable(strategyMap.get(type))
            .orElseThrow(() -> new BusinessException(CommonErrorCode.UNSUPPORTED_TYPE));
    }
}
```

### 2. Factory Method — 조건부 객체 생성

```java
public interface NotificationSender {
    NotificationType getType();
    void send(NotificationRequest request);
}

@Component
public class NotificationSenderFactory {
    private final Map<NotificationType, NotificationSender> senderMap;

    public NotificationSenderFactory(List<NotificationSender> senders) {
        this.senderMap = senders.stream()
            .collect(Collectors.toMap(NotificationSender::getType, Function.identity()));
    }

    public NotificationSender getSender(NotificationType type) {
        return Optional.ofNullable(senderMap.get(type))
            .orElseThrow(() -> new BusinessException(CommonErrorCode.UNSUPPORTED_TYPE));
    }
}
```

### 3. Template Method — 공통 흐름 + 가변 단계

```java
public abstract class AbstractExportService<T> {
    public final byte[] export(ExportRequest request) {
        List<T> data = fetchData(request);        // 가변
        List<String[]> rows = transform(data);     // 가변
        return render(rows, request.getFormat());   // 공통
    }

    protected abstract List<T> fetchData(ExportRequest request);
    protected abstract List<String[]> transform(List<T> data);

    private byte[] render(List<String[]> rows, ExportFormat format) {
        // 공통 렌더링 로직 (CSV, Excel 등)
    }
}

@Service
public class OrderExportService extends AbstractExportService<Order> {
    @Override protected List<Order> fetchData(ExportRequest request) { ... }
    @Override protected List<String[]> transform(List<Order> data) { ... }
}
```

### 4. Observer — Spring Event 기반 비동기 처리

```java
// 이벤트 정의
public record OrderCompletedEvent(Long orderId, Long userId, BigDecimal amount) {}

// 이벤트 발행
@Service
@RequiredArgsConstructor
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void complete(Long orderId) {
        Order order = findAndComplete(orderId);
        eventPublisher.publishEvent(
            new OrderCompletedEvent(order.getId(), order.getUserId(), order.getAmount())
        );
    }
}

// 이벤트 리스너들 (각자 독립적으로 후속 처리)
@Component
public class PointAccumulationListener {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handle(OrderCompletedEvent event) {
        // 포인트 적립
    }
}

@Component
public class OrderNotificationListener {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handle(OrderCompletedEvent event) {
        // 알림 발송
    }
}
```

상세 구현과 추가 패턴은 `references/` 파일을 참조한다:
- `references/creational.md` — Builder, Factory Method, Abstract Factory, Singleton
- `references/structural.md` — Adapter, Decorator, Proxy, Facade, Composite
- `references/behavioral.md` — Strategy, Template Method, Observer, Chain of Responsibility, State
