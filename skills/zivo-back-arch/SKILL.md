---
name: zivo-back-arch
description: ZIVO Backend Architecture Guide - Spring Boot + MyBatis/JPA, DDD/Hexagonal, custom annotations (@NotifyOn, @ApiResponseWrapper, @Loggable). Use this skill whenever working on ZIVO backend code, Spring Boot development, Java backend architecture, REST API design, JPA/MyBatis data access, or any backend feature implementation. Also covers general Spring Boot best practices for DI, configuration, validation, testing, and security.
triggers:
  - spring boot
  - backend
  - DDD
  - hexagonal
  - NotifyOn
  - ApiResponseWrapper
  - Loggable
  - MyBatis
  - JPA
  - java
  - REST API
  - controller
  - service
  - repository
metadata:
  author: ZIVO Team
  version: "2.0.0"
  tags:
    - java
    - spring-boot
    - architecture
    - backend
---

# ZIVO Backend Architecture Guide

Spring Boot + MyBatis, JPA 기반 백엔드. 기존 서비스는 전통적 계층구조, 신규 도메인(qrorder)은 DDD/Hexagonal 구조.

이 가이드는 두 파트로 구성된다:
- **Part A (섹션 1~7)**: ZIVO 프로젝트 고유 아키텍처, 커스텀 어노테이션, 패턴
- **Part B (섹션 8~14)**: 일반 Spring Boot 모범 사례 (DI, 설정, 검증, 테스트, 보안, TDD)

## References (코드 생성용 템플릿)

신규 도메인을 생성하거나 기능을 추가할 때, `references/` 디렉토리의 템플릿을 참조하여 코드를 생성한다. 해당 계층의 코드를 작성하기 전에 관련 템플릿 파일을 읽어라.

| 파일 | 언제 읽는가 |
|------|------------|
| `references/domain-aggregate.java.md` | 신규 Aggregate Root 생성 시 |
| `references/repository-port.java.md` | Repository 포트(인터페이스) 생성 시 |
| `references/usecase.java.md` | UseCase + Command/Result DTO 생성 시 |
| `references/repository-adapter-jpa.java.md` | JPA 기반 Repository 구현체 생성 시 |
| `references/repository-adapter-mybatis.java.md` | MyBatis 기반 Repository 구현체 생성 시 |
| `references/controller.java.md` | Controller + Request/Response DTO 생성 시 |
| `references/error-code.java.md` | 도메인별 ErrorCode enum 생성 시 |
| `references/notify-on.java.md` | @NotifyOn 알림 기능 추가 시 |
| `references/tdd-templates.java.md` | 각 계층별 테스트 코드 작성 시 |

---

## 1. DDD 패키지 구조 (신규 도메인 표준)

```
com.example.demo.{도메인}/
├── application/                    # 애플리케이션 서비스 계층
│   ├── command/                   # 입력 Command DTO
│   ├── result/                    # 출력 Result DTO
│   └── usecase/{기능}/            # UseCase 인터페이스
│       └── impl/                  # UseCase 구현체
├── domain/                         # 도메인 계층 (핵심 비즈니스)
│   ├── aggregate/                 # 애그리게이트 루트 (비즈니스 로직 포함)
│   ├── repository/                # 리포지토리 포트 (인터페이스만)
│   └── shared/enums/              # 공유 도메인 열거형
├── infrastructure/                 # 인프라 계층 (어댑터)
│   ├── external/                  # 외부 서비스 어댑터 (S3, QR 등)
│   └── persistence/
│       ├── adapter/               # Repository 포트 구현체
│       ├── mybatis/mapper/        # [MyBatis] Mapper (Read/Command 분리)
│       └── jpa/                   # [JPA] Entity + Spring Data Repository
│           ├── entity/            # JPA Entity 클래스
│           └── repository/        # JpaRepository 인터페이스
├── interfaces/                     # 프레젠테이션 계층
│   ├── api/{role}/                # REST Controller (admin/user 분리)
│   ├── dto/{role}/
│   │   ├── request/               # API 요청 DTO
│   │   └── response/              # API 응답 DTO
│   └── mapper/                    # Interface ↔ Application 변환 매퍼
└── support/                        # 횡단 관심사
    ├── exception/                 # 도메인별 ErrorCode enum
    └── util/                      # 유틸리티
```

### 계층 간 데이터 흐름

```
Controller → InterfaceMapper → UseCase → Domain Aggregate → Repository Port
   ↑              ↓                                              ↓
Request DTO → Command DTO                              RepositoryAdapter
   ↑              ↓                                         ↓
Response DTO ← Result DTO                        MyBatis Mapper 또는 JPA Repository
```

### 핵심 규칙

- **Aggregate Root**: 비즈니스 로직은 도메인 객체 안에. Factory method(`create()`), 상태 변경(`activate()`, `deactivate()`, `softDelete()`) 포함
- **Repository Port**: `domain/repository/`에 인터페이스만 정의. 구현은 `infrastructure/persistence/adapter/`
- **UseCase**: 인터페이스 + Impl 분리. `@Service`, `@Transactional` 은 Impl에만
- **Persistence 선택**: MyBatis 또는 JPA 중 도메인에 맞게 선택 (혼용 가능)

### MyBatis 방식 (기존 서비스, 복잡한 쿼리)

```java
// infrastructure/persistence/mybatis/mapper/ - Read/Command 분리
@Mapper public interface StoreReadMapper { ... }
@Mapper public interface StoreCommandMapper { ... }

// infrastructure/persistence/adapter/ - 포트 구현
@Repository
@RequiredArgsConstructor
public class StoreRepositoryAdapter implements StoreRepository {
    private final StoreReadMapper readMapper;
    private final StoreCommandMapper commandMapper;
}
```

### JPA 방식 (신규 도메인, 단순 CRUD)

```java
// infrastructure/persistence/jpa/entity/ - JPA Entity (도메인 Aggregate와 분리)
@Entity
@Table(name = "public.my_domain")
@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MyDomainJpaEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String status;
    private LocalDateTime createdAt;

    // JPA Entity ↔ Domain Aggregate 변환
    public static MyDomainJpaEntity from(MyDomain domain) { ... }
    public MyDomain toDomain() { ... }
}

// infrastructure/persistence/jpa/repository/ - Spring Data Repository
public interface MyDomainJpaRepository extends JpaRepository<MyDomainJpaEntity, Long> {
    Optional<MyDomainJpaEntity> findByIdAndDeletedFalse(Long id);
}

// infrastructure/persistence/adapter/ - 포트 구현 (JPA 사용)
@Repository
@RequiredArgsConstructor
public class MyDomainRepositoryAdapter implements MyDomainRepository {
    private final MyDomainJpaRepository jpaRepository;

    @Override
    public Optional<MyDomain> findActiveById(Long id) {
        return jpaRepository.findByIdAndDeletedFalse(id)
            .map(MyDomainJpaEntity::toDomain);
    }

    @Override
    public MyDomain save(MyDomain domain) {
        MyDomainJpaEntity entity = MyDomainJpaEntity.from(domain);
        return jpaRepository.save(entity).toDomain();
    }
}
```

> **주의**: JPA Entity와 Domain Aggregate는 분리. JPA Entity는 `infrastructure` 계층에만 존재하고, `domain/aggregate/`의 도메인 모델과 변환 메서드(`from()`, `toDomain()`)로 연결.

### 공통: Domain Aggregate

```java
// domain/aggregate/ - 비즈니스 로직은 여기에
public class Store {
    public static Store create(String code, String phone, String address, Long userId) {
        // factory method with validation
    }
    public void deactivate(Long userId) {
        if (!isOperable()) throw new BusinessException(QrOrderErrorCode.STORE_ALREADY_DELETED);
        this.active = false;
    }
}

// domain/repository/ - 포트 (인터페이스만, persistence 기술 무관)
public interface StoreRepository {
    Optional<Store> findActiveById(Long storeId);
    Long insertQrCode(Long tableId, String qrKey, String s3Key, Long createdBy);
}
```

---

## 2. @NotifyOn - 선언적 알림 발송

메서드 실행 완료 후 자동으로 알림 이벤트를 발행하는 AOP 어노테이션.

### 파라미터

| 파라미터 | 필수 | 설명 | 예시 |
|---------|------|------|------|
| `type` | O | 알림 유형 | `"ESIM"`, `"REVIEW"`, `"RESERVATION"` |
| `subType` | X | 하위 유형 | `"ORDER_CONFIRMED"`, `"PAYMENT_CANCELLED"` |
| `payload` | X | SpEL 페이로드 추출 | `"#{@esimPayloadBuilder.buildForCreateOrder(#result, #request)}"` |
| `condition` | X | SpEL 조건식 (빈 문자열=항상) | `"#result != null && #result.status == 'CONFIRMED'"` |

### SpEL 컨텍스트

- `#{result}` - 메서드 리턴 값
- `#{args[0]}` - 인덱스 기반 파라미터
- `#{#paramName}` - 이름 기반 파라미터
- `#{@beanName.method()}` - Spring Bean 호출

### 기본 사용법

```java
@NotifyOn(
    type = "REVIEW",
    subType = "REVIEW_REPORTED",
    payload = "#{@reviewPayloadBuilder.buildForReported(#reporterId, #reviewId, #request)}",
    condition = "#reviewId != null"
)
public ReviewReportResponse createReport(Long reporterId, Long reviewId, ReviewReportRequest request) {
    // 비즈니스 로직만 집중
}
```

### 복수 알림 (@NotifyOns)

```java
@NotifyOns({
    @NotifyOn(type = "OPERATION", subType = "PRODUCT_APPROVED",
              payload = "#{@productPayloadBuilder.buildForApproved(#id)}",
              condition = "#result != null && #result.serviceStatus.name() == 'APPROVED'"),
    @NotifyOn(type = "OPERATION", subType = "PRODUCT_REJECTED",
              payload = "#{@productPayloadBuilder.buildForRejected(#id, #rejectionReason)}",
              condition = "#result != null && #result.serviceStatus.name() == 'REJECTED'")
})
public HospitalServiceDetailResponse updateServiceStatus(Long id, String status, String rejectionReason) { ... }
```

### EsimNotifyOnService 패턴 - 알림 전용 Wrapper Service

비즈니스 로직이 다른 서비스에 있을 때, 알림 발송만 담당하는 얇은 래퍼 서비스를 만든다.

```java
@Service
@Transactional
public class EsimNotifyOnService {
    @NotifyOns({
        @NotifyOn(type = "ESIM", subType = "ORDER_CONFIRMED",
                  payload = "#{@esimPayloadBuilder.buildForCreateOrder(#result, #request, #userId)}",
                  condition = "#result != null && #result.status == 'ORDER_CONFIRMED'"),
        @NotifyOn(type = "ESIM", subType = "TRIP_D7_ESIM",
                  payload = "#{@esimPayloadBuilder.buildTripSchedulePayload(#result, #request, #userId, 7)}",
                  condition = "#result != null && ...조건...")
    })
    public CreateOrderInternalResponse createOrderNotify(
            CreateOrderInternalRequest request, Long userId,
            CreateOrderInternalResponse response) {
        return response;  // 로직 없이 결과를 그대로 리턴 → AOP가 알림 처리
    }
}
```

### PayloadBuilder + NotificationPayload 패턴

```java
// Step 1: NotificationPayload 정의
public record MyDomainNotificationPayload(
    Long entityId, Long userId, String status,
    String entityName, String userNickname,
    FcmRouteInfo fcmRoute
) {}

// Step 2: FcmRouteInfo (딥링크)
public record FcmRouteInfo(String targetRoute, String entityId, String extra) {
    public static FcmRouteInfo of(String route) { ... }
    public static FcmRouteInfo of(String route, Object entityId) { ... }
}

// Step 3: PayloadBuilder
@Component
@RequiredArgsConstructor
public class MyDomainPayloadBuilder {
    private final MyDomainRepository myDomainRepository;

    public MyDomainNotificationPayload buildForCreated(MyDomain result) {
        String locale = getUserLocale(result.getUserId());
        return new MyDomainNotificationPayload(
            result.getId(), result.getUserId(), result.getStatus().name(),
            getLocalizedName(result.getId(), locale),
            result.getUserNickname(),
            FcmRouteInfo.of("/my-domain/detail", result.getId())
        );
    }
}

// Step 4: @NotifyOn에서 사용
@NotifyOn(
    type = "MY_DOMAIN", subType = "CREATED",
    payload = "#{@myDomainPayloadBuilder.buildForCreated(#result)}",
    condition = "#result != null && @myDomainPayloadBuilder.canNotify(#result)"
)
public MyDomain create(MyDomainRequest request) { ... }
```

### 처리 흐름

```
메서드 실행 완료 → NotificationAspect (@AfterReturning)
  → SpEL condition 평가 (false면 스킵)
  → SpEL payload 추출 (PayloadBuilder 호출)
  → WorkflowNotificationEvent 발행
  → WorkflowNotificationEventListener (AFTER_COMMIT, @Async)
  → 워크플로우 엔진이 알림 채널 라우팅 (FCM, 카카오, 이메일 등)
```

---

## 3. @ApiResponseWrapper - 통합 응답 포맷

컨트롤러 리턴값을 `ApiResponse<T>`로 자동 래핑.

### 응답 구조

```json
{
  "success": true,
  "status": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-04-03T10:00:00"
}
```

### 사용법

```java
@ApiResponseWrapper
@RestController
@RequestMapping("/api/admin/stores")
public class StoreAdminController {
    @GetMapping
    public CursorResponse<StoreListResponse> getList(StoreListRequest request) {
        return storeService.getList(request);  // 자동 ApiResponse.success(data) 래핑
    }
}
```

### ApiResponse 정적 팩토리

```java
ApiResponse.success()                          // 빈 성공 (200)
ApiResponse.success(data)                      // 데이터 포함 (200)
ApiResponse.error("에러 메시지")                // 서버 에러 (500)
ApiResponse.badRequest("메시지")               // 400
ApiResponse.unauthorized("메시지")             // 401
ApiResponse.forbidden("메시지")                // 403
ApiResponse.notFound("메시지")                 // 404
```

---

## 4. @Loggable - 자동 로깅

```java
@Loggable("약관 정책 수정")
@PatchMapping("/admin/{id}")
public TermsPolicyResponse update(@PathVariable Long id,
                                   @RequestBody TermsPolicyUpdateRequest request,
                                   @CurrentUser Long userId) { ... }
```

출력: `[REQUEST] 약관 정책 수정 - userId: 123, params: {id=5}` / `[SUCCESS] ... elapsed: 45ms`

---

## 5. BusinessException + CommonErrorCode

```java
public enum QrOrderErrorCode implements CommonErrorCode {
    STORE_NOT_FOUND("QR_001", "매장을 찾을 수 없습니다"),
    STORE_TABLE_MISMATCH("QR_002", "테이블이 해당 매장에 속하지 않습니다");
    private final String code;
    private final String message;
}

throw new BusinessException(QrOrderErrorCode.STORE_NOT_FOUND);
```

---

## 6. 페이지네이션

### Cursor 기반 (무한 스크롤)

```java
public class MyListRequest extends CursorRequest {
    private String status;
}
CursorResponse<MyDto> response = CursorResponse.of(dataList, lastItem.getId(), hasNext, size);
```

### Offset 기반 (관리자 페이지)

```java
public class AdminListRequest extends PaginationRequest {
    private String searchKeyword;
}
PaginationResponse pagination = PaginationResponse.of(currentPage, pageSize, totalCount);
```

---

## 7. 컨트롤러 작성 패턴 (종합)

**@NotifyOn은 반드시 @Transactional 서비스에서 사용** (컨트롤러 직접 사용 금지).

```java
@ApiResponseWrapper
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/stores")
public class StoreAdminController {
    private final StoreService storeService;
    private final StoreNotifyOnService storeNotifyOnService;

    @Loggable("매장 목록 조회")
    @GetMapping
    public CursorResponse<StoreListResponse> getList(StoreListRequest request) {
        return storeService.getList(request);
    }

    @Loggable("매장 상태 변경")
    @PatchMapping("/{id}/status")
    public StoreResponse updateStatus(@PathVariable Long id,
                                       @RequestBody StatusRequest request,
                                       @CurrentUser Long userId) {
        StoreResponse result = storeService.updateStatus(id, request, userId);
        storeNotifyOnService.statusChangeNotify(id, result);
        return result;
    }
}
```

---

# Part B: Spring Boot 일반 모범 사례

ZIVO 프로젝트 패턴과 함께 적용해야 하는 Spring Boot 전반의 모범 사례.

---

## 8. 프로젝트 셋업 & 빌드

- **Build Tool**: Maven (`pom.xml`) 또는 Gradle (`build.gradle`)로 의존성 관리
- **Starters**: `spring-boot-starter-web`, `spring-boot-starter-data-jpa` 등 스타터를 활용하여 의존성 간소화
- **패키지 구조**: 계층별(controller/service/repository) 분리보다 **도메인별 패키지** 구성 (섹션 1의 DDD 구조 참고)

---

## 9. 의존성 주입 & 컴포넌트

- **생성자 주입**: 필수 의존성은 항상 생성자 기반 주입. 테스트 용이성과 의존성 명시성을 높인다.
- **불변 필드**: 의존성 필드는 `private final`로 선언

```java
@Service
@RequiredArgsConstructor  // Lombok 활용
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
}
```

- **컴포넌트 스테레오타입**: `@Component`, `@Service`, `@Repository`, `@Controller`/`@RestController`를 목적에 맞게 사용. ZIVO에서는 UseCase Impl에 `@Service`, Repository Adapter에 `@Repository` 적용.

---

## 10. 설정 관리

- **외부화 설정**: `application.yml` 사용 (계층적 구조의 가독성)
- **타입 안전 프로퍼티**: `@ConfigurationProperties`로 설정을 타입 안전한 Java 객체에 바인딩

```java
@ConfigurationProperties(prefix = "app.notification")
public record NotificationProperties(
    String fcmApiKey,
    int retryCount,
    Duration timeout
) {}
```

- **프로파일**: `application-dev.yml`, `application-prod.yml`로 환경별 설정 분리
- **시크릿**: 하드코딩 금지. 환경 변수 또는 AWS Secrets Manager, HashiCorp Vault 등 사용

---

## 11. 요청 검증 (Validation)

DTO에 Java Bean Validation (JSR 380) 어노테이션을 적용하고, 컨트롤러에서 `@Valid`로 검증.

```java
// interfaces/dto/request/
public record StoreCreateRequest(
    @NotBlank(message = "매장 코드는 필수입니다")
    String code,

    @Size(min = 10, max = 11, message = "전화번호 형식이 올바르지 않습니다")
    String phone,

    @NotBlank
    String address
) {}

// Controller
@PostMapping
public StoreResponse create(@Valid @RequestBody StoreCreateRequest request,
                              @CurrentUser Long userId) {
    return storeService.create(request, userId);
}
```

검증 실패 시 `@ControllerAdvice`의 글로벌 예외 핸들러에서 일관된 에러 응답 반환 (섹션 5의 `BusinessException` + `CommonErrorCode` 패턴과 연동).

---

## 12. 테스트

- **단위 테스트**: JUnit 5 + Mockito로 서비스/도메인 로직 검증

```java
@ExtendWith(MockitoExtension.class)
class StoreServiceTest {
    @Mock StoreRepository storeRepository;
    @InjectMocks StoreServiceImpl storeService;

    @Test
    void 매장_비활성화_성공() {
        Store store = Store.create("CODE01", "01012345678", "서울시", 1L);
        when(storeRepository.findActiveById(1L)).thenReturn(Optional.of(store));

        storeService.deactivate(1L, 1L);

        assertThat(store.isActive()).isFalse();
    }
}
```

- **통합 테스트**: `@SpringBootTest`로 전체 컨텍스트 로드
- **테스트 슬라이스**: 특정 계층만 격리 테스트
  - `@WebMvcTest` — 컨트롤러 계층
  - `@DataJpaTest` — JPA 리포지토리 계층
  - `@MyBatisTest` — MyBatis 매퍼 계층
- **Testcontainers**: 실제 DB(PostgreSQL 등)를 사용한 신뢰성 높은 통합 테스트

---

## 13. 보안

- **Spring Security**: 인증/인가 처리. ZIVO에서는 `@CurrentUser`로 인증된 사용자 ID 주입
- **패스워드 인코딩**: BCrypt 등 강력한 해싱 알고리즘 사용
- **SQL Injection 방지**: Spring Data JPA 또는 MyBatis 파라미터 바인딩 사용 (문자열 결합 금지)
- **XSS 방지**: 출력 인코딩 적용
- **트랜잭션 관리**: `@Transactional`은 UseCase Impl의 서비스 메서드에 선언적 적용. 가장 세밀한 단위로 적용

---

## 14. TDD 작성 규약

Red → Green → Refactor 사이클을 따른다. 테스트를 먼저 작성하고, 최소한의 구현으로 통과시킨 뒤, 구조를 개선한다.

### 사이클

1. **Red**: 실패하는 테스트를 먼저 작성. 요구사항을 테스트 코드로 명세화
2. **Green**: 테스트를 통과하는 최소한의 코드 작성. 완벽한 설계가 아니어도 됨
3. **Refactor**: 테스트가 통과하는 상태를 유지하면서 코드 구조 개선

### 테스트 작성 원칙

- **테스트 이름**: 한글로 행위를 명확히 서술 (`매장_비활성화_시_이미_삭제된_매장이면_예외발생`)
- **AAA 패턴**: Arrange(준비) → Act(실행) → Assert(검증) 구조를 일관되게 사용
- **한 테스트 한 검증**: 하나의 테스트는 하나의 행위만 검증. 여러 assert가 필요하면 테스트를 분리
- **테스트 독립성**: 테스트 간 상태 공유 금지. 각 테스트는 독립적으로 실행 가능해야 함

### 계층별 TDD 전략

#### Domain Aggregate (가장 먼저, 가장 많이)

비즈니스 로직의 핵심. 외부 의존성 없이 순수 단위 테스트.

```java
class StoreTest {

    @Test
    void 매장_생성_시_기본_상태는_활성() {
        // Arrange & Act
        Store store = Store.create("CODE01", "01012345678", "서울시 강남구", 1L);

        // Assert
        assertThat(store.isActive()).isTrue();
        assertThat(store.getCode()).isEqualTo("CODE01");
    }

    @Test
    void 이미_비활성화된_매장_재비활성화_시_예외발생() {
        // Arrange
        Store store = Store.create("CODE01", "01012345678", "서울시", 1L);
        store.deactivate(1L);

        // Act & Assert
        assertThatThrownBy(() -> store.deactivate(1L))
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(QrOrderErrorCode.STORE_ALREADY_DELETED);
    }
}
```

#### UseCase (서비스 계층)

도메인 로직 조합과 흐름 검증. Repository는 Mock 처리.

```java
@ExtendWith(MockitoExtension.class)
class DeactivateStoreUseCaseImplTest {

    @Mock StoreRepository storeRepository;
    @InjectMocks DeactivateStoreUseCaseImpl useCase;

    @Test
    void 매장_비활성화_성공() {
        // Arrange
        Store store = Store.create("CODE01", "01012345678", "서울시", 1L);
        when(storeRepository.findActiveById(1L)).thenReturn(Optional.of(store));

        // Act
        useCase.execute(1L, 1L);

        // Assert
        assertThat(store.isActive()).isFalse();
        verify(storeRepository).save(store);
    }

    @Test
    void 존재하지_않는_매장_비활성화_시_예외발생() {
        // Arrange
        when(storeRepository.findActiveById(99L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> useCase.execute(99L, 1L))
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo(QrOrderErrorCode.STORE_NOT_FOUND);
    }
}
```

#### Controller (API 계층)

요청/응답 직렬화, 상태 코드, 검증 에러를 확인. `@WebMvcTest`로 슬라이스 테스트.

```java
@WebMvcTest(StoreAdminController.class)
class StoreAdminControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean StoreService storeService;
    @MockBean StoreNotifyOnService storeNotifyOnService;

    @Test
    void 매장_목록_조회_200() throws Exception {
        // Arrange
        CursorResponse<StoreListResponse> response =
            CursorResponse.of(List.of(), null, false, 20);
        when(storeService.getList(any())).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/api/admin/stores"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }
}
```

#### Repository Adapter (통합 테스트)

실제 DB를 사용한 persistence 검증.

```java
// JPA 방식
@DataJpaTest
class MyDomainRepositoryAdapterTest {

    @Autowired MyDomainJpaRepository jpaRepository;
    private MyDomainRepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new MyDomainRepositoryAdapter(jpaRepository);
    }

    @Test
    void 저장_후_조회_성공() {
        // Arrange
        MyDomain domain = MyDomain.create("테스트", 1L);

        // Act
        MyDomain saved = adapter.save(domain);
        Optional<MyDomain> found = adapter.findActiveById(saved.getId());

        // Assert
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("테스트");
    }
}

// MyBatis 방식
@MyBatisTest
class StoreReadMapperTest {

    @Autowired StoreReadMapper readMapper;

    @Test
    void 활성_매장_목록_조회() {
        // Act
        List<StoreDto> stores = readMapper.findActiveStores(new StoreListRequest());

        // Assert
        assertThat(stores).allMatch(s -> s.isActive());
    }
}
```

### TDD 작성 순서 (신규 도메인)

1. **Domain Aggregate 테스트** → 구현 (비즈니스 규칙 확정)
2. **UseCase 테스트** → 구현 (도메인 조합 흐름 확정)
3. **Repository Adapter 테스트** → 구현 (영속성 검증)
4. **Controller 테스트** → 구현 (API 계약 확정)

안쪽 계층부터 바깥으로 진행한다. 도메인이 확정되어야 UseCase가 안정되고, UseCase가 확정되어야 Controller가 안정된다.

### 테스트 커버리지 기준

- **Domain Aggregate**: 모든 public 메서드, 모든 예외 경로 100% 커버
- **UseCase**: 정상 흐름 + 주요 예외 경로
- **Controller**: 주요 엔드포인트 + 검증 실패 케이스
- **Repository**: CRUD + 커스텀 쿼리
