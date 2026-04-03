# Repository Adapter (MyBatis) Template

MyBatis 기반 Repository 포트 구현체 생성 시 이 템플릿을 사용한다. 복잡한 쿼리가 필요한 기존 서비스에 적합.

## 위치

- Read Mapper: `{도메인}/infrastructure/persistence/mybatis/mapper/{AggregateRoot}ReadMapper.java`
- Command Mapper: `{도메인}/infrastructure/persistence/mybatis/mapper/{AggregateRoot}CommandMapper.java`
- Adapter: `{도메인}/infrastructure/persistence/adapter/{AggregateRoot}RepositoryAdapter.java`

## Read Mapper 템플릿

```java
package com.example.demo.{domain}.infrastructure.persistence.mybatis.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface {AggregateRoot}ReadMapper {

    Optional<{AggregateRoot}Dto> findById(@Param("id") Long id);

    Optional<{AggregateRoot}Dto> findActiveById(@Param("id") Long id);

    List<{AggregateRoot}Dto> findList(@Param("request") {ListRequest} request);

    int countList(@Param("request") {ListRequest} request);
}
```

## Command Mapper 템플릿

```java
package com.example.demo.{domain}.infrastructure.persistence.mybatis.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface {AggregateRoot}CommandMapper {

    Long insert(@Param("entity") {AggregateRoot}Dto entity);

    int update(@Param("entity") {AggregateRoot}Dto entity);

    int softDelete(@Param("id") Long id, @Param("updatedBy") Long updatedBy);
}
```

## Adapter 템플릿

```java
package com.example.demo.{domain}.infrastructure.persistence.adapter;

import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};
import com.example.demo.{domain}.domain.repository.{AggregateRoot}Repository;
import com.example.demo.{domain}.infrastructure.persistence.mybatis.mapper.{AggregateRoot}ReadMapper;
import com.example.demo.{domain}.infrastructure.persistence.mybatis.mapper.{AggregateRoot}CommandMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class {AggregateRoot}RepositoryAdapter implements {AggregateRoot}Repository {

    private final {AggregateRoot}ReadMapper readMapper;
    private final {AggregateRoot}CommandMapper commandMapper;

    @Override
    public Optional<{AggregateRoot}> findActiveById(Long id) {
        return readMapper.findActiveById(id)
            .map(this::toDomain);
    }

    @Override
    public {AggregateRoot} save({AggregateRoot} domain) {
        {AggregateRoot}Dto dto = toDto(domain);
        if (domain.getId() == null) {
            commandMapper.insert(dto);
        } else {
            commandMapper.update(dto);
        }
        return findActiveById(dto.getId()).orElse(domain);
    }

    @Override
    public void deleteById(Long id) {
        commandMapper.softDelete(id, null);
    }

    // ── 매핑 ────────────────────────────────────────────────────
    private {AggregateRoot} toDomain({AggregateRoot}Dto dto) {
        return {AggregateRoot}.builder()
            .id(dto.getId())
            .name(dto.getName())
            .active(dto.isActive())
            .deleted(dto.isDeleted())
            .createdBy(dto.getCreatedBy())
            .updatedBy(dto.getUpdatedBy())
            .createdAt(dto.getCreatedAt())
            .updatedAt(dto.getUpdatedAt())
            .build();
    }

    private {AggregateRoot}Dto toDto({AggregateRoot} domain) {
        // MyBatis DTO 매핑
        return {AggregateRoot}Dto.builder()
            .id(domain.getId())
            .name(domain.getName())
            .active(domain.isActive())
            .deleted(domain.isDeleted())
            .createdBy(domain.getCreatedBy())
            .updatedBy(domain.getUpdatedBy())
            .build();
    }
}
```

## 핵심 규칙

- Read/Command Mapper를 분리하여 CQRS 패턴 적용
- MyBatis XML 매퍼 파일은 `resources/mapper/{domain}/` 경로에 배치
- Adapter 내부에서 MyBatis DTO ↔ Domain Aggregate 변환 처리
