# Error Diagnosis — 502 / 500 / Timeout 디버깅 가이드

## 원칙

에러가 발생하면 "무엇이 느린가"와 "왜 그 HTTP 상태코드로 보이는가"를 분리해서 분석한다.
추측이 아닌 증거(스레드 덤프, 메트릭, 로그)로 원인을 좁힌다.

---

## 1. 에러 유형별 발생 메커니즘

### 502 Bad Gateway

```
외부 API 느림 (timeout 미설정)
  → Tomcat 스레드 장시간 점유
  → 동시 요청 증가 → 스레드 풀 고갈
  → ALB/Nginx가 upstream 응답 못 받음
  → 502 Bad Gateway 반환
```

**핵심**: 502는 앱 내부 에러가 아니라 **앞단 게이트웨이가 앱 응답을 못 받아서** 발생.
앱이 정상 처리 중이어도 ALB timeout(60초)을 초과하면 502.

**단순 API에서도 502가 나는 이유**:
`/api/countries`, `/api/users/me` 같은 단순 API가 502를 반환하면,
해당 API 자체의 문제가 아니라 **다른 API(geocoding, tada 등)가 Tomcat 스레드와 DB 커넥션을 모두 점유**하고 있기 때문.

### 500 Internal Server Error

```
.block() + 외부 API 에러
  → WebClientResponseException / TimeoutException
  → 적절한 예외 처리 없음
  → GlobalExceptionHandler가 500으로 래핑
```

**핵심**: 500은 앱 내부에서 예외가 발생하고 catch되지 않은 것.
외부 API 실패, DB 에러, NPE 등이 원인.

### Timeout (클라이언트 측)

```
순차 다중 외부 API 호출 (geocoding/search)
  → 누적 대기 시간 수십 초
  → 클라이언트(Flutter) 또는 게이트웨이 timeout 초과
```

**핵심**: 앱 로그에는 정상 완료로 보이지만, 클라이언트가 먼저 포기한 경우.

---

## 2. 진단 절차

### Step 1: 에러 시점 확인

```bash
# 앱 로그에서 에러 시점 확인
grep -E "ERROR|WARN|Exception" app.log | tail -50

# 특정 API 에러 추적
grep "/api/geocoding" app.log | grep -E "ERROR|500|502|timeout"

# 응답 시간 확인 (RequestLoggingConfig가 남기는 로그)
grep "elapsed" app.log | awk '{print $NF}' | sort -n | tail -20
```

### Step 2: 스레드 상태 확인

```bash
# 스레드 덤프
jstack <PID> > thread_dump.txt

# 블로킹 스레드 수 확인
grep -c "BLOCKED\|WAITING\|TIMED_WAITING" thread_dump.txt

# 외부 API 대기 스레드 찾기
grep -A 10 "SocketInputStream.read\|socketRead\|RestTemplate\|HttpURLConnection" thread_dump.txt

# .block() 대기 스레드 찾기
grep -A 10 "BlockingSingleSubscriber\|blockingGet" thread_dump.txt

# DB 커넥션 대기 스레드 찾기
grep -A 10 "HikariPool\|getConnection\|PoolEntry" thread_dump.txt
```

### Step 3: 커넥션 풀 상태 확인

```bash
# HikariCP 메트릭 (Actuator)
curl -s localhost:8080/actuator/metrics/hikaricp.connections.active | jq '.measurements'
curl -s localhost:8080/actuator/metrics/hikaricp.connections.pending | jq '.measurements'
curl -s localhost:8080/actuator/metrics/hikaricp.connections.timeout | jq '.measurements'

# Tomcat 스레드 메트릭
curl -s localhost:8080/actuator/metrics/tomcat.threads.busy | jq '.measurements'
curl -s localhost:8080/actuator/metrics/tomcat.threads.current | jq '.measurements'

# 로그에서 풀 고갈 확인
grep -i "connection is not available\|HikariPool\|leak detection" app.log
```

### Step 4: 외부 API 상태 확인

```bash
# 외부 API 응답 시간 로그 확인
grep "\[EXTERNAL_API\]" app.log | sort -t= -k4 -n | tail -20

# 특정 서비스 확인
grep "naverGeocoding\|googlePlaces\|tadaApi" app.log | grep -i "error\|timeout\|elapsed"
```

### Step 5: DB 쿼리 확인

```sql
-- 현재 실행 중인 느린 쿼리
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state = 'active'
  AND (now() - pg_stat_activity.query_start) > interval '3 second'
ORDER BY duration DESC;

-- 최근 느린 쿼리 통계
SELECT calls, mean_exec_time, max_exec_time, query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 3. 증상별 원인 매핑

| 증상 | 가장 가능성 높은 원인 | 확인 방법 |
|------|---------------------|----------|
| 모든 API에서 동시에 502 | Tomcat 스레드 고갈 | `jstack` → WAITING 스레드 수 |
| 특정 API만 502 | 해당 API의 외부 호출 timeout | 해당 API 로그 + 외부 API 상태 |
| 특정 API만 500 | 코드 버그 또는 예외 미처리 | 스택트레이스 확인 |
| 피크 시간에만 502 | 커넥션 풀 고갈 | HikariCP pending 메트릭 |
| 랜덤하게 502 | 외부 API 간헐적 장애 | 외부 API 응답 시간 로그 |
| 단순 API도 느림 | DB 커넥션 풀 고갈 (다른 API가 점유) | HikariCP active 메트릭 |
| geocoding만 느림 | 순차 외부 API 호출 | 각 API 호출 시간 로그 |
| hospital만 느림 | 복잡 SQL 쿼리 | EXPLAIN ANALYZE |
| esim에서 500 | `.block()` + 외부 API 에러 | 스택트레이스에 `BlockingSingleSubscriber` |
| search에서 500 | OpenSearch 연결/쿼리 에러 | OpenSearch 로그 + 커넥션 상태 |

---

## 4. API 기능군별 디버깅 포인트

### 인증/앱 시작 계열

`auth/refresh`, `app-version/check`, `users/me`, `countries`

- 이 API들이 느리면 **자체 문제가 아니라 공통 리소스 고갈**
- HikariCP, Tomcat 스레드 확인 우선
- JWT filter의 DB 조회가 병목인지 확인

### 검색 계열

`search/unified`, `search/map/unified`, `geocoding/search`

- OpenSearch 연결 상태 확인 (3s connect, 10s socket timeout)
- geocoding은 외부 API 4개 순차 호출 확인
- OpenSearch script field 계산 시간 확인

### 홈 피드 계열

`categories/top`, `recent-visits`, `product-display`

- categories/product-display: 캐시 없음 → 매번 DB 조회
- recent-visits: 13+ JOIN 쿼리 시간 확인
- countryCode/locale 필터로 인한 쿼리 비효율 확인

### 병원 계열

`hospital/list`, `hospital/map`, `hospital-service`

- PostGIS 거리 계산 성능 확인
- LATERAL JOIN 실행 시간 확인
- OFFSET 페이지네이션(findHospitalsWithPagination) 사용 여부

### 택시 계열

`tada/*`

- TADA 외부 API 응답 시간 확인 (timeout 미설정)
- 캐시 적중률 확인 (ride-location-cached)
- TADA API 장애 시 fallback 없음

### eSIM/결제 계열

`esim/orders`, `esim/order/{orderId}`

- `.block()` 호출 확인
- 외부 eSIM API 응답 시간 확인
- 결제 API(NicePay) read timeout 30초 → 스레드 장시간 점유

---

## 5. 필수 로깅 포맷

모든 외부 API 호출에 아래 형식 로그 추가:

```java
// 호출 시작/완료
log.info("[EXTERNAL_API] service={}, method={}, elapsed={}ms, status={}",
    serviceName, methodName, elapsed, status);

// 에러 시
log.warn("[EXTERNAL_API] service={}, method={}, elapsed={}ms, error={}",
    serviceName, methodName, elapsed, e.getMessage());
```

DB 쿼리 성능:

```java
// 느린 쿼리 경고 (3초 초과)
log.warn("[SLOW_QUERY] mapper={}, method={}, elapsed={}ms", mapperName, methodName, elapsed);
```

커넥션 풀 상태:

```java
// 주기적 로깅 (30초마다)
log.info("[POOL_STATUS] hikari.active={}, hikari.idle={}, hikari.pending={}, tomcat.busy={}, tomcat.current={}",
    active, idle, pending, busy, current);
```

---

## 6. 긴급 대응 체크리스트

프로덕션에서 502/timeout 대량 발생 시:

1. **스레드 덤프** 즉시 수집: `jstack <PID> > /tmp/thread_dump_$(date +%s).txt`
2. **HikariCP 메트릭** 확인: active/pending 비율
3. **외부 API 상태** 확인: Naver/Google/TADA API 정상인지
4. **최근 배포** 확인: 새 코드가 원인인지
5. **PostgreSQL 느린 쿼리** 확인: `pg_stat_activity`
6. **Redis 상태** 확인: `redis-cli info clients`
7. **OpenSearch 상태** 확인: `_cluster/health`

즉시 완화 조치:

```bash
# Tomcat 스레드 상태 확인
curl -s localhost:8080/actuator/metrics/tomcat.threads.busy

# 앱 재시작 (최후의 수단)
# 스레드 덤프를 먼저 수집한 후에만 재시작
```
