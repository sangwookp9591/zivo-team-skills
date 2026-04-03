# Repository Adapter (JPA) Template

JPA 기반 Repository 포트 구현체 생성 시 이 템플릿을 사용한다.

## 위치

- JPA Entity: `{도메인}/infrastructure/persistence/jpa/entity/{AggregateRoot}JpaEntity.java`
- JPA Repository: `{도메인}/infrastructure/persistence/jpa/repository/{AggregateRoot}JpaRepository.java`
- Adapter: `{도메인}/infrastructure/persistence/adapter/{AggregateRoot}RepositoryAdapter.java`

## JPA Entity 템플릿

```java
package com.example.demo.{domain}.infrastructure.persistence.jpa.entity;

import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "public.{table_name}")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class {AggregateRoot}JpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private boolean active;
    private boolean deleted;
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ── Domain → JPA Entity ─────────────────────────────────────
    public static {AggregateRoot}JpaEntity from({AggregateRoot} domain) {
        {AggregateRoot}JpaEntity entity = new {AggregateRoot}JpaEntity();
        entity.id = domain.getId();
        entity.name = domain.getName();
        entity.active = domain.isActive();
        entity.deleted = domain.isDeleted();
        entity.createdBy = domain.getCreatedBy();
        entity.updatedBy = domain.getUpdatedBy();
        entity.createdAt = domain.getCreatedAt();
        entity.updatedAt = domain.getUpdatedAt();
        return entity;
    }

    // ── JPA Entity → Domain ─────────────────────────────────────
    public {AggregateRoot} toDomain() {
        return {AggregateRoot}.builder()
            .id(this.id)
            .name(this.name)
            .active(this.active)
            .deleted(this.deleted)
            .createdBy(this.createdBy)
            .updatedBy(this.updatedBy)
            .createdAt(this.createdAt)
            .updatedAt(this.updatedAt)
            .build();
    }
}
```

## JPA Repository 템플릿

```java
package com.example.demo.{domain}.infrastructure.persistence.jpa.repository;

import com.example.demo.{domain}.infrastructure.persistence.jpa.entity.{AggregateRoot}JpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface {AggregateRoot}JpaRepository extends JpaRepository<{AggregateRoot}JpaEntity, Long> {

    Optional<{AggregateRoot}JpaEntity> findByIdAndDeletedFalse(Long id);

    Optional<{AggregateRoot}JpaEntity> findByIdAndActiveTrueAndDeletedFalse(Long id);
}
```

## Adapter 템플릿

```java
package com.example.demo.{domain}.infrastructure.persistence.adapter;

import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};
import com.example.demo.{domain}.domain.repository.{AggregateRoot}Repository;
import com.example.demo.{domain}.infrastructure.persistence.jpa.entity.{AggregateRoot}JpaEntity;
import com.example.demo.{domain}.infrastructure.persistence.jpa.repository.{AggregateRoot}JpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class {AggregateRoot}RepositoryAdapter implements {AggregateRoot}Repository {

    private final {AggregateRoot}JpaRepository jpaRepository;

    @Override
    public Optional<{AggregateRoot}> findActiveById(Long id) {
        return jpaRepository.findByIdAndActiveTrueAndDeletedFalse(id)
            .map({AggregateRoot}JpaEntity::toDomain);
    }

    @Override
    public {AggregateRoot} save({AggregateRoot} domain) {
        {AggregateRoot}JpaEntity entity = {AggregateRoot}JpaEntity.from(domain);
        return jpaRepository.save(entity).toDomain();
    }

    @Override
    public void deleteById(Long id) {
        jpaRepository.deleteById(id);
    }
}
```

## 핵심 규칙

- JPA Entity는 `infrastructure` 계층에만 존재. Domain Aggregate와 반드시 분리
- `from()`, `toDomain()` 변환 메서드로 계층 간 매핑
- Adapter는 도메인 Repository 포트를 구현하고, JPA Repository에 위임
