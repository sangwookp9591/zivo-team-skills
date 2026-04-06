---
name: zivo-back-arch
description: ZIVO Backend Architecture Guide - Spring Boot + MyBatis/JPA, DDD/Hexagonal, custom annotations (@NotifyOn, @ApiResponseWrapper, @Loggable). Use this skill whenever working on ZIVO backend code, Spring Boot development, Java backend architecture, REST API design, JPA/MyBatis data access, or any backend feature implementation. Also covers general Spring Boot best practices for DI, configuration, validation, testing, and security.
triggers:
  - spring boot
  - backend
  - DDD
  - hexagonal
  - NotifyOn
  - ApiResponseWrapper
  - Loggable
  - MyBatis
  - JPA
  - java
  - REST API
  - controller
  - NotificationChannel
  - 알림 채널
  - service
  - repository
metadata:
  author: ZIVO Team
  version: "3.0.0"
  tags:
    - java
    - spring-boot
    - architecture
    - backend
---

# ZIVO Backend Architecture Guide

Spring Boot + MyBatis/JPA 기반 백엔드. 기존 서비스는 전통적 계층구조, 신규 도메인은 DDD/Hexagonal 구조.

## References 라우팅

작업에 맞는 references 파일을 읽고 따른다.

| 작업 | 읽을 파일 |
|------|----------|
| 신규 도메인/Aggregate 생성 | `references/domain-aggregate.java.md` |
| Repository 포트 인터페이스 생성 | `references/repository-port.java.md` |
| UseCase + Command/Result DTO 생성 | `references/usecase.java.md` |
| JPA Repository 구현체 생성 | `references/repository-adapter-jpa.java.md` |
| MyBatis Repository 구현체 생성 | `references/repository-adapter-mybatis.java.md` |
| Controller + Request/Response DTO 생성 | `references/controller.java.md` |
| ErrorCode enum 생성 | `references/error-code.java.md` |
| @NotifyOn 워크플로우 트리거 추가 | `references/notify-on.java.md` |
| 알림 채널 추가 (NotificationChannel) | `references/notification-channel.java.md` |
| 테스트 코드 작성 (TDD) | `references/tdd-templates.java.md` |
| Spring Boot 일반 모범 사례 (DI, 설정, 검증, 보안) | `references/springboot-best-practices.md` |

---

## DDD 패키지 구조

```
com.example.demo.{도메인}/
├── application/
│   ├── command/                   # 입력 Command DTO
│   ├── result/                    # 출력 Result DTO
│   ├── notification/              # {Domain}NotifyOnService, PayloadBuilder
│   └── usecase/{기능}/
│       └── impl/
├── domain/
│   ├── aggregate/                 # Aggregate Root (비즈니스 로직)
│   ├── repository/                # Repository 포트 (인터페이스)
│   └── shared/enums/
├── infrastructure/
│   ├── external/                  # 외부 서비스 어댑터
│   └── persistence/
│       ├── adapter/               # Repository 포트 구현체
│       ├── mybatis/mapper/        # MyBatis Mapper (Read/Command 분리)
│       └── jpa/
│           ├── entity/
│           └── repository/
├── interfaces/
│   ├── api/{role}/                # REST Controller (admin/user 분리)
│   ├── dto/{role}/
│   │   ├── request/
│   │   └── response/
│   └── mapper/                    # Interface ↔ Application 변환
└── support/
    ├── exception/                 # ErrorCode enum
    └── util/
```

### 계층 간 데이터 흐름

```
Controller → InterfaceMapper → UseCase → Domain Aggregate → Repository Port
   ↑              ↓                                              ↓
Request DTO → Command DTO                              RepositoryAdapter
   ↑              ↓                                         ↓
Response DTO ← Result DTO                        MyBatis Mapper 또는 JPA Repository
```

---

## 핵심 규칙

### 계층 규칙

- **Aggregate Root**: 비즈니스 로직은 도메인 객체 안에. Factory method(`create()`), 상태 변경(`activate()`, `deactivate()`, `softDelete()`)
- **Repository Port**: `domain/repository/`에 인터페이스만 정의. 구현은 `infrastructure/persistence/adapter/`
- **UseCase**: 인터페이스 + Impl 분리. `@Service`, `@Transactional`은 Impl에만
- **JPA Entity ≠ Domain Aggregate**: JPA Entity는 `infrastructure`에만 존재. `from()`/`toDomain()` 변환 메서드로 연결
- **Persistence 선택**: MyBatis(복잡한 쿼리, 기존 서비스) 또는 JPA(신규 도메인, 단순 CRUD) — 혼용 가능

### @NotifyOn 규칙

- `type` + `subType`은 **워크플로우 엔진의 트리거 키**. 워크플로우 엔진이 해당 조합으로 알림 채널/템플릿을 자동 라우팅
- **모든 `@NotifyOn`/`@NotifyOns`는 반드시 `{Domain}NotifyOnService.java`에서만 사용**
- UseCase, Service, Controller에 직접 `@NotifyOn`을 붙이지 않는다
- NotifyOnService는 비즈니스 로직 없이 결과를 그대로 리턴 → AOP가 워크플로우 트리거
- SpEL에서 `#result`, `#paramName`, `@beanName.method()` 사용 가능
- 복잡한 조건은 PayloadBuilder에 조건 메서드 작성 후 SpEL에서 호출

### 커스텀 어노테이션

| 어노테이션 | 위치 | 동작 |
|---|---|---|
| `@ApiResponseWrapper` | Controller 클래스 | 리턴값을 `ApiResponse<T>`로 자동 래핑 |
| `@Loggable("설명")` | Controller 메서드 | 요청/응답/실행시간 자동 로깅 |
| `@CurrentUser` | Controller 파라미터 | 인증된 사용자 ID 주입 |

### 에러 처리

- 도메인별 `ErrorCode` enum이 `CommonErrorCode` 인터페이스 구현
- `throw new BusinessException(도메인ErrorCode.에러코드)`

### 페이지네이션

- **Cursor 기반** (무한 스크롤): `CursorRequest` 상속 → `CursorResponse.of()`
- **Offset 기반** (관리자): `PaginationRequest` 상속 → `PaginationResponse.of()`

### TDD 작성 순서

Domain Aggregate → UseCase → Repository Adapter → Controller (안쪽에서 바깥으로). 상세 테스트 템플릿은 `references/tdd-templates.java.md` 참조.
