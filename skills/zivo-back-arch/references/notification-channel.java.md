# 알림 채널 (NotificationChannel) 가이드

신규 알림 채널 추가 시 수정이 필요한 모든 지점을 다룬다.

## Enum 이중 구조 (주의)

두 개의 NotificationChannel enum이 별도로 존재한다. **값 체계가 다르므로** 양쪽을 독립적으로 관리해야 한다.

| Enum | 위치 | 용도 | 값 예시 |
|------|------|------|---------|
| `enumeration.NotificationChannel` | `enumeration/NotificationChannel.java` | 발송 라우팅 | `PUSH`, `WEBSOCKET`, `EMAIL`, `SMS`, `BIZPPURIO` |
| `NotificationLog.NotificationChannel` | `entity/NotificationLog.java` 내부 enum | 로그 기록 | `FCM`, `IN_APP`, `WEBSOCKET`, `SMS`, `EMAIL`, `BIZPPURIO`, `SYSTEM` |

> `PUSH` vs `FCM`, `IN_APP` 존재 여부 등 네이밍이 다르다. 신규 채널 추가 시 양쪽의 네이밍 컨벤션을 별도로 검토할 것.

## 현재 채널 현황

| 채널 | Sender 구현체 | 상태 |
|------|--------------|------|
| `PUSH` | `PushNotificationSender` | 활성 |
| `WEBSOCKET` | `BulkNotificationEventListener` 직접 처리 | 활성 |
| `BIZPPURIO` | `BizppurioNotificationSender` | 활성 |
| `EMAIL` | `EmailNotificationSender` | `supports()=false` (비활성) |
| `SMS` | 구현체 없음 | 미구현 |
| `SYSTEM` | 로그 전용 (발송 없음) | 활성 |

## 신규 채널 추가 체크리스트

### 1. Backend Enum 추가 (필수)

```java
// enumeration/NotificationChannel.java — 발송용
public enum NotificationChannel {
    PUSH, WEBSOCKET, EMAIL, SMS, BIZPPURIO,
    NEW_CHANNEL  // 추가
}

// entity/NotificationLog.java — 로그용 (내부 enum)
public enum NotificationChannel {
    FCM, IN_APP, WEBSOCKET, SMS, EMAIL, BIZPPURIO, SYSTEM,
    NEW_CHANNEL  // 추가
}
```

### 2. NotificationSender 구현체 생성 (필수)

위치: `service/notification/{NewChannel}NotificationSender.java`

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class NewChannelNotificationSender implements NotificationSender {

    @Override
    public NotificationChannel getChannel() {
        return NotificationChannel.NEW_CHANNEL;
    }

    @Override
    public boolean supports() {
        return true;  // false면 비활성
    }

    @Override
    public int getPriority() {
        return 30;  // 낮을수록 먼저 실행 (PUSH=10, WEBSOCKET=20, BIZPPURIO=40)
    }

    @Override
    public void send(Long userId, String title, String body, Map<String, String> data) {
        // 발송 로직
    }
}
```

> `NotificationSenderRegistry`는 `List<NotificationSender>` 자동 주입이므로 **Registry 수정 불필요**.

### 3. BulkNotificationEvent — shouldSend 메서드 추가

위치: `event/notification/BulkNotificationEvent.java`

```java
// 기존: shouldSendFcm(), shouldSendWebSocket(), shouldSendBizppurio(), shouldSendEmail()
// 추가:
public boolean shouldSendNewChannel() {
    return channels != null && channels.contains("NEW_CHANNEL");
}
```

### 4. BulkNotificationEventListener — 발송 분기 추가

위치: `listener/notification/BulkNotificationEventListener.java`

기존 if 블록 패턴을 따라 추가:

```java
// 기존 패턴 (shouldSendFcm, shouldSendWebSocket, shouldSendBizppurio, shouldSendEmail)
if (event.shouldSendNewChannel()) {
    sendNewChannel(userId, event);
}
```

### 5. NotificationLogEvent — 로그 팩토리 메서드 추가 (선택)

위치: `event/logging/NotificationLogEvent.java`

채널별 성공/실패 로그가 필요한 경우:

```java
public static NotificationLogEvent newChannelSuccess(
        Long userId, String title, String body,
        String type, String subType, String source) {
    return new NotificationLogEvent(
            LogType.NEW_CHANNEL_SUCCESS, NotificationChannel.NEW_CHANNEL,
            userId, null, null, title, body, null, 0,
            type, subType, null, null, source,
            null, null, null, null
    );
}
```

> `LogType` enum에도 새 값 추가 필요. `LoggingEventListener.buildNotificationLog()`에 switch case 추가.

### 6. application.properties — 기본 채널 설정 (선택)

```properties
# 현재: notification.default.channels=PUSH,WEBSOCKET
# 새 채널을 기본 발송 대상에 포함할 경우:
notification.default.channels=PUSH,WEBSOCKET,NEW_CHANNEL
```

### 7. Frontend (ZIVO_ADMIN) — 4개 파일 동기화

| 파일 | 수정 내용 |
|------|----------|
| `shared/types/notificationTrigger.ts` | `NotificationChannel` 타입 유니온에 값 추가 + `CHANNEL_LABELS` Record에 레이블 추가 |
| `shared/types/workflow.ts` | `WorkflowNodeData.channels` 타입 유니온에 값 추가 |
| `pages/.../workflow/.../constants/nodeOptions.ts` | `CHANNEL_OPTIONS` 배열에 항목 추가 (워크플로우 에디터 UI) |
| `pages/.../notification/NotificationHistoryPage/index.tsx` | 채널 필터/표시에 새 채널 추가 (알림 이력 페이지) |

### 8. DB DDL (일반적으로 불필요)

- `channel varchar(20)` — 새 채널 이름이 20자 이내면 변경 불필요
- CHECK 제약 없으므로 enum 값만 추가하면 동작
- 새 채널의 에러 추적이 필요하면 부분 인덱스 추가 권장:

```sql
CREATE INDEX idx_noti_log_new_channel_error
ON public.zivo_notification_log (fcm_error_type)
WHERE channel = 'NEW_CHANNEL' AND status = 'FAILED';
```

## 수정 순서 요약

```
[Backend]
1. enumeration/NotificationChannel.java         — enum 값 추가
2. entity/NotificationLog.java                   — 내부 enum 동기화
3. service/notification/XxxSender.java           — NotificationSender 구현 (@Component)
4. event/notification/BulkNotificationEvent.java — shouldSendXxx() 추가
5. listener/notification/BulkNotificationEventListener.java — if 블록 + 발송 메서드
6. event/logging/NotificationLogEvent.java       — 로그 팩토리 메서드 (선택)
7. listener/logging/LoggingEventListener.java    — switch case 추가 (선택)
8. application.properties                        — 기본 채널 포함 여부

[Frontend - ZIVO_ADMIN]
9.  shared/types/notificationTrigger.ts          — 타입 + 레이블
10. shared/types/workflow.ts                     — channels 타입
11. constants/nodeOptions.ts                     — CHANNEL_OPTIONS
12. NotificationHistoryPage/index.tsx            — 이력 필터/표시
```
