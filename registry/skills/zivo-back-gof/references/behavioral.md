# Behavioral Patterns in Spring Boot

## Table of Contents
- [Strategy](#strategy)
- [Template Method](#template-method)
- [Observer (Spring Event)](#observer-spring-event)
- [Chain of Responsibility](#chain-of-responsibility)
- [State](#state)

---

## Strategy

타입이나 조건에 따라 다른 알고리즘을 실행해야 할 때. if-else/switch 분기가 3개 이상이면 Strategy로 전환을 고려한다.

### Case: 할인 정책

```java
public interface DiscountPolicy {
    MembershipLevel getLevel();
    BigDecimal calculateDiscount(BigDecimal originalPrice);
}

@Component
public class SilverDiscountPolicy implements DiscountPolicy {
    @Override public MembershipLevel getLevel() { return MembershipLevel.SILVER; }
    @Override public BigDecimal calculateDiscount(BigDecimal price) {
        return price.multiply(new BigDecimal("0.03"));
    }
}

@Component
public class GoldDiscountPolicy implements DiscountPolicy {
    @Override public MembershipLevel getLevel() { return MembershipLevel.GOLD; }
    @Override public BigDecimal calculateDiscount(BigDecimal price) {
        return price.multiply(new BigDecimal("0.05"));
    }
}

@Component
public class PlatinumDiscountPolicy implements DiscountPolicy {
    @Override public MembershipLevel getLevel() { return MembershipLevel.PLATINUM; }
    @Override public BigDecimal calculateDiscount(BigDecimal price) {
        return price.multiply(new BigDecimal("0.10"));
    }
}

// Registry (SKILL.md의 Strategy 패턴 참고)
@Component
public class DiscountPolicyRegistry {
    private final Map<MembershipLevel, DiscountPolicy> policyMap;

    public DiscountPolicyRegistry(List<DiscountPolicy> policies) {
        this.policyMap = policies.stream()
            .collect(Collectors.toMap(DiscountPolicy::getLevel, Function.identity()));
    }

    public DiscountPolicy getPolicy(MembershipLevel level) {
        return Optional.ofNullable(policyMap.get(level))
            .orElse(new NoDiscountPolicy());  // 기본값: 할인 없음
    }
}
```

### Case: 검색 엔진 전략

```java
public interface SearchEngine {
    SearchType getType();
    SearchResult search(SearchQuery query);
}

@Component
public class ElasticsearchEngine implements SearchEngine {
    @Override public SearchType getType() { return SearchType.FULL_TEXT; }
    @Override public SearchResult search(SearchQuery query) { /* ES 검색 */ }
}

@Component
public class DatabaseSearchEngine implements SearchEngine {
    @Override public SearchType getType() { return SearchType.EXACT_MATCH; }
    @Override public SearchResult search(SearchQuery query) { /* DB LIKE 검색 */ }
}
```

### Case: 정렬 전략 (MyBatis 동적 쿼리용)

```java
public interface SortStrategy {
    SortType getType();
    String toOrderByClause();
}

@Component
public class NewestFirstSort implements SortStrategy {
    @Override public SortType getType() { return SortType.NEWEST; }
    @Override public String toOrderByClause() { return "created_at DESC"; }
}

@Component
public class PriceAscSort implements SortStrategy {
    @Override public SortType getType() { return SortType.PRICE_ASC; }
    @Override public String toOrderByClause() { return "price ASC, created_at DESC"; }
}
```

---

## Template Method

여러 구현체가 동일한 알고리즘 뼈대를 공유하되 세부 단계만 다를 때. abstract class로 뼈대를 정의하고 하위 클래스가 가변 단계를 구현한다.

### Case: 데이터 동기화 작업

```java
public abstract class AbstractDataSyncJob<T> {

    // 뼈대 (final → 하위 클래스가 변경 불가)
    public final SyncResult execute() {
        log.info("[SYNC] {} 시작", getJobName());

        List<T> data = fetchFromSource();
        List<T> validated = validate(data);
        int saved = saveToTarget(validated);
        postProcess(saved);

        log.info("[SYNC] {} 완료: {}건 처리", getJobName(), saved);
        return SyncResult.of(getJobName(), data.size(), saved);
    }

    // 가변 단계
    protected abstract String getJobName();
    protected abstract List<T> fetchFromSource();
    protected abstract int saveToTarget(List<T> data);

    // 기본 구현이 있는 선택적 단계 (hook)
    protected List<T> validate(List<T> data) { return data; }
    protected void postProcess(int savedCount) { /* 기본: 아무것도 안함 */ }
}

@Service
public class ProductSyncJob extends AbstractDataSyncJob<ProductDto> {
    private final ExternalProductApi api;
    private final ProductRepository repository;

    @Override protected String getJobName() { return "상품 동기화"; }

    @Override protected List<ProductDto> fetchFromSource() {
        return api.fetchAll();
    }

    @Override protected List<ProductDto> validate(List<ProductDto> data) {
        return data.stream()
            .filter(p -> p.getPrice() != null && p.getPrice().compareTo(BigDecimal.ZERO) > 0)
            .toList();
    }

    @Override protected int saveToTarget(List<ProductDto> data) {
        return repository.batchUpsert(data);
    }
}

@Service
public class UserSyncJob extends AbstractDataSyncJob<UserDto> {
    @Override protected String getJobName() { return "회원 동기화"; }
    @Override protected List<UserDto> fetchFromSource() { /* ... */ }
    @Override protected int saveToTarget(List<UserDto> data) { /* ... */ }

    @Override protected void postProcess(int savedCount) {
        // 동기화 후 캐시 무효화
        cacheManager.getCache("users").clear();
    }
}
```

### Case: 문서 생성 템플릿

```java
public abstract class AbstractDocumentGenerator {

    public final byte[] generate(DocumentRequest request) {
        Map<String, Object> data = collectData(request);
        String content = renderContent(data);
        byte[] document = convertToFormat(content, request.getFormat());
        return addWatermark(document, request);
    }

    protected abstract Map<String, Object> collectData(DocumentRequest request);
    protected abstract String renderContent(Map<String, Object> data);

    // 공통 단계
    private byte[] convertToFormat(String content, DocumentFormat format) { /* ... */ }
    protected byte[] addWatermark(byte[] document, DocumentRequest request) { return document; }
}
```

---

## Observer (Spring Event)

이벤트 발생 시 여러 리스너가 독립적으로 후속 처리를 해야 할 때. 발행자와 구독자가 서로를 모르므로 결합도가 매우 낮다.

### Case: 회원 가입 후 후속 처리

```java
// 이벤트 정의 (불변 record)
public record UserRegisteredEvent(
    Long userId,
    String email,
    String nickname,
    LocalDateTime registeredAt
) {}

// 이벤트 발행
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        User user = User.create(request.getEmail(), request.getNickname());
        User saved = userRepository.save(user);

        eventPublisher.publishEvent(new UserRegisteredEvent(
            saved.getId(), saved.getEmail(), saved.getNickname(), LocalDateTime.now()
        ));

        return UserResponse.from(saved);
    }
}

// 리스너 1: 환영 이메일 발송
@Component
@RequiredArgsConstructor
public class WelcomeEmailListener {
    private final EmailService emailService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handle(UserRegisteredEvent event) {
        emailService.sendWelcome(event.email(), event.nickname());
    }
}

// 리스너 2: 가입 쿠폰 발급
@Component
@RequiredArgsConstructor
public class SignupCouponListener {
    private final CouponService couponService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handle(UserRegisteredEvent event) {
        couponService.issueSignupCoupon(event.userId());
    }
}

// 리스너 3: 통계 기록
@Component
@RequiredArgsConstructor
public class RegistrationStatsListener {
    private final StatsService statsService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handle(UserRegisteredEvent event) {
        statsService.recordRegistration(event.registeredAt());
    }
}
```

### 트랜잭션 페이즈 선택 가이드

| 페이즈 | 사용 시점 |
|--------|----------|
| `AFTER_COMMIT` | 외부 시스템 호출 (이메일, 알림, 외부 API). 트랜잭션 성공 후에만 실행 |
| `BEFORE_COMMIT` | 같은 트랜잭션 내에서 추가 DB 작업이 필요할 때 |
| `AFTER_ROLLBACK` | 실패 시 보상 로직 (로그, 알림) |

---

## Chain of Responsibility

요청을 여러 핸들러가 순차적으로 처리하거나, 조건에 맞는 핸들러가 처리를 맡을 때. Spring Security의 Filter Chain이 대표적인 예시.

### Case: 주문 검증 체인

```java
public interface OrderValidator {
    int getOrder();  // 실행 순서
    void validate(Order order);
}

@Component
public class StockValidator implements OrderValidator {
    @Override public int getOrder() { return 1; }
    @Override public void validate(Order order) {
        if (!inventoryService.hasStock(order.getItems())) {
            throw new BusinessException(OrderErrorCode.OUT_OF_STOCK);
        }
    }
}

@Component
public class PaymentLimitValidator implements OrderValidator {
    @Override public int getOrder() { return 2; }
    @Override public void validate(Order order) {
        if (order.getTotalAmount().compareTo(new BigDecimal("10000000")) > 0) {
            throw new BusinessException(OrderErrorCode.PAYMENT_LIMIT_EXCEEDED);
        }
    }
}

@Component
public class FraudDetectionValidator implements OrderValidator {
    @Override public int getOrder() { return 3; }
    @Override public void validate(Order order) {
        if (fraudService.isSuspicious(order)) {
            throw new BusinessException(OrderErrorCode.FRAUD_DETECTED);
        }
    }
}

// 체인 실행기
@Component
public class OrderValidationChain {
    private final List<OrderValidator> validators;

    public OrderValidationChain(List<OrderValidator> validators) {
        this.validators = validators.stream()
            .sorted(Comparator.comparingInt(OrderValidator::getOrder))
            .toList();
    }

    public void validate(Order order) {
        validators.forEach(v -> v.validate(order));
    }
}

// 사용
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderValidationChain validationChain;

    @Transactional
    public OrderResult createOrder(OrderRequest request) {
        Order order = Order.create(request);
        validationChain.validate(order);  // 모든 검증 통과 후 진행
        return orderRepository.save(order);
    }
}
```

### Case: 할인 적용 체인 (누적 적용)

```java
public interface DiscountHandler {
    int getOrder();
    BigDecimal apply(BigDecimal currentPrice, OrderContext context);
}

@Component
public class CouponDiscountHandler implements DiscountHandler {
    @Override public int getOrder() { return 1; }
    @Override public BigDecimal apply(BigDecimal price, OrderContext context) {
        if (context.getCoupon() == null) return price;
        return price.subtract(context.getCoupon().getDiscountAmount());
    }
}

@Component
public class MembershipDiscountHandler implements DiscountHandler {
    @Override public int getOrder() { return 2; }
    @Override public BigDecimal apply(BigDecimal price, OrderContext context) {
        BigDecimal rate = getMembershipRate(context.getMemberLevel());
        return price.multiply(BigDecimal.ONE.subtract(rate));
    }
}

@Component
public class DiscountChain {
    private final List<DiscountHandler> handlers;

    public DiscountChain(List<DiscountHandler> handlers) {
        this.handlers = handlers.stream()
            .sorted(Comparator.comparingInt(DiscountHandler::getOrder))
            .toList();
    }

    public BigDecimal applyAll(BigDecimal originalPrice, OrderContext context) {
        BigDecimal price = originalPrice;
        for (DiscountHandler handler : handlers) {
            price = handler.apply(price, context);
        }
        return price.max(BigDecimal.ZERO);  // 음수 방지
    }
}
```

---

## State

객체의 상태에 따라 동일한 메서드의 행위가 완전히 달라질 때. if-else로 상태를 확인하는 대신, 상태 자체가 행위를 결정한다.

### Case: 주문 상태 머신

```java
// 상태 인터페이스
public interface OrderState {
    OrderStatus getStatus();
    OrderState pay(Order order);
    OrderState ship(Order order);
    OrderState cancel(Order order);
    OrderState complete(Order order);
}

// 각 상태별 구현
public class PendingState implements OrderState {
    @Override public OrderStatus getStatus() { return OrderStatus.PENDING; }

    @Override public OrderState pay(Order order) {
        order.setPaymentDate(LocalDateTime.now());
        return new PaidState();
    }
    @Override public OrderState cancel(Order order) {
        order.setCancelDate(LocalDateTime.now());
        return new CancelledState();
    }
    @Override public OrderState ship(Order order) {
        throw new BusinessException(OrderErrorCode.INVALID_STATE_TRANSITION,
            "결제 전에 배송할 수 없습니다");
    }
    @Override public OrderState complete(Order order) {
        throw new BusinessException(OrderErrorCode.INVALID_STATE_TRANSITION);
    }
}

public class PaidState implements OrderState {
    @Override public OrderStatus getStatus() { return OrderStatus.PAID; }

    @Override public OrderState ship(Order order) {
        order.setShippingDate(LocalDateTime.now());
        return new ShippedState();
    }
    @Override public OrderState cancel(Order order) {
        order.processRefund();
        return new CancelledState();
    }
    @Override public OrderState pay(Order order) {
        throw new BusinessException(OrderErrorCode.ALREADY_PAID);
    }
    @Override public OrderState complete(Order order) {
        throw new BusinessException(OrderErrorCode.INVALID_STATE_TRANSITION);
    }
}

public class ShippedState implements OrderState {
    @Override public OrderStatus getStatus() { return OrderStatus.SHIPPED; }

    @Override public OrderState complete(Order order) {
        order.setCompletedDate(LocalDateTime.now());
        return new CompletedState();
    }
    @Override public OrderState cancel(Order order) {
        throw new BusinessException(OrderErrorCode.CANNOT_CANCEL_SHIPPED);
    }
    @Override public OrderState pay(Order order) {
        throw new BusinessException(OrderErrorCode.ALREADY_PAID);
    }
    @Override public OrderState ship(Order order) {
        throw new BusinessException(OrderErrorCode.ALREADY_SHIPPED);
    }
}

// Order Aggregate에서 사용
public class Order {
    private OrderState state = new PendingState();

    public void pay() { this.state = state.pay(this); }
    public void ship() { this.state = state.ship(this); }
    public void cancel() { this.state = state.cancel(this); }
    public void complete() { this.state = state.complete(this); }

    public OrderStatus getStatus() { return state.getStatus(); }
}
```

### Case: Enum 기반 간단한 State (상태 전이가 단순할 때)

State 객체를 별도로 만들 만큼 복잡하지 않을 때는 Enum에 전이 규칙을 넣는다.

```java
public enum OrderStatus {
    PENDING {
        @Override public OrderStatus next() { return PAID; }
        @Override public boolean canCancel() { return true; }
    },
    PAID {
        @Override public OrderStatus next() { return SHIPPED; }
        @Override public boolean canCancel() { return true; }
    },
    SHIPPED {
        @Override public OrderStatus next() { return COMPLETED; }
        @Override public boolean canCancel() { return false; }
    },
    COMPLETED {
        @Override public OrderStatus next() { throw new BusinessException(OrderErrorCode.ALREADY_COMPLETED); }
        @Override public boolean canCancel() { return false; }
    },
    CANCELLED {
        @Override public OrderStatus next() { throw new BusinessException(OrderErrorCode.ALREADY_CANCELLED); }
        @Override public boolean canCancel() { return false; }
    };

    public abstract OrderStatus next();
    public abstract boolean canCancel();
}
```
