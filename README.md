# ZIVO TEAM Skills

ZIVO 팀 전용 AI 에이전트 스킬 관리 CLI.

## 설치

### 스킬 이름으로 설치 (권장)

```bash
# 특정 스킬 설치
npx zivo-skills add zivo-back-arch --code {code}

# 전체 스킬 설치
npx zivo-skills add --all --code {code}

# 프롬프트 없이 설치
npx zivo-skills add zivo-back-resilience -y --code {code}
```

### GitHub URL로 설치

```bash
npx zivo-skills add https://github.com/sangwookp9591/zivo-team-skills \
  --skill zivo-back-arch --code {code}
```

### 로컬 경로로 설치 (개발용)

```bash
git clone https://github.com/sangwookp9591/zivo-team-skills.git
cd /path/to/your-project
npx zivo-skills add /path/to/zivo-team-skills --all --code {code}
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

### Backend

| 스킬                   | 설명                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `zivo-back-arch`       | Spring Boot + MyBatis/JPA, DDD/Hexagonal 아키텍처. @NotifyOn, @ApiResponseWrapper, @Loggable 등 커스텀 어노테이션, TDD, 보안 |
| `zivo-back-gof`        | Spring Boot GoF 디자인 패턴. 상황별 패턴 추천, 오버엔지니어링 판단, DDD 계층 내 패턴 적용                                    |
| `zivo-back-resilience` | Backend Resilience & Performance Guard. 외부 API timeout, 커넥션 풀, N+1, circuit breaker, 캐시 전략, 502/500/timeout 디버깅 |

### Frontend (Admin)

| 스킬                        | 설명                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `zivo-admin-new-page`       | 신규 페이지 추가. 리스트/상세 보일러플레이트, 레이아웃 패턴, API 서비스, TanStack Query, StyleX |
| `zivo-admin-workspace`      | 공유 컴포넌트/훅/타입. shared/ui 생성 규칙, 커스텀 훅, 프로젝트 구조 맵                         |
| `zivo-admin-migrate-design` | HTML → React+StyleX 마이그레이션. 90+ 컴포넌트 매핑, CSS→StyleX 변환, 갭 분석                   |
| `zivo-stylex-guide`         | StyleX 지뢰밭 가이드. 토큰, 반응형 로컬 상수 패턴, 에러 해결법                                  |

### Flutter

| 스킬                    | 설명                |
| ----------------------- | ------------------- |
| `zivo-flutter-arch`     | Flutter 앱 아키텍처 |
| `zivo-flutter-i18n`     | Flutter 다국어 처리 |
| `zivo-flutter-patterns` | Flutter 공통 패턴   |

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
git push
npm login
npm publish --access public
```

## License

MIT
