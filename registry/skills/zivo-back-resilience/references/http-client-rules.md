# HTTP Client Rules — 외부 API 호출 가이드

## 원칙

ZIVO 백엔드에서 외부 API를 호출할 때 반드시 지켜야 할 규칙.
이 규칙을 무시하면 timeout 미설정 → Tomcat 스레드 무한 대기 → 전체 API 502로 이어진다.

---

## 1. RestTemplate 규칙

### 절대 금지

```java
// ❌ WRONG — timeout 미설정, 무한 대기 가능
RestTemplate restTemplate = new RestTemplate();
restTemplate.getForObject(url, String.class);

// ❌ WRONG — Bean 주입 없이 직접 생성
private final RestTemplate restTemplate = new RestTemplate();
```

### 올바른 사용법

```java
// ✅ CORRECT — timeout 설정된 Bean 주입
@RequiredArgsConstructor
public class MyExternalService {
    private final RestTemplate restTemplate; // HttpClientConfig에서 설정된 Bean
}
```

### 새 외부 API용 RestTemplate Bean 생성 시

```java
@Bean("myExternalRestTemplate")
public RestTemplate myExternalRestTemplate() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));  // connect: 3초
    factory.setReadTimeout(Duration.ofSeconds(5));      // read: 5초
    return new RestTemplate(factory);
}
```

### timeout 기준

| 외부 API 유형 | Connect Timeout | Read Timeout | 근거 |
|--------------|----------------|-------------|------|
| 지도/위치 (Naver, Google) | 3초 | 5초 | 사용자 대면 API, 빠른 응답 필요 |
| 결제 (NicePay) | 5초 | 15초 | 결제는 신중하게, 그러나 30초는 과도 |
| eSIM 외부 API | 3초 | 10초 | 현재 설정 유지 |
| 호텔 API (ONDA) | 5초 | 30초 | 대량 데이터, 현재 60초는 축소 검토 |
| 번역 API | 2초 | 3초 | 현재 설정 유지 |
| 택시 (TADA) | 3초 | 5초 | 실시간 서비스, 빠른 응답 필요 |
| 기타/기본 | 5초 | 10초 | 현재 default RestTemplate |

---

## 2. WebClient 규칙

### 절대 금지

```java
// ❌ WRONG — timeout 미설정 WebClient
WebClient client = WebClient.builder().build();
String result = client.get().uri(url).retrieve()
    .bodyToMono(String.class)
    .block(); // timeout 없는 block = 무한 대기

// ❌ WRONG — .block() timeout 파라미터 없음
someWebClient.post().retrieve().bodyToMono(String.class).block();
```

### 올바른 사용법

```java
// ✅ CORRECT — timeout 설정된 WebClient Bean
@Bean("myWebClient")
public WebClient myWebClient() {
    HttpClient httpClient = HttpClient.create()
        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3000)
        .doOnConnected(conn -> conn
            .addHandlerLast(new ReadTimeoutHandler(5, TimeUnit.SECONDS))
            .addHandlerLast(new WriteTimeoutHandler(5, TimeUnit.SECONDS)));

    return WebClient.builder()
        .clientConnector(new ReactorClientHttpConnector(httpClient))
        .baseUrl(baseUrl)
        .build();
}

// ✅ CORRECT — .block() 사용 시 반드시 timeout
String result = webClient.get().uri(url)
    .retrieve()
    .bodyToMono(String.class)
    .timeout(Duration.ofSeconds(5))           // reactive timeout
    .block(Duration.ofSeconds(6));            // block timeout (reactive보다 약간 길게)
```

### `.block()` 규칙

| 상황 | 허용 여부 | 조건 |
|------|----------|------|
| Controller/Service에서 동기 응답 필요 | 허용 | `.block(Duration.ofSeconds(N))` 필수 |
| Async executor 내부 | 허용 | `.block(Duration)` 필수 |
| Reactive chain 내부 | **금지** | `.flatMap()` 사용 |
| timeout 없이 `.block()` | **금지** | 항상 Duration 파라미터 필수 |

---

## 3. 순차 외부 호출 병렬화

### 문제 패턴

```java
// ❌ WRONG — 4개 API 순차 호출 = 최대 4 × timeout 대기
String translated = translationService.translate(query);      // ~3초
List<Place> google = googlePlaces.search(translated);         // ~5초
List<Address> naver = naverGeocoding.search(translated);      // ~5초
List<Place> local = naverLocal.search(translated);            // ~5초
// 최악: 18초+ (timeout 미설정 시 무한)
```

### 올바른 패턴

```java
// ✅ CORRECT — 독립적인 호출은 병렬 실행
String translated = translationService.translate(query); // 먼저 번역 (의존성)

CompletableFuture<List<Place>> googleFuture =
    CompletableFuture.supplyAsync(() -> googlePlaces.search(translated), executor);
CompletableFuture<List<Address>> naverFuture =
    CompletableFuture.supplyAsync(() -> naverGeocoding.search(translated), executor);
CompletableFuture<List<Place>> localFuture =
    CompletableFuture.supplyAsync(() -> naverLocal.search(translated), executor);

CompletableFuture.allOf(googleFuture, naverFuture, localFuture)
    .get(10, TimeUnit.SECONDS); // 전체 timeout 10초

List<Place> google = googleFuture.get();
List<Address> naver = naverFuture.get();
List<Place> local = localFuture.get();
// 최악: ~5초 (가장 느린 API 기준)
```

### 규칙

- 순차 외부 API 호출 **2개 초과 금지** → 3개 이상이면 반드시 병렬화
- 의존 관계가 있는 호출(예: 번역 → 검색)만 순차 허용
- `CompletableFuture.allOf().get(timeout)` 또는 `Mono.zip()` 사용

---

## 4. Circuit Breaker 적용

### 외부 API에 circuit breaker가 없으면

외부 API 장애 → 모든 요청이 timeout까지 대기 → Tomcat 스레드 고갈 → 전체 서비스 다운

### 적용 패턴

```java
@Service
@RequiredArgsConstructor
public class NaverGeocodingService {

    private final RestTemplate restTemplate;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public GeocodingResult reverseGeocode(double lat, double lng) {
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("naverGeocoding");

        return cb.executeSupplier(() -> {
            // 외부 API 호출
            return restTemplate.getForObject(url, GeocodingResponse.class);
        });
    }
}
```

### Circuit Breaker 설정 기준

```properties
# 외부 API용 기본 설정
resilience4j.circuitbreaker.instances.{name}.sliding-window-type=COUNT_BASED
resilience4j.circuitbreaker.instances.{name}.sliding-window-size=20
resilience4j.circuitbreaker.instances.{name}.minimum-number-of-calls=10
resilience4j.circuitbreaker.instances.{name}.failure-rate-threshold=50
resilience4j.circuitbreaker.instances.{name}.wait-duration-in-open-state=10s
resilience4j.circuitbreaker.instances.{name}.permitted-number-of-calls-in-half-open-state=5
```

### 현재 상태

| 서비스 | Circuit Breaker | 상태 |
|--------|----------------|------|
| Claude/Gemini/OpenAI | ✅ 있음 | OK |
| Redis | ✅ 있음 | OK |
| RAG Embedding | ✅ 있음 | OK |
| **Naver Geocoding** | **없음** | 추가 필요 |
| **Google Places** | **없음** | 추가 필요 |
| **TADA** | **없음** | 추가 필요 |
| **eSIM** | **없음** | 추가 필요 |
| **NicePay** | **없음** | 추가 필요 |
| **Bizppurio** | **없음** | 추가 필요 |

---

## 5. 에러 처리 & Fallback

### 외부 API 호출 시 필수 에러 처리

```java
// ✅ CORRECT — 적절한 fallback과 로깅
public GeocodingResult reverseGeocode(double lat, double lng) {
    try {
        long start = System.currentTimeMillis();
        GeocodingResult result = restTemplate.getForObject(url, GeocodingResult.class);
        log.info("[EXTERNAL_API] naverGeocoding.reverseGeocode elapsed={}ms",
                System.currentTimeMillis() - start);
        return result;
    } catch (ResourceAccessException e) {
        // timeout 또는 네트워크 오류
        log.warn("[EXTERNAL_API] naverGeocoding timeout: {}", e.getMessage());
        return null; // 또는 fallback 로직
    } catch (HttpClientErrorException e) {
        // 4xx 에러
        log.warn("[EXTERNAL_API] naverGeocoding client error: {} {}", e.getStatusCode(), e.getMessage());
        return null;
    } catch (Exception e) {
        log.error("[EXTERNAL_API] naverGeocoding unexpected error", e);
        return null;
    }
}
```

### 로깅 포맷 (통일)

```
[EXTERNAL_API] service={}, method={}, url={}, elapsed={}ms, status={}, error={}
```

모든 외부 API 호출에 이 형식의 로그를 남겨야 프로덕션에서 병목을 추적할 수 있다.

---

## 6. 체크리스트 — 외부 API 연동 PR 리뷰

새 외부 API 연동 또는 기존 연동 수정 시 다음을 확인:

- [ ] Connect timeout 설정됨 (3~5초)
- [ ] Read timeout 설정됨 (5~15초)
- [ ] `.block()` 사용 시 Duration 파라미터 있음
- [ ] 순차 호출 3개 이상이면 병렬화됨
- [ ] Circuit breaker 적용됨
- [ ] 에러 처리 + fallback 있음
- [ ] 외부 API 호출 시간 로깅 있음
- [ ] timeout 설정된 RestTemplate/WebClient Bean 사용 (직접 생성 아님)
