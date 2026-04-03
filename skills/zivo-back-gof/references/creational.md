# Creational Patterns in Spring Boot

## Table of Contents
- [Factory Method](#factory-method)
- [Abstract Factory](#abstract-factory)
- [Builder](#builder)
- [Singleton](#singleton)

---

## Factory Method

조건에 따라 다른 구현체를 생성해야 할 때. Spring의 `List<Interface>` 자동 수집과 결합하면 새 타입 추가 시 코드 변경이 최소화된다.

### Case: 결제 수단별 처리기

```java
// 1. 인터페이스 정의
public interface PaymentProcessor {
    PaymentMethod getMethod();
    PaymentResult process(PaymentRequest request);
}

// 2. 구현체들 (새 결제 수단 추가 = 클래스 1개 추가)
@Component
public class CardPaymentProcessor implements PaymentProcessor {
    @Override public PaymentMethod getMethod() { return PaymentMethod.CARD; }
    @Override public PaymentResult process(PaymentRequest request) {
        // 카드 결제 로직
        return PaymentResult.success(request.getOrderId());
    }
}

@Component
public class KakaoPayProcessor implements PaymentProcessor {
    @Override public PaymentMethod getMethod() { return PaymentMethod.KAKAO_PAY; }
    @Override public PaymentResult process(PaymentRequest request) {
        // 카카오페이 결제 로직
        return PaymentResult.success(request.getOrderId());
    }
}

@Component
public class BankTransferProcessor implements PaymentProcessor {
    @Override public PaymentMethod getMethod() { return PaymentMethod.BANK_TRANSFER; }
    @Override public PaymentResult process(PaymentRequest request) {
        // 계좌이체 로직
        return PaymentResult.success(request.getOrderId());
    }
}

// 3. Factory (Spring이 모든 구현체를 자동 수집)
@Component
public class PaymentProcessorFactory {
    private final Map<PaymentMethod, PaymentProcessor> processorMap;

    public PaymentProcessorFactory(List<PaymentProcessor> processors) {
        this.processorMap = processors.stream()
            .collect(Collectors.toMap(PaymentProcessor::getMethod, Function.identity()));
    }

    public PaymentProcessor getProcessor(PaymentMethod method) {
        return Optional.ofNullable(processorMap.get(method))
            .orElseThrow(() -> new BusinessException(
                CommonErrorCode.UNSUPPORTED_PAYMENT_METHOD));
    }
}

// 4. 사용
@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentProcessorFactory factory;

    public PaymentResult pay(PaymentRequest request) {
        PaymentProcessor processor = factory.getProcessor(request.getMethod());
        return processor.process(request);
    }
}
```

### Case: 파일 내보내기 형식

```java
public interface FileExporter {
    ExportFormat getFormat();
    byte[] export(List<ExportRow> rows);
}

@Component
public class CsvExporter implements FileExporter {
    @Override public ExportFormat getFormat() { return ExportFormat.CSV; }
    @Override public byte[] export(List<ExportRow> rows) { /* CSV 생성 */ }
}

@Component
public class ExcelExporter implements FileExporter {
    @Override public ExportFormat getFormat() { return ExportFormat.EXCEL; }
    @Override public byte[] export(List<ExportRow> rows) { /* Excel 생성 */ }
}
```

---

## Abstract Factory

관련 객체 묶음을 일관되게 생성해야 할 때. 예: 국가별로 세금 계산기 + 영수증 포맷 + 통화 변환기를 한 세트로 제공.

```java
// 추상 팩토리
public interface RegionalServiceFactory {
    Country getCountry();
    TaxCalculator createTaxCalculator();
    ReceiptFormatter createReceiptFormatter();
    CurrencyConverter createCurrencyConverter();
}

@Component
public class KoreaServiceFactory implements RegionalServiceFactory {
    @Override public Country getCountry() { return Country.KR; }
    @Override public TaxCalculator createTaxCalculator() { return new KoreaTaxCalculator(); }
    @Override public ReceiptFormatter createReceiptFormatter() { return new KoreaReceiptFormatter(); }
    @Override public CurrencyConverter createCurrencyConverter() { return new KrwConverter(); }
}

@Component
public class JapanServiceFactory implements RegionalServiceFactory {
    @Override public Country getCountry() { return Country.JP; }
    @Override public TaxCalculator createTaxCalculator() { return new JapanTaxCalculator(); }
    @Override public ReceiptFormatter createReceiptFormatter() { return new JapanReceiptFormatter(); }
    @Override public CurrencyConverter createCurrencyConverter() { return new JpyConverter(); }
}

// Registry
@Component
public class RegionalServiceRegistry {
    private final Map<Country, RegionalServiceFactory> factoryMap;

    public RegionalServiceRegistry(List<RegionalServiceFactory> factories) {
        this.factoryMap = factories.stream()
            .collect(Collectors.toMap(RegionalServiceFactory::getCountry, Function.identity()));
    }

    public RegionalServiceFactory getFactory(Country country) {
        return Optional.ofNullable(factoryMap.get(country))
            .orElseThrow(() -> new BusinessException(CommonErrorCode.UNSUPPORTED_COUNTRY));
    }
}
```

---

## Builder

생성자 파라미터가 많거나, 선택적 파라미터가 많을 때. Spring Boot에서는 Lombok `@Builder`를 주로 사용하지만, 복잡한 도메인 객체는 직접 Builder를 구현하는 것이 검증 로직을 포함할 수 있어 유리하다.

### Case: 검증 로직이 포함된 Builder

```java
public class SearchCriteria {
    private final String keyword;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final List<String> categories;
    private final SortOrder sortOrder;
    private final int page;
    private final int size;

    private SearchCriteria(Builder builder) {
        this.keyword = builder.keyword;
        this.startDate = builder.startDate;
        this.endDate = builder.endDate;
        this.categories = builder.categories;
        this.sortOrder = builder.sortOrder;
        this.page = builder.page;
        this.size = builder.size;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String keyword;
        private LocalDate startDate;
        private LocalDate endDate;
        private List<String> categories = List.of();
        private SortOrder sortOrder = SortOrder.NEWEST;
        private int page = 0;
        private int size = 20;

        public Builder keyword(String keyword) { this.keyword = keyword; return this; }
        public Builder dateRange(LocalDate start, LocalDate end) {
            this.startDate = start;
            this.endDate = end;
            return this;
        }
        public Builder categories(List<String> categories) { this.categories = categories; return this; }
        public Builder sortOrder(SortOrder order) { this.sortOrder = order; return this; }
        public Builder page(int page) { this.page = page; return this; }
        public Builder size(int size) { this.size = size; return this; }

        public SearchCriteria build() {
            // 검증 로직
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                throw new BusinessException(CommonErrorCode.INVALID_DATE_RANGE);
            }
            if (size > 100) {
                throw new BusinessException(CommonErrorCode.PAGE_SIZE_EXCEEDED);
            }
            return new SearchCriteria(this);
        }
    }
}

// 사용
SearchCriteria criteria = SearchCriteria.builder()
    .keyword("Spring Boot")
    .dateRange(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31))
    .categories(List.of("TECH", "JAVA"))
    .sortOrder(SortOrder.RELEVANCE)
    .build();
```

---

## Singleton

Spring Bean은 기본적으로 Singleton 스코프이므로 별도 구현이 불필요하다. `@Component`, `@Service` 등으로 등록하면 Spring Container가 싱글톤을 보장한다.

```java
// Spring이 이미 Singleton으로 관리
@Component
public class ApplicationConfig {
    // 이 빈은 애플리케이션에서 단 하나만 존재
}

// 명시적으로 Scope를 변경할 때만 별도 설정
@Component
@Scope("prototype")  // 요청마다 새 인스턴스
public class RequestScopedBean { }
```

Spring을 쓰고 있다면 직접 Singleton 패턴을 구현할 일이 거의 없다. `private static instance` + `synchronized` 같은 전통적 싱글톤은 Spring 프로젝트에서 안티패턴이다.
