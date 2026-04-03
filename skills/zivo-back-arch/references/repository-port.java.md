# Repository Port Template

도메인 계층의 Repository 인터페이스(포트) 생성 시 이 템플릿을 사용한다.

## 위치

`{도메인}/domain/repository/{AggregateRoot}Repository.java`

## 템플릿

```java
package com.example.demo.{domain}.domain.repository;

import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};

import java.util.Optional;

public interface {AggregateRoot}Repository {

    // ── 조회 ────────────────────────────────────────────────────
    Optional<{AggregateRoot}> findActiveById(Long id);

    // ── 저장 ────────────────────────────────────────────────────
    {AggregateRoot} save({AggregateRoot} entity);

    // ── 삭제 ────────────────────────────────────────────────────
    void deleteById(Long id);
}
```

## 핵심 규칙

- persistence 기술(MyBatis, JPA)에 의존하지 않는 순수 인터페이스
- 도메인 Aggregate 타입만 사용 (JPA Entity, MyBatis DTO 사용 금지)
- 구현체는 `infrastructure/persistence/adapter/`에 위치
