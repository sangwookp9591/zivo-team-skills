# Spring Boot 일반 모범 사례

ZIVO 프로젝트 패턴과 함께 적용해야 하는 Spring Boot 전반의 모범 사례.

## 프로젝트 셋업 & 빌드

- **Build Tool**: Maven (`pom.xml`) 또는 Gradle (`build.gradle`)로 의존성 관리
- **Starters**: `spring-boot-starter-web`, `spring-boot-starter-data-jpa` 등 스타터를 활용하여 의존성 간소화
- **패키지 구조**: 계층별(controller/service/repository) 분리보다 **도메인별 패키지** 구성

---

## 의존성 주입 & 컴포넌트

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

## 설정 관리

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

## 요청 검증 (Validation)

DTO에 Java Bean Validation (JSR 380) 어노테이션을 적용하고, 컨트롤러에서 `@Valid`로 검증.

```java
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

검증 실패 시 `@ControllerAdvice`의 글로벌 예외 핸들러에서 일관된 에러 응답 반환.

---

## 테스트

- **단위 테스트**: JUnit 5 + Mockito로 서비스/도메인 로직 검증
- **통합 테스트**: `@SpringBootTest`로 전체 컨텍스트 로드
- **테스트 슬라이스**: 특정 계층만 격리 테스트
  - `@WebMvcTest` — 컨트롤러 계층
  - `@DataJpaTest` — JPA 리포지토리 계층
  - `@MyBatisTest` — MyBatis 매퍼 계층
- **Testcontainers**: 실제 DB(PostgreSQL 등)를 사용한 신뢰성 높은 통합 테스트

---

## 보안

- **Spring Security**: 인증/인가 처리. ZIVO에서는 `@CurrentUser`로 인증된 사용자 ID 주입
- **패스워드 인코딩**: BCrypt 등 강력한 해싱 알고리즘 사용
- **SQL Injection 방지**: Spring Data JPA 또는 MyBatis 파라미터 바인딩 사용 (문자열 결합 금지)
- **XSS 방지**: 출력 인코딩 적용
- **트랜잭션 관리**: `@Transactional`은 UseCase Impl의 서비스 메서드에 선언적 적용
