# Pool & Thread Rules — 커넥션 풀 / 스레드 관리 가이드

## 원칙

Tomcat 스레드(200) > HikariCP 커넥션(20) 비율 불균형은 커넥션 풀 고갈의 근본 원인.
스레드가 커넥션을 얻지 못하면 30초 대기 후 실패 → 사용자에겐 502/timeout으로 보인다.

---

## 1. HikariCP 커넥션 풀

### 현재 설정 (application.properties)

```properties
spring.datasource.hikari.maximum-pool-size=${HIKARI_MAXIMUM_POOL_SIZE:20}
spring.datasource.hikari.minimum-idle=${HIKARI_MINIMUM_IDLE:10}
spring.datasource.hikari.connection-timeout=${HIKARI_CONNECTION_TIMEOUT:30000}
spring.datasource.hikari.idle-timeout=${HIKARI_IDLE_TIMEOUT:300000}
spring.datasource.hikari.max-lifetime=${HIKARI_MAX_LIFETIME:1200000}
spring.datasource.hikari.leak-detection-threshold=${HIKARI_LEAK_DETECTION_THRESHOLD:60000}
```

### 규칙

| 규칙 | 설명 |
|------|------|
| pool size = Tomcat threads × 0.3 ~ 0.5 | 200 스레드면 60~100이 적정. 현재 20은 부족 |
| connection-timeout ≤ 10초 | 30초는 사용자 체감 너무 김. 10초 권장 |
| leak-detection-threshold ≤ 30초 | 현재 60초. 쿼리가 30초 이상이면 문제 |

### 권장 설정

```properties
# Tomcat threads를 100으로 줄이고, pool을 40으로 늘리는 것이 이상적
server.tomcat.threads.max=100
spring.datasource.hikari.maximum-pool-size=40
spring.datasource.hikari.minimum-idle=20
spring.datasource.hikari.connection-timeout=10000
spring.datasource.hikari.leak-detection-threshold=30000
```

### 풀 고갈 징후 모니터링

```bash
# 로그에서 풀 고갈 확인
grep -i "connection is not available" app.log
grep -i "HikariPool.*active=" app.log
grep -i "leak detection" app.log

# Actuator 메트릭
curl localhost:8080/actuator/metrics/hikaricp.connections.active
curl localhost:8080/actuator/metrics/hikaricp.connections.pending
curl localhost:8080/actuator/metrics/hikaricp.connections.timeout
```

---

## 2. Tomcat 스레드 풀

### 현재 설정

명시적 설정 없음 (Spring Boot 기본값 사용).

| 항목 | 기본값 | 권장값 |
|------|--------|--------|
| `server.tomcat.threads.max` | 200 | 100 |
| `server.tomcat.threads.min-spare` | 10 | 20 |
| `server.tomcat.connection-timeout` | 60초 | 30초 |
| `server.tomcat.accept-count` | 100 | 50 |

### 왜 200 → 100으로 줄이는가

- 200 스레드가 모두 외부 API를 대기하면 HikariCP 20개로는 감당 불가
- 100으로 줄이고 HikariCP를 40으로 올리면 비율이 2.5:1로 개선
- 초과 요청은 `accept-count` 큐에서 대기 (적절한 backpressure)

---

## 3. Redis 커넥션 풀

### 현재 설정 (application.properties)

```properties
spring.data.redis.lettuce.pool.max-active=16
spring.data.redis.lettuce.pool.max-idle=8
spring.data.redis.lettuce.pool.min-idle=2
spring.data.redis.lettuce.pool.max-wait=3000
```

### 규칙

- **max-active 32 이상 권장**: JwtAuthFilter에 User 캐시 추가 시 Redis 부하 증가
- Redis 풀 고갈 시 `max-wait=3000`(3초) 후 실패 → 요청 처리 지연

---

## 4. Async Executor 규칙

### CallerRunsPolicy 위험

```java
// ⚠️ 현재 설정 — 큐 포화 시 Tomcat 스레드에서 직접 실행
executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
```

CallerRunsPolicy는 큐가 가득 차면 **호출한 스레드(=Tomcat 요청 스레드)**에서 작업을 실행한다.
해당 작업에 `Thread.sleep()`, `.block()`, 외부 API 호출이 있으면 요청 스레드가 블로킹된다.

### 규칙

| 상황 | 정책 | 이유 |
|------|------|------|
| 알림/로깅 (유실 허용) | `DiscardPolicy` 또는 `DiscardOldestPolicy` | 요청 스레드 보호 |
| 중요 작업 (유실 불가) | `CallerRunsPolicy` + **blocking 코드 금지** | 큐 크기 충분히 확보 |
| 결제/주문 | 별도 executor + 충분한 큐 | 절대 유실 불가 |

### 현재 executor별 위험도

| Executor | Policy | 내부 blocking | 위험도 |
|----------|--------|--------------|--------|
| notificationExecutor | CallerRuns | 낮음 | 중간 |
| fcmBatchExecutor | CallerRuns | `Thread.sleep(50)` + Semaphore | **높음** |
| translationSyncTaskExecutor | CallerRuns | `Thread.sleep(6000)` on CB OPEN | **높음** |
| hotelReservationLogExecutor | CallerRuns | 낮음 | 중간 |
| chatTaskExecutor | CallerRuns | 낮음 | 중간 |

### 수정 방향

```java
// fcmBatchExecutor — Thread.sleep 제거, Semaphore를 Reactor로 전환
// translationSyncTaskExecutor — Thread.sleep(6000)을 스케줄러 기반으로 전환
// 또는 CallerRunsPolicy 대신 DiscardOldestPolicy + 로깅
```

---

## 5. JwtAuthenticationFilter DB 조회 최적화

### 현재 문제

```java
// JwtAuthenticationFilter.java — 매 인증 요청마다 실행
User user = userRepository.findById(userId); // DB 커넥션 사용
```

- 초당 100 요청 = 초당 100 DB 조회 (User 테이블)
- HikariCP 20개 중 상당수가 이 조회에 소비

### 해결: Redis/Caffeine 캐시

```java
// ✅ 권장 패턴
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserCacheService userCacheService; // 캐시 래퍼

    @Override
    protected void doFilterInternal(...) {
        // ...
        User user = userCacheService.getUserById(userId); // 캐시 우선 조회
        // ...
    }
}

@Service
@RequiredArgsConstructor
public class UserCacheService {

    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;

    @Cacheable(value = "users", key = "#userId", unless = "#result == null")
    public User getUserById(Long userId) {
        return userRepository.findById(userId);
    }
}
```

- TTL: 5분 (사용자 정보 변경 시 캐시 무효화)
- 캐시 적중률 99%+ 예상 (사용자 정보는 거의 안 변함)
- DB 조회 100/초 → 1~2/초로 감소

---

## 6. Scheduled Task 규칙

### 현재 문제

스케줄러 태스크가 기본 스레드 풀(1개)에서 실행. 하나가 오래 걸리면 다른 스케줄 지연.

### 규칙

```java
// ✅ 스케줄러 전용 스레드 풀 설정
@Configuration
public class SchedulerConfig implements SchedulingConfigurer {
    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        registrar.setScheduler(Executors.newScheduledThreadPool(4));
    }
}
```

- 스케줄 태스크가 3개 이상이면 전용 스레드 풀 설정 필수
- 스케줄 태스크 내부에서 장시간 blocking 금지 → batch 처리로 분할

---

## 7. 체크리스트

새 기능 또는 설정 변경 시:

- [ ] HikariCP pool size가 Tomcat threads의 30% 이상
- [ ] JwtAuthFilter에 User 캐시 적용됨
- [ ] CallerRunsPolicy executor에 blocking 코드 없음
- [ ] Thread.sleep()이 요청 처리 경로에 없음
- [ ] @Scheduled 태스크가 전용 스레드 풀에서 실행됨
- [ ] Redis pool max-active가 동시 접속 수 대비 충분
