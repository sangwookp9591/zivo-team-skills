---
name: zivo-back-resilience
description: ZIVO Backend Resilience & Performance Guard - 외부 API timeout, 커넥션 풀, 스레드 고갈, .block() 방지, circuit breaker, 캐시 전략 가이드. 새 API/외부 연동 추가, 성능 이슈 디버깅, RestTemplate/WebClient 사용 시 자동 적용.
triggers:
  - timeout
  - 502
  - 500
  - RestTemplate
  - WebClient
  - OkHttp
  - HttpClient
  - 외부 API
  - external API
  - geocoding
  - tada
  - esim
  - directions
  - circuit breaker
  - resilience
  - connection pool
  - HikariCP
  - thread pool
  - block()
  - 커넥션 풀
  - 스레드 고갈
  - thread starvation
  - pool exhaustion
  - 성능
  - performance
  - 느린 쿼리
  - slow query
  - latency
  - retry
  - fallback
  - cache
  - 캐시
metadata:
  author: ZIVO Team
  version: "1.0.0"
  tags:
    - java
    - spring-boot
    - resilience
    - performance
    - timeout
    - backend
---

# ZIVO Backend Resilience & Performance Guard

ZIVO 백엔드에서 반복 발생하는 timeout / 500 / 502 문제의 근본 원인과 방지 규칙을 정리한 스킬.
새 API 추가, 외부 연동 구현, 성능 이슈 디버깅 시 반드시 이 규칙을 따른다.

## References 라우팅

작업에 맞는 references 파일을 읽고 따른다.

| 작업 | 읽을 파일 |
|------|----------|
| 외부 API 클라이언트 생성/수정 | `references/http-client-rules.md` |
| DB 쿼리 작성/최적화 | `references/query-performance.md` |
| 스레드/커넥션 풀 설정 | `references/pool-thread-rules.md` |
| 캐시 전략 수립 | `references/caching-strategy.md` |
| 에러 패턴 디버깅 | `references/error-diagnosis.md` |

## 핵심 규칙 요약 (모든 백엔드 작업 시 체크)

### 절대 금지 사항

1. **timeout 미설정 RestTemplate/WebClient 금지**
   - `new RestTemplate()` 단독 사용 금지 → 반드시 timeout 설정된 Bean 사용
   - `WebClient.builder().build()` 단독 사용 금지 → 반드시 timeout 설정된 Bean 사용
2. **`.block()` 무조건 금지가 아니라, timeout 파라미터 필수**
   - `.block()` → `.block(Duration.ofSeconds(N))` 필수
3. **순차 외부 API 호출 2개 초과 금지** → `CompletableFuture.allOf` 병렬화
4. **OFFSET 페이지네이션 신규 작성 금지** → cursor 기반 필수
5. **`Thread.sleep()` 요청 처리 경로에서 금지** → `Mono.delay()` 또는 스케줄러 사용
6. **CallerRunsPolicy executor에 blocking 작업 금지**

### 필수 적용 사항

1. 외부 API 호출 시: connect 3~5초, read 5~10초 timeout 설정
2. 외부 API 호출 시: circuit breaker 적용 (50% 실패율, 10초 open)
3. 자주 안 변하는 데이터: 캐시 적용 (countries, categories 등)
4. JWT filter: User 조회 캐시 적용 (Redis/Caffeine, TTL 5분)
5. 복잡 쿼리(5+ JOIN): EXPLAIN ANALYZE 확인 후 커밋

## 현재 설정값 참조

| 항목 | 값 | 파일 |
|------|-----|------|
| Tomcat max threads | 미설정 (기본 200) | application.properties |
| HikariCP max pool | 20 | application.properties:22 |
| HikariCP connection timeout | 30초 | application.properties:24 |
| MyBatis statement timeout | 30초 | application.properties:63 |
| Redis max-active | 16 | application.properties:290 |
| Redis timeout | 3초 | application.properties:286 |
| Default RestTemplate | 5s/10s | HttpClientConfig.java:24-32 |
| OpenSearch | 3s connect/10s socket | OpenSearchClientConfig.java |

## 위험 클라이언트 목록 (timeout 미설정 — 수정 필요)

| 클라이언트 | 파일 | 상태 |
|-----------|------|------|
| NaverGeocodingService | service/NaverGeocodingService.java | timeout 미설정 |
| GooglePlacesService | service/GooglePlacesService.java | timeout 미설정 |
| TadaApiService | service/TadaApiService.java | timeout 미설정 |
| NaverLocalSearchService | service/NaverLocalSearchService.java | timeout 미설정 |
| ExchangeRateClient | service/esim/.../ExchangeRateClient.java | timeout 미설정 |
