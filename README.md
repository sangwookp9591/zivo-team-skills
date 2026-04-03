# ZIVO TEAM Skills

ZIVO 팀 전용 AI 에이전트 스킬 관리 CLI.

## 설치

### npx (권장)

```bash
npx zivo-skills add https://github.com/sangwookp9591/zivo-team-skills --code ZIVOTEAM01
```

### Git Clone

```bash
# 1. 레포지토리 클론
git clone https://github.com/sangwookp9591/zivo-team-skills.git
cd zivo-team-skills

# 2. 의존성 설치 및 빌드
pnpm install
pnpm build

# 3. 로컬 경로로 스킬 설치 (프로젝트 디렉토리에서 실행)
cd /path/to/your-project
npx zivo-skills add /path/to/zivo-team-skills --code ZIVOTEAM01

# 또는 전체 스킬 한번에 설치
npx zivo-skills add /path/to/zivo-team-skills --all --code ZIVOTEAM01
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

| 에이전트    | 설치 경로         |
| ----------- | ----------------- |
| Claude Code | `.claude/skills/` |
| Codex       | `.codex/skills/`  |
| Gemini CLI  | `.gemini/skills/` |
| Cursor      | `.cursor/skills/` |

## 스킬 목록

| 스킬             | 설명                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zivo-back-arch` | Spring Boot + MyBatis/JPA, DDD/Hexagonal 아키텍처 가이드. 커스텀 어노테이션(@NotifyOn, @ApiResponseWrapper, @Loggable), TDD, 보안 등 백엔드 전반 |
| `zivo-back-gof`  | Spring Boot GoF 디자인 패턴 가이드. 상황별 패턴 추천, 오버엔지니어링 판단, DDD 계층 내 패턴 적용                                                 |

## 옵션

| 옵션             | 설명                   |
| ---------------- | ---------------------- |
| `--skill <name>` | 특정 스킬만 설치       |
| `--all`          | 전체 스킬 설치         |
| `--code <code>`  | 팀 인증 코드           |
| `-y, --yes`      | 프롬프트 스킵          |
| `-g, --global`   | 글로벌 설치            |
| `--copy`         | symlink 대신 파일 복사 |
| `--force`        | 충돌 시 강제 덮어쓰기  |
| `--no-cache`     | 캐시 무시              |

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

### Deploy

```bash
pnpm install
pnpm build
npm version patch
npm publish --access public
```

## License

MIT
