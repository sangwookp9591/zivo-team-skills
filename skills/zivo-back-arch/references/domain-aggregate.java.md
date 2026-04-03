# Domain Aggregate Template

신규 도메인의 Aggregate Root 생성 시 이 템플릿을 사용한다.

## 위치

`{도메인}/domain/aggregate/{AggregateRoot}.java`

## 템플릿

```java
package com.example.demo.{domain}.domain.aggregate;

import com.example.demo.common.exception.BusinessException;
import com.example.demo.{domain}.support.exception.{Domain}ErrorCode;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class {AggregateRoot} {

    private Long id;
    private String name;
    private boolean active;
    private boolean deleted;
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ── Factory Method ──────────────────────────────────────────
    public static {AggregateRoot} create(String name, Long userId) {
        {AggregateRoot} entity = new {AggregateRoot}();
        entity.name = name;
        entity.active = true;
        entity.deleted = false;
        entity.createdBy = userId;
        entity.updatedBy = userId;
        entity.createdAt = LocalDateTime.now();
        entity.updatedAt = LocalDateTime.now();
        return entity;
    }

    // ── 상태 변경 메서드 ─────────────────────────────────────────
    public void update(String name, Long userId) {
        this.name = name;
        this.updatedBy = userId;
        this.updatedAt = LocalDateTime.now();
    }

    public void activate(Long userId) {
        if (this.deleted) {
            throw new BusinessException({Domain}ErrorCode.ALREADY_DELETED);
        }
        this.active = true;
        this.updatedBy = userId;
        this.updatedAt = LocalDateTime.now();
    }

    public void deactivate(Long userId) {
        if (!isOperable()) {
            throw new BusinessException({Domain}ErrorCode.ALREADY_DELETED);
        }
        this.active = false;
        this.updatedBy = userId;
        this.updatedAt = LocalDateTime.now();
    }

    public void softDelete(Long userId) {
        if (this.deleted) {
            throw new BusinessException({Domain}ErrorCode.ALREADY_DELETED);
        }
        this.deleted = true;
        this.active = false;
        this.updatedBy = userId;
        this.updatedAt = LocalDateTime.now();
    }

    // ── 도메인 검증 ─────────────────────────────────────────────
    public boolean isOperable() {
        return this.active && !this.deleted;
    }

    // ── Builder (조회 시 매핑용) ─────────────────────────────────
    @Builder
    public {AggregateRoot}(Long id, String name, boolean active, boolean deleted,
                           Long createdBy, Long updatedBy,
                           LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.active = active;
        this.deleted = deleted;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
```

## 핵심 규칙

- Factory method(`create()`)로만 생성. 생성자 직접 호출 금지
- 상태 변경은 반드시 Aggregate 내부 메서드를 통해서만 수행
- 도메인 검증 로직(`isOperable()`)을 포함하여 불변식 보장
- `@Builder`는 조회 매핑(MyBatis/JPA)용으로만 사용
