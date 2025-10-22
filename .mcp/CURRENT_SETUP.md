# 현재 MCP 설정 상태

## 📅 마지막 업데이트
2024-10-22 (Postgres + Sequential Thinking MCP 추가)

## ✅ 활성화된 MCP (총 3개)

### 1. Context7 MCP
- **이름**: `context7-mcp`
- **제공자**: Upstash
- **버전**: Latest (Smithery CLI 사용)
- **상태**: ✅ 활성화
- **API 키**: 환경변수로 관리

**실행 명령어:**
```bash
npx -y @smithery/cli@latest run @upstash/context7-mcp --key <API_KEY>
```

**용도:** 코드베이스 분석, 컨텍스트 추적, AI 개발 보조

---

### 2. Postgres MCP
- **이름**: `postgres`
- **제공자**: Model Context Protocol
- **버전**: Latest
- **상태**: ✅ 활성화
- **연결**: stockmate 데이터베이스

**실행 명령어:**
```bash
npx -y @modelcontextprotocol/server-postgres postgresql://postgres:***@localhost:5432/stockmate
```

**용도:** 실시간 DB 쿼리, 데이터 분석, 성능 최적화

**주요 기능:**
- 🗄️ SQL 쿼리 자동 생성 및 실행
- 📊 통계 및 집계 분석
- 🔍 스키마 및 인덱스 분석
- 💡 성능 최적화 제안

---

### 3. Sequential Thinking MCP
- **이름**: `sequential-thinking`
- **제공자**: Model Context Protocol
- **버전**: Latest
- **상태**: ✅ 활성화

**실행 명령어:**
```bash
npx -y @modelcontextprotocol/server-sequential-thinking
```

**용도:** 단계별 사고 과정 시각화, 복잡한 문제 해결, 디버깅

**주요 기능:**
- 🧩 복잡한 문제 단계별 분해
- 🔬 논리적 추론 과정 투명화
- 🐛 디버깅 과정 시각화
- 📚 학습 효과 극대화

---

**설정 위치:**
- 글로벌: `%APPDATA%\Claude\claude_desktop_config.json`
- 프로젝트: `.mcp/` 폴더에 문서로 관리

---

## 📊 MCP 기능 분석

### Context7이 제공하는 기능

#### 코드 분석
- ✅ TypeScript/JavaScript 완전 지원
- ✅ React 컴포넌트 분석
- ✅ Prisma 스키마 이해
- ✅ Next.js App Router 구조 파악

#### 프로젝트 컨텍스트
- ✅ 파일 간 관계 추적
- ✅ 함수/클래스 사용처 검색
- ✅ 데이터 모델 관계 분석
- ✅ API 엔드포인트 매핑

#### 개발 보조
- ✅ 코드 리팩토링 제안
- ✅ 버그 패턴 감지
- ✅ 테스트 작성 도움
- ✅ 문서화 자동 생성

---

## 🎯 StockMate 프로젝트에서의 활용

### 현재 인덱싱된 내용
```
✅ src/app/               - Next.js App Router 페이지
✅ src/components/        - React 컴포넌트
✅ src/lib/services/      - 비즈니스 로직
✅ src/lib/utils/         - 유틸리티 함수
✅ prisma/schema.prisma   - 데이터베이스 스키마
✅ tests/                 - 테스트 코드
```

### 활용 예시

**질문 1:**
```
"User 모델과 연결된 모든 테이블은?"
```
**Context7 답변:**
- Portfolio (1:1)
- Transaction (1:N)
- Post (1:N)
- Comment (1:N)
- Like (1:N)
- Follow (M:N self-relation)
- Ranking (1:1)

**질문 2:**
```
"등록 API의 전체 플로우는?"
```
**Context7 답변:**
1. `/api/auth/register` 엔드포인트 (route.ts)
2. 입력 검증 (validation.ts - Zod)
3. 비즈니스 로직 (authService.ts)
4. DB 트랜잭션 (Prisma)
5. 응답 반환 (api.ts 타입)

---

## 📈 성능 최적화

### 인덱싱 최적화
Context7이 불필요한 파일을 스캔하지 않도록:

**제외 대상:**
```
node_modules/
.next/
dist/
coverage/
.git/
*.log
```

**우선 인덱싱:**
```
src/**/*.{ts,tsx}
prisma/schema.prisma
tests/**/*.test.ts
```

---

## 🔄 업데이트 계획

### Phase 2 (Core Trading)
- Context7 계속 사용
- KIS API 통합 시 새 코드 자동 인덱싱

### Phase 3 (배포)
- Supabase MCP 추가 고려
- 프로덕션 환경 MCP 설정 분리

---

## 🔐 보안 설정

### API 키 관리 규칙
1. ✅ API 키는 개인 `claude_desktop_config.json`에만 저장
2. ✅ 환경변수로 관리 고려 (`CONTEXT7_API_KEY`)
3. ❌ Git에 절대 커밋 금지
4. ❌ 팀 채팅에 키 공유 금지

### .gitignore 확인
```gitignore
# MCP 개인 설정
.mcp/local.json
.mcp/*.key
.mcp/secrets.*

# Claude Desktop 설정
claude_desktop_config.json
```

---

## 📝 다음 단계

### 즉시 활용 가능
- [x] Context7 활성화 완료
- [x] 프로젝트 인덱싱 완료
- [ ] 팀원 온보딩 (필요 시)

### Phase 2 준비
- [ ] KIS API MCP 탐색
- [ ] 추가 MCP 필요성 검토

---

**이 문서는 프로젝트 MCP 설정의 스냅샷입니다.**
**실제 설정은 개인 Claude Desktop 설정 파일에서 관리됩니다.**
