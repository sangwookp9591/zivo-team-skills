# Controller Template

REST API 컨트롤러 생성 시 이 템플릿을 사용한다.

## 위치

- Controller: `{도메인}/interfaces/api/{role}/{AggregateRoot}{Role}Controller.java`
- Request DTO: `{도메인}/interfaces/dto/{role}/request/{Action}Request.java`
- Response DTO: `{도메인}/interfaces/dto/{role}/response/{AggregateRoot}Response.java`
- Interface Mapper: `{도메인}/interfaces/mapper/{AggregateRoot}InterfaceMapper.java`

## Controller 템플릿

```java
package com.example.demo.{domain}.interfaces.api.{role};

import com.example.demo.common.annotation.ApiResponseWrapper;
import com.example.demo.common.annotation.Loggable;
import com.example.demo.common.security.CurrentUser;
import com.example.demo.{domain}.application.usecase.{feature}.{UseCase};
import com.example.demo.{domain}.interfaces.dto.{role}.request.{Action}Request;
import com.example.demo.{domain}.interfaces.dto.{role}.response.{AggregateRoot}Response;
import com.example.demo.{domain}.interfaces.mapper.{AggregateRoot}InterfaceMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@ApiResponseWrapper
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/{role}/{resource}")
public class {AggregateRoot}{Role}Controller {

    private final {UseCase} useCase;
    private final {AggregateRoot}InterfaceMapper mapper;

    @Loggable("{리소스} 생성")
    @PostMapping
    public {AggregateRoot}Response create(
            @Valid @RequestBody {Action}Request request,
            @CurrentUser Long userId) {
        var command = mapper.toCommand(request, userId);
        var result = useCase.execute(command);
        return mapper.toResponse(result);
    }

    @Loggable("{리소스} 상세 조회")
    @GetMapping("/{id}")
    public {AggregateRoot}Response getById(
            @PathVariable Long id) {
        var result = useCase.execute(id);
        return mapper.toResponse(result);
    }

    @Loggable("{리소스} 목록 조회")
    @GetMapping
    public CursorResponse<{AggregateRoot}Response> getList(
            {ListRequest} request) {
        return useCase.execute(mapper.toCommand(request));
    }

    @Loggable("{리소스} 수정")
    @PutMapping("/{id}")
    public {AggregateRoot}Response update(
            @PathVariable Long id,
            @Valid @RequestBody {Action}Request request,
            @CurrentUser Long userId) {
        var command = mapper.toCommand(id, request, userId);
        var result = useCase.execute(command);
        return mapper.toResponse(result);
    }

    @Loggable("{리소스} 삭제")
    @DeleteMapping("/{id}")
    public void delete(
            @PathVariable Long id,
            @CurrentUser Long userId) {
        useCase.execute(id, userId);
    }
}
```

## Request DTO 템플릿

```java
package com.example.demo.{domain}.interfaces.dto.{role}.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record {Action}Request(
    @NotBlank(message = "이름은 필수입니다")
    @Size(max = 100, message = "이름은 100자 이내여야 합니다")
    String name,

    String description
) {}
```

## Response DTO 템플릿

```java
package com.example.demo.{domain}.interfaces.dto.{role}.response;

import java.time.LocalDateTime;

public record {AggregateRoot}Response(
    Long id,
    String name,
    String status,
    LocalDateTime createdAt
) {}
```

## Interface Mapper 템플릿

```java
package com.example.demo.{domain}.interfaces.mapper;

import com.example.demo.{domain}.application.command.{Command};
import com.example.demo.{domain}.application.result.{Result};
import com.example.demo.{domain}.interfaces.dto.{role}.request.{Action}Request;
import com.example.demo.{domain}.interfaces.dto.{role}.response.{AggregateRoot}Response;
import org.springframework.stereotype.Component;

@Component
public class {AggregateRoot}InterfaceMapper {

    public {Command} toCommand({Action}Request request, Long userId) {
        return {Command}.of(null, request.name(), userId);
    }

    public {Command} toCommand(Long id, {Action}Request request, Long userId) {
        return {Command}.of(id, request.name(), userId);
    }

    public {AggregateRoot}Response toResponse({Result} result) {
        return new {AggregateRoot}Response(
            result.id(),
            result.name(),
            result.status(),
            result.createdAt()
        );
    }
}
```

## 핵심 규칙

- `@ApiResponseWrapper`로 자동 응답 래핑
- `@Loggable`로 자동 요청/응답 로깅
- `@CurrentUser`로 인증된 사용자 ID 주입
- `@Valid`로 Request DTO 검증
- Request/Response DTO는 `interfaces` 계층 전용. Command/Result는 `application` 계층 전용
- InterfaceMapper로 계층 간 DTO 변환
