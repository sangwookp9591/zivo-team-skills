# UseCase Template

애플리케이션 서비스 계층의 UseCase 인터페이스 + 구현체 생성 시 이 템플릿을 사용한다.

## 위치

- 인터페이스: `{도메인}/application/usecase/{기능}/{UseCase}.java`
- 구현체: `{도메인}/application/usecase/{기능}/impl/{UseCase}Impl.java`

## 인터페이스 템플릿

```java
package com.example.demo.{domain}.application.usecase.{feature};

import com.example.demo.{domain}.application.command.{Command};
import com.example.demo.{domain}.application.result.{Result};

public interface {UseCase} {
    {Result} execute({Command} command);
}
```

## 구현체 템플릿

```java
package com.example.demo.{domain}.application.usecase.{feature}.impl;

import com.example.demo.{domain}.application.command.{Command};
import com.example.demo.{domain}.application.result.{Result};
import com.example.demo.{domain}.application.usecase.{feature}.{UseCase};
import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};
import com.example.demo.{domain}.domain.repository.{AggregateRoot}Repository;
import com.example.demo.common.exception.BusinessException;
import com.example.demo.{domain}.support.exception.{Domain}ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class {UseCase}Impl implements {UseCase} {

    private final {AggregateRoot}Repository repository;

    @Override
    public {Result} execute({Command} command) {
        // 1. 도메인 객체 조회 (필요 시)
        {AggregateRoot} entity = repository.findActiveById(command.id())
            .orElseThrow(() -> new BusinessException({Domain}ErrorCode.NOT_FOUND));

        // 2. 도메인 로직 실행 (비즈니스 로직은 Aggregate에 위임)
        entity.update(command.name(), command.userId());

        // 3. 저장
        {AggregateRoot} saved = repository.save(entity);

        // 4. 결과 반환
        return {Result}.from(saved);
    }
}
```

## Command / Result DTO 템플릿

```java
// application/command/
public record {Command}(
    Long id,
    String name,
    Long userId
) {
    public static {Command} of(Long id, String name, Long userId) {
        return new {Command}(id, name, userId);
    }
}

// application/result/
public record {Result}(
    Long id,
    String name,
    String status,
    LocalDateTime createdAt
) {
    public static {Result} from({AggregateRoot} entity) {
        return new {Result}(
            entity.getId(),
            entity.getName(),
            entity.isActive() ? "ACTIVE" : "INACTIVE",
            entity.getCreatedAt()
        );
    }
}
```

## 핵심 규칙

- `@Service`, `@Transactional`은 Impl에만 적용
- 비즈니스 로직은 Aggregate에 위임. UseCase는 흐름(조회 → 실행 → 저장)만 조율
- Command/Result는 application 계층 전용 DTO. interfaces 계층의 Request/Response와 분리
