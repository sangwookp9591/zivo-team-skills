# Structural Patterns in Spring Boot

## Table of Contents
- [Adapter](#adapter)
- [Decorator](#decorator)
- [Proxy (AOP)](#proxy-aop)
- [Facade](#facade)
- [Composite](#composite)

---

## Adapter

외부 라이브러리나 레거시 시스템의 인터페이스가 우리 도메인 인터페이스와 맞지 않을 때. 어댑터를 두면 외부 변경이 도메인 코드로 전파되지 않는다.

### Case: 외부 SMS API 어댑터

```java
// 도메인이 기대하는 인터페이스
public interface SmsSender {
    void send(String phoneNumber, String message);
}

// 외부 라이브러리 (우리가 수정할 수 없음)
public class TwilioClient {
    public TwilioResponse sendMessage(TwilioRequest request) { ... }
}

// Adapter: 외부 라이브러리를 우리 인터페이스에 맞춤
@Component
@RequiredArgsConstructor
public class TwilioSmsSenderAdapter implements SmsSender {
    private final TwilioClient twilioClient;
    private final TwilioProperties properties;

    @Override
    public void send(String phoneNumber, String message) {
        TwilioRequest request = TwilioRequest.builder()
            .from(properties.getSenderNumber())
            .to(phoneNumber)
            .body(message)
            .build();
        TwilioResponse response = twilioClient.sendMessage(request);

        if (!response.isSuccess()) {
            throw new BusinessException(CommonErrorCode.SMS_SEND_FAILED);
        }
    }
}
```

### Case: 결제 게이트웨이 어댑터

```java
// 도메인 포트
public interface PaymentGateway {
    PaymentResult charge(Money amount, String cardToken);
    PaymentResult refund(String transactionId, Money amount);
}

// 토스페이먼츠 어댑터
@Component
@RequiredArgsConstructor
public class TossPaymentsAdapter implements PaymentGateway {
    private final TossPaymentsClient client;

    @Override
    public PaymentResult charge(Money amount, String cardToken) {
        var response = client.confirmPayment(new TossConfirmRequest(
            cardToken, amount.getValue().longValue(), amount.getCurrency()
        ));
        return PaymentResult.of(response.getPaymentKey(), response.getStatus());
    }

    @Override
    public PaymentResult refund(String transactionId, Money amount) {
        var response = client.cancelPayment(transactionId,
            new TossCancelRequest(amount.getValue().longValue(), "고객 요청"));
        return PaymentResult.of(response.getPaymentKey(), response.getStatus());
    }
}
```

---

## Decorator

기존 객체의 기능을 동적으로 확장할 때. 상속 없이 기능을 조합할 수 있다. Spring에서는 같은 인터페이스를 구현하면서 내부에 원본 객체를 감싸는 형태.

### Case: 로깅 + 캐싱 + 재시도 데코레이터

```java
public interface ProductService {
    Product findById(Long id);
}

// 핵심 구현
@Component("coreProductService")
@RequiredArgsConstructor
public class CoreProductService implements ProductService {
    private final ProductRepository repository;

    @Override
    public Product findById(Long id) {
        return repository.findActiveById(id)
            .orElseThrow(() -> new BusinessException(ProductErrorCode.NOT_FOUND));
    }
}

// 캐싱 데코레이터
@Component
@Primary
@RequiredArgsConstructor
public class CachingProductService implements ProductService {
    @Qualifier("coreProductService")
    private final ProductService delegate;
    private final CacheManager cacheManager;

    @Override
    public Product findById(Long id) {
        Cache cache = cacheManager.getCache("products");
        Product cached = cache.get(id, Product.class);
        if (cached != null) return cached;

        Product product = delegate.findById(id);
        cache.put(id, product);
        return product;
    }
}

// 또는 Spring의 @Cacheable을 사용 (더 간단)
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {
    private final ProductRepository repository;

    @Cacheable(value = "products", key = "#id")
    @Override
    public Product findById(Long id) {
        return repository.findActiveById(id)
            .orElseThrow(() -> new BusinessException(ProductErrorCode.NOT_FOUND));
    }
}
```

### Case: API 응답 enrichment

```java
public interface UserProfileProvider {
    UserProfile getProfile(Long userId);
}

@Component("basicProfileProvider")
public class BasicUserProfileProvider implements UserProfileProvider {
    @Override public UserProfile getProfile(Long userId) {
        // 기본 프로필 조회
    }
}

@Component
@Primary
public class EnrichedUserProfileProvider implements UserProfileProvider {
    private final UserProfileProvider delegate;
    private final BadgeService badgeService;
    private final ActivityService activityService;

    @Override
    public UserProfile getProfile(Long userId) {
        UserProfile profile = delegate.getProfile(userId);
        profile.setBadges(badgeService.getBadges(userId));
        profile.setRecentActivity(activityService.getRecent(userId));
        return profile;
    }
}
```

---

## Proxy (AOP)

메서드 호출 전후에 횡단 관심사(로깅, 인증, 트랜잭션, 캐싱)를 추가할 때. Spring AOP가 Proxy 패턴을 자동으로 구현해준다.

### Case: 커스텀 AOP — 실행 시간 측정

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface MeasureExecutionTime {
    String value() default "";
}

@Aspect
@Component
@Slf4j
public class ExecutionTimeAspect {

    @Around("@annotation(measure)")
    public Object measureTime(ProceedingJoinPoint joinPoint, MeasureExecutionTime measure)
            throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return joinPoint.proceed();
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            String label = measure.value().isEmpty()
                ? joinPoint.getSignature().toShortString()
                : measure.value();
            log.info("[PERF] {} elapsed: {}ms", label, elapsed);
        }
    }
}

// 사용
@MeasureExecutionTime("주문 생성")
public OrderResponse createOrder(OrderRequest request) { ... }
```

### Case: 권한 검증 AOP

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireRole {
    String[] value();
}

@Aspect
@Component
@RequiredArgsConstructor
public class RoleCheckAspect {
    private final SecurityContextProvider securityContext;

    @Before("@annotation(requireRole)")
    public void checkRole(RequireRole requireRole) {
        String currentRole = securityContext.getCurrentUserRole();
        boolean hasRole = Arrays.stream(requireRole.value())
            .anyMatch(role -> role.equals(currentRole));
        if (!hasRole) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN);
        }
    }
}
```

---

## Facade

복잡한 서브시스템들을 하나의 단순한 인터페이스 뒤로 숨길 때. 클라이언트가 여러 서비스를 직접 조합하는 대신 Facade가 조율한다.

### Case: 주문 처리 Facade

```java
@Service
@RequiredArgsConstructor
public class OrderFacade {
    private final InventoryService inventoryService;
    private final PaymentService paymentService;
    private final ShippingService shippingService;
    private final NotificationService notificationService;

    @Transactional
    public OrderResult placeOrder(OrderRequest request) {
        // 1. 재고 확인 및 차감
        inventoryService.reserve(request.getItems());

        // 2. 결제 처리
        PaymentResult payment = paymentService.charge(request.getPayment());

        // 3. 배송 생성
        ShippingInfo shipping = shippingService.create(request.getAddress(), request.getItems());

        // 4. 알림 발송
        notificationService.sendOrderConfirmation(request.getUserId(), payment, shipping);

        return OrderResult.of(payment, shipping);
    }
}

// Controller는 Facade만 호출
@RestController
@RequiredArgsConstructor
public class OrderController {
    private final OrderFacade orderFacade;

    @PostMapping("/api/orders")
    public OrderResult createOrder(@Valid @RequestBody OrderRequest request) {
        return orderFacade.placeOrder(request);
    }
}
```

---

## Composite

트리 구조를 균일한 인터페이스로 다룰 때. 개별 객체와 객체 그룹을 동일하게 처리한다.

### Case: 메뉴 / 카테고리 트리

```java
public interface MenuComponent {
    String getName();
    BigDecimal getPrice();
    List<MenuComponent> getChildren();
    void add(MenuComponent component);
}

// Leaf (개별 메뉴)
@Getter
public class MenuItem implements MenuComponent {
    private final String name;
    private final BigDecimal price;

    @Override public List<MenuComponent> getChildren() { return List.of(); }
    @Override public void add(MenuComponent component) {
        throw new UnsupportedOperationException("메뉴 아이템에 하위 항목을 추가할 수 없습니다");
    }
}

// Composite (카테고리 = 메뉴 묶음)
@Getter
public class MenuCategory implements MenuComponent {
    private final String name;
    private final List<MenuComponent> children = new ArrayList<>();

    @Override
    public BigDecimal getPrice() {
        // 하위 항목의 가격 합산
        return children.stream()
            .map(MenuComponent::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public void add(MenuComponent component) {
        children.add(component);
    }
}

// 사용: 전체 메뉴 트리의 총 금액을 재귀적으로 계산
MenuCategory lunch = new MenuCategory("점심 세트");
lunch.add(new MenuItem("스테이크", new BigDecimal("25000")));
lunch.add(new MenuItem("샐러드", new BigDecimal("8000")));

MenuCategory drinks = new MenuCategory("음료");
drinks.add(new MenuItem("커피", new BigDecimal("4000")));
drinks.add(new MenuItem("주스", new BigDecimal("5000")));

lunch.add(drinks);

BigDecimal total = lunch.getPrice();  // 42000
```

### Case: 권한 정책 트리

```java
public interface PermissionRule {
    boolean isAllowed(UserContext user, ResourceContext resource);
}

// Leaf
public class RoleBasedRule implements PermissionRule {
    private final Set<String> allowedRoles;
    @Override public boolean isAllowed(UserContext user, ResourceContext resource) {
        return allowedRoles.contains(user.getRole());
    }
}

// Composite (AND 조건)
public class AllOfRule implements PermissionRule {
    private final List<PermissionRule> rules;
    @Override public boolean isAllowed(UserContext user, ResourceContext resource) {
        return rules.stream().allMatch(r -> r.isAllowed(user, resource));
    }
}

// Composite (OR 조건)
public class AnyOfRule implements PermissionRule {
    private final List<PermissionRule> rules;
    @Override public boolean isAllowed(UserContext user, ResourceContext resource) {
        return rules.stream().anyMatch(r -> r.isAllowed(user, resource));
    }
}
```
