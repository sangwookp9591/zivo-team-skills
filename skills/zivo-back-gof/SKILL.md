---
name: zivo-back-gof
description: Spring Boot GoF 디자인 패턴 가이드. 상황별 패턴 추천, 오버엔지니어링 판단, 다른 스킬과의 병합 사용을 지원한다. 코드에서 if-else/switch 분기, 타입별 처리, 확장성 설계, 결합도 개선, 리팩토링, 상태 머신, 이벤트 처리, 외부 시스템 연동 등을 다룰 때 이 스킬을 사용한다. zivo-back-arch 스킬과 함께 사용하면 DDD 계층 구조 안에서 패턴 적용 위치를 정확하게 안내한다.
---

# Spring Boot GoF Design Patterns

Spring Boot 프로젝트에서 GoF 패턴을 적용하는 실전 가이드. 패턴 자체의 이론보다 "언제, 왜 쓰는가"와 "정말 필요한가"에 집중한다.

## 다른 스킬과의 병합 사용

이 스킬은 단독으로도 사용 가능하지만, 다른 스킬과 함께 쓸 때 더 강력하다.

### zivo-back-arch와 함께 사용

`zivo-back-arch` 스킬의 DDD 계층 구조 안에서 각 패턴이 어디에 위치하는지:

| 패턴 | DDD 계층 위치 | 해당 references 템플릿 |
|---|---|---|
| Strategy | `domain/` 또는 `application/` | `usecase.java.md` 내 UseCase에서 Registry 주입 |
| Factory Method | `application/` 또는 `infrastructure/` | `usecase.java.md` 내 Factory 빈 |
| Template Method | `application/usecase/` | `usecase.java.md` abstract UseCase |
| Observer | `application/` → Spring Event | `notify-on.java.md`의 @NotifyOn과 상호보완 |
| Builder | `domain/aggregate/` | `domain-aggregate.java.md`의 Builder 섹션 |
| Adapter | `infrastructure/external/` | `repository-adapter-*.java.md` 패턴 확장 |
| Decorator | `application/` 또는 `infrastructure/` | UseCase 래핑 |
| Proxy (AOP) | `support/` 횡단 관심사 | @Loggable, @NotifyOn이 이미 Proxy 패턴 |
| Chain of Responsibility | `application/` 검증 체인 | `usecase.java.md` 내 Validator 주입 |
| State | `domain/aggregate/` | `domain-aggregate.java.md` 상태 전이 |
| Facade | `application/` | UseCase가 이미 Facade 역할 |
| Composite | `domain/` | 트리 구조 도메인 모델 |

**@NotifyOn과 Observer 패턴의 관계**: `zivo-back-arch`의 `@NotifyOn`은 알림 전용 Observer 구현이다. 알림 외의 이벤트 기반 처리(포인트 적립, 통계 기록, 캐시 무효화 등)는 Spring Event Observer 패턴을 직접 사용한다. 둘은 상호 보완 관계.

**UseCase와 Facade의 관계**: `zivo-back-arch`의 UseCase 패턴은 이미 Facade 역할을 한다. 여러 도메인을 조합해야 할 때는 별도 Facade를 만들기보다 조합 전용 UseCase를 생성하는 것이 ZIVO 프로젝트 구조에 일관적이다.

### 다른 스킬과 병합 시 규칙

1. **아키텍처 스킬이 계층 위치를 결정**하고, GoF 스킬이 해당 계층 내 구현 패턴을 제공한다
2. **기존 커스텀 어노테이션이 이미 패턴을 구현**하고 있다면 (예: @NotifyOn = Observer, @Loggable = Proxy), 중복 구현하지 않는다
3. 패턴 적용 후 **코드가 아키텍처 스킬의 계층 규칙을 위반하지 않는지** 확인한다

---

## 오버엔지니어링 판단 기준

패턴을 적용하기 전에 아래 체크리스트를 반드시 확인한다. 하나라도 해당하면 패턴 적용을 재고한다.

### 적용하지 않는 경우 (YAGNI)

| 상황 | 이유 | 대안 |
|---|---|---|
| 분기가 2개 이하 | 패턴 오버헤드가 가독성을 해침 | 단순 if-else 유지 |
| 향후 확장 가능성이 불확실 | 추측 기반 설계는 불필요한 복잡성 | 필요할 때 리팩토링 |
| 구현체가 1개뿐이고 늘어날 계획 없음 | 인터페이스+구현체 분리가 오히려 방해 | 구체 클래스 직접 사용 |
| 팀에서 해당 패턴에 익숙하지 않음 | 유지보수 비용 증가 | 주석으로 의도 설명 후 단순 구현 |
| 로직 자체가 10줄 이내 | 패턴 보일러플레이트가 로직보다 많음 | 인라인 로직 |

### 적용하는 경우

| 상황 | 근거 |
|---|---|
| 분기가 3개 이상이고 **이미 늘어나는 추세** | 매번 switch에 case 추가하면 OCP 위반 |
| 외부 시스템 연동이 **교체 가능성** 있음 | Adapter로 격리하면 교체 비용 최소화 |
| 동일한 흐름이 3곳 이상에서 **복붙** | Template Method로 DRY 원칙 적용 |
| 이벤트 후속 처리가 계속 **추가 요청** 옴 | Observer로 분리하면 기존 코드 수정 불필요 |
| 상태 전이 규칙이 **복잡하고 비즈니스에 중요** | State 패턴으로 잘못된 전이를 컴파일 타임에 방지 |

### 판단 플로우

```
코드 냄새 발견
  → 현재 분기/중복이 몇 개? (2개 이하면 STOP)
  → 최근 3개월간 이 부분에 변경이 있었나? (없으면 STOP)
  → 앞으로 확장될 근거가 있나? (추측이면 STOP, 요구사항/백로그에 있으면 GO)
  → 패턴 적용 시 코드량 증가 대비 얻는 이점? (보일러플레이트 > 로직이면 STOP)
  → GO: 패턴 적용 + references 참조
```

**패턴을 추천할 때 반드시 오버엔지니어링 판단을 함께 제시한다.** "Strategy 패턴을 추천합니다" 대신 "현재 분기가 4개이고 최근에 2개 추가된 이력이 있으므로 Strategy 패턴이 적합합니다" 또는 "분기가 2개뿐이므로 지금은 if-else가 더 적절합니다. 3개 이상으로 늘어날 때 Strategy를 고려하세요"처럼 판단 근거를 명시한다.

---

## 상황별 패턴 추천

코드를 분석하거나 기능을 구현할 때, 아래 상황을 감지하면 적극적으로 패턴을 추천한다.

### 기능 구현 시 추천

| 구현 중인 기능 | 추천 패턴 | 이유 |
|---|---|---|
| 결제/알림/내보내기 등 다중 채널 | **Strategy + Factory** | 채널별 분기를 OCP 준수로 전환 |
| 외부 API 연동 (SMS, 결제, 지도) | **Adapter** | 외부 변경이 도메인에 전파되지 않도록 격리 |
| 주문/예약/승인 등 상태 흐름 | **State** (복잡) 또는 **Enum 상태 전이** (단순) | 잘못된 전이를 방지하는 안전장치 |
| 데이터 동기화/배치 작업 | **Template Method** | 공통 흐름(조회→변환→저장)을 재사용 |
| 주문 완료 후 포인트/쿠폰/알림 | **Observer** (Spring Event) | 후속 처리 추가 시 기존 코드 수정 불필요 |
| 검증 규칙이 여러 단계 | **Chain of Responsibility** | 검증기 추가/제거가 유연 |
| 여러 서비스를 조합하는 복잡한 트랜잭션 | **Facade** (또는 ZIVO UseCase) | 클라이언트에 단순 인터페이스 제공 |
| API 응답에 부가 정보 추가 | **Decorator** | 핵심 조회와 부가 데이터를 분리 |

### 리팩토링 시 추천

| 발견한 코드 냄새 | 추천 패턴 | Before → After |
|---|---|---|
| switch/if-else가 여러 파일에 복붙 | **Strategy** | 각 case를 독립 클래스로 분리 |
| `new XxxService()` 직접 생성이 곳곳에 | **Factory + DI** | Spring Bean으로 전환 |
| 같은 순서의 코드가 3곳 이상 반복 | **Template Method** | abstract class로 뼈대 추출 |
| Service에 `if(status == A)` 산재 | **State** | 상태 객체에 행위 위임 |
| 메서드 하나에 로깅+검증+캐싱+비즈니스 로직 혼재 | **Proxy (AOP) + Decorator** | 횡단 관심사를 어노테이션으로 분리 |

---

## 패턴 선택 매트릭스

코드에서 아래 신호를 발견하면 해당 패턴을 고려한다.

| 신호 (코드 냄새) | 추천 패턴 | references 파일 |
|---|---|---|
| 타입별 if-else/switch 분기가 3개 이상 | **Strategy** | `references/behavioral.md` |
| 조건에 따라 다른 객체 생성 | **Factory Method** | `references/creational.md` |
| 알고리즘 뼈대는 같고 세부 단계만 다름 | **Template Method** | `references/behavioral.md` |
| 이벤트 발생 시 여러 후속 처리 필요 | **Observer** (Spring Event) | `references/behavioral.md` |
| 생성자 파라미터가 5개 이상 | **Builder** | `references/creational.md` |
| 기존 객체에 동적으로 기능 추가 | **Decorator** | `references/structural.md` |
| 외부 라이브러리 인터페이스 불일치 | **Adapter** | `references/structural.md` |
| 메서드 호출 전후에 횡단 관심사 | **Proxy** (AOP) | `references/structural.md` |
| 요청을 여러 핸들러가 순차 처리 | **Chain of Responsibility** | `references/behavioral.md` |
| 객체 상태에 따라 행위가 완전히 변경 | **State** | `references/behavioral.md` |
| 복잡한 서브시스템을 단순 인터페이스로 | **Facade** | `references/structural.md` |
| 트리 구조의 재귀적 구성 | **Composite** | `references/structural.md` |

---

## References 라우팅

패턴 선택 후 해당 references 파일을 읽어 Spring Boot 구현 예시를 확인한다.

| references 파일 | 포함 패턴 |
|---|---|
| `references/creational.md` | Factory Method, Abstract Factory, Builder, Singleton |
| `references/structural.md` | Adapter, Decorator, Proxy(AOP), Facade, Composite |
| `references/behavioral.md` | Strategy, Template Method, Observer, Chain of Responsibility, State |
