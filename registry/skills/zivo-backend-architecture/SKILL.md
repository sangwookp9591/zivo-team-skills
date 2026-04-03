---
name: zivo-backend-architecture
description: ZIVO Backend Architecture Guide - Spring Boot + MyBatis/JPA, DDD/Hexagonal, custom annotations (@NotifyOn, @ApiResponseWrapper, @Loggable)
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
metadata:
  author: ZIVO Team
  version: "1.0.0"
  tags:
    - java
    - spring-boot
    - architecture
    - backend
---

# ZIVO Backend Architecture Guide

Spring Boot + MyBatis, JPA 기반 백엔드. 기존 서비스는 전통적 계층구조, 신규 도메인(qrorder)은 DDD/Hexagonal 구조.

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
