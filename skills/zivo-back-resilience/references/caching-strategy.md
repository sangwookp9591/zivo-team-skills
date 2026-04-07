# Caching Strategy — 캐시 전략 가이드

## 원칙

자주 조회되지만 거의 변하지 않는 데이터를 매번 DB에서 읽으면 커넥션 풀을 낭비한다.
캐시를 적용하면 DB 부하 감소 + 응답 속도 개선 + 커넥션 풀 여유 확보.

---

## 1. 캐시 대상 판단 기준

| 기준 | 캐시 적용 | 캐시 미적용 |
|------|----------|------------|
| 변경 빈도 | 시간~일 단위 | 초~분 단위 |
| 조회 빈도 | 매 요청 또는 초당 수십 회 | 드물게 조회 |
| 데이터 일관성 | 약간의 지연 허용 | 즉시 반영 필수 |
| 데이터 크기 | 작음 (수 KB) | 대용량 (수 MB+) |

---

## 2. ZIVO 캐시 적용 현황 및 권장

### 현재 캐시 있음

| 대상 | 캐시 종류 | TTL | 상태 |
|------|----------|-----|------|
| Bizppurio 템플릿 | Caffeine | 30분 | OK |
| TADA ride location | Redis | 짧은 TTL | OK |
| ONDA 호텔 데이터 | Redis | 72시간 | OK |

### 캐시 미적용 — 즉시 추가 권장

| 대상 | API | 조회 빈도 | 변경 빈도 | 권장 캐시 | 권장 TTL |
|------|-----|----------|----------|----------|---------|
| **User (JWT Filter)** | 모든 인증 API | 매 요청 | 드물게 | Redis 또는 Caffeine | 5분 |
| **Countries 목록** | `GET /api/countries` | 앱 시작마다 | 거의 안 변함 | Caffeine | 1시간 |
| **Top Categories** | `GET /api/categories/top` | 홈 진입마다 | 드물게 | Caffeine | 30분 |
| **Main Category List** | `GET /api/product-display/main-category/public/list` | 홈 진입마다 | 드물게 | Caffeine + countryCode 키 | 30분 |
| **App Version** | `POST /api/app-version/check` | 앱 시작마다 | 배포 시만 | Caffeine | 10분 |

---

## 3. 캐시 구현 패턴

### Caffeine (로컬 캐시) — 단일 인스턴스, 작은 데이터

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(30))
            .recordStats());
        return cacheManager;
    }
}
```

```java
// 사용
@Cacheable(value = "countries", key = "'active'")
public List<Country> findAllActive() {
    return countryRepository.findAllActive();
}

// 무효화 (데이터 변경 시)
@CacheEvict(value = "countries", allEntries = true)
public void updateCountry(Country country) { ... }
```

### Redis (분산 캐시) — 다중 인스턴스, 공유 필요

```java
// User 캐시 — JWT Filter에서 사용
@Service
@RequiredArgsConstructor
public class UserCacheService {

    private final UserRepository userRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String USER_CACHE_PREFIX = "user:cache:";
    private static final Duration USER_CACHE_TTL = Duration.ofMinutes(5);

    public User getUserById(Long userId) {
        String key = USER_CACHE_PREFIX + userId;
        String cached = redisTemplate.opsForValue().get(key);

        if (cached != null) {
            return objectMapper.readValue(cached, User.class);
        }

        User user = userRepository.findById(userId);
        if (user != null) {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(user), USER_CACHE_TTL);
        }
        return user;
    }

    public void evictUser(Long userId) {
        redisTemplate.delete(USER_CACHE_PREFIX + userId);
    }
}
```

### countryCode 기반 캐시 키

```java
// countryCode별로 다른 데이터를 캐시할 때
@Cacheable(value = "mainCategories", key = "#countryCode")
public List<MainCategory> findByCountryCode(String countryCode) {
    return mainCategoryMapper.findByCountryCodeOrderByDisplayOrder(countryCode);
}
```

---

## 4. 캐시 무효화 전략

| 전략 | 사용 시점 | 구현 |
|------|----------|------|
| TTL 만료 | 대부분의 경우 | `expireAfterWrite` |
| 명시적 evict | 관리자가 데이터 변경 시 | `@CacheEvict` |
| Write-through | 데이터 쓰기와 동시에 캐시 갱신 | `@CachePut` |

### 규칙

- **읽기 전용 데이터** (countries, categories): TTL만으로 충분
- **사용자 데이터** (User): 프로필 수정 시 `@CacheEvict` 추가
- **관리자 변경 데이터** (product-display): 관리자 API에서 `@CacheEvict`

---

## 5. 캐시 사용 시 주의사항

### 절대 캐시하면 안 되는 것

- 결제/주문 상태 (실시간 정합성 필수)
- 인증 토큰/Refresh 토큰 (보안)
- 재고/좌석 수량 (동시성 문제)
- 개인정보가 포함된 대량 데이터

### 캐시 장애 대비

```java
// ✅ Redis 장애 시 DB fallback
public User getUserById(Long userId) {
    try {
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) return deserialize(cached);
    } catch (Exception e) {
        log.warn("Redis cache read failed, falling back to DB", e);
    }
    return userRepository.findById(userId);
}
```

- Redis 장애 시 캐시 없이 동작해야 함 (graceful degradation)
- 캐시 실패가 500 에러로 이어지면 안 됨

---

## 6. 체크리스트

캐시 도입 시:

- [ ] 변경 빈도가 낮은 데이터인지 확인
- [ ] TTL이 적절한지 확인 (너무 길면 stale, 너무 짧으면 무의미)
- [ ] 캐시 무효화 경로가 있는지 확인
- [ ] Redis 장애 시 fallback이 있는지 확인
- [ ] 캐시 키에 locale/countryCode가 필요한지 확인
- [ ] 개인정보/보안 데이터가 캐시에 들어가지 않는지 확인
