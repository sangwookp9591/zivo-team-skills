# Query Performance Rules — DB 쿼리 성능 가이드

## 원칙

복잡한 쿼리가 DB 커넥션을 오래 점유하면 HikariCP 풀 고갈 → 전체 API 502로 이어진다.
MyBatis statement timeout은 30초지만, 목표는 **모든 쿼리 1초 이내 완료**.

---

## 1. 페이지네이션

### OFFSET 페이지네이션 금지

```sql
-- ❌ WRONG — 페이지가 깊어질수록 전체 스캔
SELECT * FROM public.zivo_hospitals
ORDER BY created_at DESC
LIMIT 20 OFFSET 10000;  -- 10000행을 읽고 버림
```

### Cursor 기반 페이지네이션 필수

```sql
-- ✅ CORRECT — 인덱스 활용, 일정한 성능
SELECT * FROM public.zivo_hospitals
WHERE created_at < #{cursorCreatedAt}
  OR (created_at = #{cursorCreatedAt} AND id < #{cursorId})
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### 현재 문제 쿼리

| 쿼리 | 파일 | 문제 |
|------|------|------|
| `findHospitalsWithPagination` | `HospitalMapper.xml:401` | **OFFSET 사용** → cursor로 전환 필요 |
| `findHospitalsForMapBounds` | `HospitalMapper.xml:1776` | cursor 사용하나 LATERAL JOIN 과다 |
| `getVisits` | `UserRecentVisitMapper.xml:338` | cursor 사용하나 13+ JOIN |

---

## 2. JOIN 최적화

### JOIN 개수 제한

- **5개 이하**: 정상
- **6~10개**: 주의 — EXPLAIN ANALYZE 필수
- **10개 초과**: 위험 — 분할 또는 캐시 도입 필수

### LATERAL JOIN 주의

```sql
-- ❌ WRONG — LATERAL은 각 행마다 서브쿼리 실행
SELECT h.*, cat.*
FROM public.zivo_hospitals h
LEFT JOIN LATERAL (
    SELECT string_agg(c.name, ', ') as category_names
    FROM public.zivo_categories c
    JOIN public.zivo_entity_category_mapping m ON m.category_id = c.id
    WHERE m.entity_id = h.id  -- 행마다 실행
) cat ON true;

-- ✅ CORRECT — 일반 JOIN + GROUP BY로 대체
SELECT h.*, string_agg(c.name, ', ') as category_names
FROM public.zivo_hospitals h
LEFT JOIN public.zivo_entity_category_mapping m ON m.entity_id = h.id
LEFT JOIN public.zivo_categories c ON c.id = m.category_id
GROUP BY h.id;
```

### EXISTS vs JOIN

```sql
-- 필터링 목적이면 EXISTS (행 반환 불필요)
WHERE EXISTS (SELECT 1 FROM public.zivo_entity_category_mapping m WHERE m.entity_id = h.id AND m.category_id = #{categoryId})

-- 데이터가 필요하면 JOIN
LEFT JOIN public.zivo_entity_category_mapping m ON m.entity_id = h.id
```

---

## 3. PostGIS 쿼리 최적화

### 거리 계산 중복 방지

```sql
-- ❌ WRONG — ST_Distance를 SELECT와 ORDER BY에서 중복 계산
SELECT h.*,
    ST_Distance(h.location::geography, ST_SetSRID(ST_MakePoint(#{lng}, #{lat}), 4326)::geography) as distance
FROM public.zivo_hospitals h
WHERE ST_DWithin(h.location::geography, ST_SetSRID(ST_MakePoint(#{lng}, #{lat}), 4326)::geography, #{radiusMeters})
ORDER BY ST_Distance(h.location::geography, ST_SetSRID(ST_MakePoint(#{lng}, #{lat}), 4326)::geography);

-- ✅ CORRECT — CTE로 한 번만 계산
WITH hospital_with_distance AS (
    SELECT h.*,
        ST_Distance(h.location::geography, ST_SetSRID(ST_MakePoint(#{lng}, #{lat}), 4326)::geography) as distance
    FROM public.zivo_hospitals h
    WHERE ST_DWithin(h.location::geography, ST_SetSRID(ST_MakePoint(#{lng}, #{lat}), 4326)::geography, #{radiusMeters})
)
SELECT * FROM hospital_with_distance
ORDER BY distance
LIMIT #{limit};
```

### 인덱스

```sql
-- PostGIS spatial index
CREATE INDEX idx_hospitals_location ON public.zivo_hospitals USING GIST (location);

-- ST_DWithin은 GIST 인덱스를 활용함. ST_Distance만으로 ORDER BY하면 인덱스 미활용.
```

---

## 4. N+1 방지

### MyBatis에서 N+1 패턴

```xml
<!-- ❌ WRONG — 서비스에서 루프 돌며 개별 조회 -->
<!-- Java: hospitals.forEach(h -> h.setCategories(categoryMapper.findByHospitalId(h.getId()))) -->

<!-- ✅ CORRECT — 한 번에 조인하여 조회 -->
<select id="findHospitalsWithCategories">
    SELECT h.*, c.id as category_id, c.name as category_name
    FROM public.zivo_hospitals h
    LEFT JOIN public.zivo_entity_category_mapping m ON m.entity_id = h.id
    LEFT JOIN public.zivo_categories c ON c.id = m.category_id
    WHERE h.id IN
    <foreach item="id" collection="ids" open="(" separator="," close=")">
        #{id}
    </foreach>
</select>
```

### 번역 데이터 N+1

```xml
<!-- ❌ WRONG — 각 엔티티마다 번역 개별 조회 -->

<!-- ✅ CORRECT — COALESCE로 한 번에 조회 -->
<select id="findWithTranslation">
    SELECT h.id,
        COALESCE(t.name, h.name) as name
    FROM public.zivo_hospitals h
    LEFT JOIN public.zivo_translations t
        ON t.entity_type = 'HOSPITAL' AND t.entity_id = h.id
        AND t.field = 'name' AND t.locale = #{locale}
</select>
```

---

## 5. 쿼리 검증 체크리스트

새 쿼리 또는 쿼리 수정 PR 리뷰 시:

- [ ] OFFSET 페이지네이션 없음 (cursor 사용)
- [ ] JOIN 5개 이하 (초과 시 EXPLAIN ANALYZE 첨부)
- [ ] LATERAL JOIN 사용 시 대안 검토됨
- [ ] PostGIS 거리 계산 중복 없음 (CTE 사용)
- [ ] N+1 패턴 없음 (루프 내 개별 조회 없음)
- [ ] 인덱스 존재 확인 (WHERE/ORDER BY 컬럼)
- [ ] locale/countryCode 필터 시 인덱스 활용 확인
- [ ] EXPLAIN ANALYZE 결과 확인 (Seq Scan on large table 없음)
