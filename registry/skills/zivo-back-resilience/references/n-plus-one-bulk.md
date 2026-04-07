# N+1 감지·측정 & Bulk 전환 가이드

## 원칙

N+1은 "리스트 1회 조회 + 각 항목마다 개별 조회 N회"로 총 N+1번 DB round-trip이 발생하는 패턴.
HikariCP 커넥션 20개를 순식간에 소비하고, 데이터 증가 시 선형으로 느려진다.

---

## 1. N+1 감지 방법

| 방법 | 적용 시점 | 설명 |
|------|----------|------|
| **MyBatis SQL DEBUG 로그** | 개발 | `logging.level.org.apache.ibatis=DEBUG` → 동일 쿼리 반복 확인 |
| **p6spy** | 개발 | `p6spy-spring-boot-starter` 추가 → 쿼리별 실행 시간/횟수 실시간 출력 |
| **테스트 쿼리 카운트** | CI | API 호출 전후 쿼리 수 비교. 리스트 20개에 쿼리 5개 이하가 정상, 21+면 N+1 |
| **pg_stat_statements** | 운영 | `calls` 컬럼으로 특정 쿼리 호출 빈도 추적 |
| **HikariCP leak detection** | 운영 | `leak-detection-threshold=30000` 로그로 장시간 점유 쿼리 식별 |

### N+1 의심 신호

- SQL 로그에서 **동일 SELECT가 리스트 크기만큼 반복**
- API 응답 시간이 **데이터 수에 비례하여 선형 증가**
- HikariCP `active` 커넥션이 급증한 뒤 느리게 감소

---

## 2. ZIVO 코드에서 확인된 N+1 지점

### 루프 내 개별 조회 (N+1)

| 위치 | 패턴 | round-trip | 우선순위 |
|------|------|-----------|---------|
| `ReservationService.java:~1127` | `targetUserIds.forEach` → `userRepository.findById()` | N+1 (2~10) | **P0** |
| `HospitalServiceService.java:~860-882` | holiday 번역 fallback + `stream().filter()` 중첩 | N+2 + O(N×M) | **P0** |
| `HospitalEnrichmentService.java:~872-882` | holiday 번역 `forEach` → `stream().filter()` 중첩 | O(N×M) | **P1** |
| `HospitalServiceService.java:~613-640` | `getHospitalCategoryTranslations` 서비스별 개별 호출 | 2 per service | **P1** |
| `HospitalServiceService.java:~450-550` | `getServiceDetail` — 동일 hospitalId로 6+ 순차 쿼리 | 10 queries | **P1** |

### 해결 원칙

| 안티패턴 | 해결 방법 |
|---------|----------|
| `forEach` → `findById()` | `findByIds(idList)` 한 번 조회 → `Map<Long, Entity>` 변환 |
| `stream().filter(id::equals)` | `Map.get(id)` O(1) 직접 접근 |
| 동일 FK로 순차 쿼리 6+회 | aggregate 쿼리 통합 또는 `CompletableFuture` 병렬화 |
| locale fallback 2회 쿼리 | `findByIdsAndLocales(ids, List.of(locale, "en"))` 한 번에 |

---

## 3. Bulk 전환이 필요한 개별 INSERT

| 위치 | 현재 | round-trip | 우선순위 |
|------|------|-----------|---------|
| `EntityCategoryService.java:50-53` | `for → insert(mapping)` 병원 카테고리 | N (10~50) | **P0** |
| `EntityCategoryService.java:107-110` | `for → insert(mapping)` 서비스 카테고리 | N (10~50) | **P0** |
| `HospitalServiceService.java:2629-2631` | `for → insert(mapping)` 서비스 카테고리 | N | **P0** |
| `AdminHotelPropertyThemeService.java:168-182` | `for → insert(entity)` 테마 생성 | N (10~100) | **P1** |
| `AdminRoomService.java:214-218` | `for → upsert + insert` 태그 매핑 | 2N (10~40) | **P1** |

### 해결: MyBatis `<foreach>` batch INSERT

- `insertBatch(List<T>)` 매퍼 추가
- `VALUES ... <foreach separator=",">` 멀티 row INSERT
- **필요한 신규 매퍼**: `EntityCategoryMapper.insertBatch`

---

## 4. Bulk 전환이 필요한 개별 UPDATE

| 위치 | 현재 | round-trip | 우선순위 |
|------|------|-----------|---------|
| `ReminderSchedulingService.java:93-97` | `for → save(schedule)` 상태 CANCELLED | N (3~6) | **P0** |
| `ReminderSchedulingService.java:130-134` | `for → save(schedule)` 리뷰 CANCELLED | N (3~6) | **P0** |
| `AdminHotelPropertyThemeService.java:113-116` | `for → update(d)` displayOrder | N (2~20) | **P1** |
| `AdminHotelPropertyThemeService.java:243-250` | `for → update(d)` displayOrder 재정렬 | N (2~20) | **P1** |
| `ProductDisplayService.java:612-615` | `for → update(display)` displayOrder | N (5~50) | **P1** |

### 해결 방법

| 패턴 | 적용 대상 |
|------|----------|
| `UPDATE ... WHERE id IN (...)` | 동일 값으로 일괄 변경 (상태 변경 등) |
| `UPDATE ... SET col = CASE id WHEN ... END` | 항목별 다른 값 (displayOrder 등) |
| **필요한 신규 매퍼**: `NotificationScheduleMapper.updateStatusByIds`, `HotelPropertyThemeMapper.updateDisplayOrderBatch` |

---

## 5. Redis 개별 → Pipeline 전환

| 위치 | 현재 | 우선순위 |
|------|------|---------|
| `ChatTypingService.java:~95` | 루프 내 `delete()` | **P2** |
| `ChatUnreadCacheService.java:~165` | 루프 내 `delete()` | **P2** |

### 참고: 이미 최적화된 좋은 패턴

| 서비스 | 패턴 |
|--------|------|
| `NotificationUnreadCacheService` | `executePipelined` — bulk increment/evict |
| `OndaWebhookLogService` | `insertInventoryBatchReturningIds` — batch INSERT |
| `HospitalEnrichmentService` | batch detail response — `groupingBy` 매핑 |
| `CategoryService` | batch translation — 한 쿼리로 전체 번역 조회 |
| `FavoriteService` | `HashSet.contains()` — O(1) 존재 확인 |

---

## 6. 수정 우선순위

### Phase 1 — 즉시

| 작업 | 예상 절감 |
|------|----------|
| `EntityCategoryMapper`에 `insertBatch` 추가 → Service 리팩토링 | 10~50 trip/호출 |
| `NotificationScheduleMapper`에 `updateStatusByIds` 추가 | 3~6 trip/취소 |
| `ReservationService` targetUserIds → `findByIds` batch | 2~10 trip/알림 |
| holiday 번역 `stream().filter()` → `Map.get()` | O(N×M) → O(N) |

### Phase 2 — 다음 스프린트

| 작업 | 예상 절감 |
|------|----------|
| displayOrder batch CASE UPDATE (Theme, ProductDisplay) | 5~50 trip/편집 |
| `AdminRoomService` tag batch INSERT | 10~40 trip/편집 |
| `getServiceDetail` 쿼리 통합/병렬화 | 10 → 4~5 쿼리 |
| Chat Redis → pipeline 전환 | 5~20 trip |

---

## 7. PR 리뷰 체크리스트

- [ ] `forEach`/`for`/`stream().map()` 안에서 mapper/repository 호출 없음
- [ ] `stream().filter()` 대신 `Map.get()` 사용 (O(N²) → O(N))
- [ ] 리스트 INSERT → `insertBatch` + `<foreach>` 사용
- [ ] 리스트 UPDATE → `WHERE id IN` 또는 `CASE WHEN` 사용
- [ ] Redis 루프 get/set/delete → `executePipelined` 또는 `multiGet` 사용
- [ ] 동일 테이블 순차 쿼리 3회 이상 → 통합 또는 병렬화 검토
- [ ] 새 리스트 API 작성 시 p6spy로 쿼리 카운트 확인
