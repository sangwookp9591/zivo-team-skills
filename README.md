# ZIVO TEAM Skills

ZIVO 팀 전용 AI 에이전트 스킬 관리 CLI.

## 설치

```bash
npx zivo-skills add https://github.com/sangwookp9591/zivo-team-skills --code ZIVOTEAM01
```

## 사용법

### 특정 스킬 설치

```bash
npx zivo-skills add https://github.com/sangwookp9591/zivo-team-skills \
  --skill zivo-back-arch --code ZIVOTEAM01
```

### 전체 스킬 설치

```bash
npx zivo-skills add https://github.com/sangwookp9591/zivo-team-skills \
  --all --code ZIVOTEAM01
```

### 프롬프트 없이 설치

```bash
npx zivo-skills add https://github.com/sangwookp9591/zivo-team-skills \
  --all -y --code ZIVOTEAM01
```

### 기타 명령어

```bash
# 설치된 스킬 목록
npx zivo-skills list

# 스킬 제거
npx zivo-skills remove <skill-name>
```

## 지원 에이전트

| 에이전트 | 설치 경로 |
|----------|-----------|
| Claude Code | `.claude/skills/` |
| Codex | `.codex/skills/` |
| Gemini CLI | `.gemini/skills/` |
| Cursor | `.cursor/skills/` |

## 스킬 목록

| 스킬 | 설명 |
|------|------|
| `zivo-back-arch` | Spring Boot + MyBatis/JPA, DDD/Hexagonal 아키텍처 가이드. 커스텀 어노테이션(@NotifyOn, @ApiResponseWrapper, @Loggable), TDD, 보안 등 백엔드 전반 |
| `zivo-back-gof` | Spring Boot GoF 디자인 패턴 가이드. 상황별 패턴 추천, 오버엔지니어링 판단, DDD 계층 내 패턴 적용 |

## 옵션

| 옵션 | 설명 |
|------|------|
| `--skill <name>` | 특정 스킬만 설치 |
| `--all` | 전체 스킬 설치 |
| `--code <code>` | 팀 인증 코드 |
| `-y, --yes` | 프롬프트 스킵 |
| `-g, --global` | 글로벌 설치 |
| `--copy` | symlink 대신 파일 복사 |
| `--force` | 충돌 시 강제 덮어쓰기 |
| `--no-cache` | 캐시 무시 |

## 스킬 개발

`skills/` 디렉토리에 새 스킬을 추가합니다:

```
skills/
└── my-skill/
    ├── SKILL.md           # 스킬 본문 (frontmatter 필수)
    └── references/        # 참조 파일 (선택)
        └── example.md
```

### SKILL.md frontmatter

```yaml
---
name: my-skill
description: 스킬 설명
triggers:
  - keyword1
  - keyword2
metadata:
  author: ZIVO Team
  version: "1.0.0"
---
```

## License

MIT
