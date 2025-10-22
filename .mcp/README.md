# StockMate MCP 설정 가이드

## 📋 현재 사용 중인 MCP

### Context7 MCP (Upstash)
- **용도**: 코드베이스 분석 및 AI 개발 보조
- **제공**: Upstash Context7
- **상태**: ✅ 활성화됨

**주요 기능:**
- 🧠 프로젝트 전체 코드베이스 인덱싱
- 📚 컨텍스트 자동 추적
- 🔗 코드 간 관계 분석
- 📝 문서화 보조
- 🤖 AI 개발 보조 향상

---

## 🔧 팀원 MCP 설정 방법

### 필수 준비물
- Claude Desktop 설치
- Context7 API 키 (팀장에게 요청)

### Step 1: Claude Desktop 종료
```bash
# 작업 관리자에서 Claude Desktop 완전히 종료
```

### Step 2: 설정 파일 편집

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Mac:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Step 3: MCP 설정 추가

아래 설정을 `claude_desktop_config.json` 파일에 추가하세요:

```json
{
  "mcpServers": {
    "context7-mcp": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@smithery/cli@latest",
        "run",
        "@upstash/context7-mcp",
        "--key",
        "YOUR_API_KEY_HERE"
      ]
    }
  }
}
```

**⚠️ 중요:** `YOUR_API_KEY_HERE`를 실제 API 키로 교체하세요.

### Step 4: Claude Desktop 재시작
```bash
# Claude Desktop을 다시 실행
# 새 대화를 시작하면 Context7이 자동으로 활성화됩니다
```

---

## ✅ 설정 확인 방법

Claude Desktop에서 새 대화를 시작하고 다음과 같이 질문해보세요:

```
"StockMate 프로젝트에서 User 모델은 어디서 사용되나요?"
```

Context7이 정상 작동하면, 프로젝트 전체에서 User 모델 사용 위치를 정확하게 분석해서 알려줍니다.

---

## 🔐 보안 주의사항

### API 키 관리
- ❌ **절대** API 키를 Git에 커밋하지 마세요
- ✅ API 키는 개인 설정 파일에만 저장
- ✅ 팀원 온보딩 시 개별적으로 공유

### .gitignore 확인
```gitignore
# Claude Desktop 설정 (개인)
claude_desktop_config.json

# MCP 로컬 설정 (개인)
.mcp/local.json
.mcp/*.key
```

---

## 📊 프로젝트별 MCP 최적화 (선택사항)

Context7이 분석할 경로를 최적화할 수 있습니다:

**분석 대상:**
- ✅ `src/` - 소스 코드
- ✅ `prisma/` - 데이터베이스 스키마
- ✅ `tests/` - 테스트 코드
- ❌ `node_modules/` - 제외
- ❌ `.next/` - 제외
- ❌ `dist/` - 제외

---

## 🚀 향후 추가 예정 MCP

### Phase 2 이후
- [ ] **Supabase MCP** - 클라우드 배포 시
- [ ] **GitHub MCP** - 이슈/PR 관리 필요 시

### 추가 검토 중
- [ ] **Postgres MCP** - DB 직접 쿼리
- [ ] **Figma MCP** - 디자인 통합

---

## 📚 참고 자료

- [Context7 공식 문서](https://upstash.com/docs/context7)
- [Claude MCP 가이드](https://docs.anthropic.com/claude/docs/mcp)
- [Smithery MCP Registry](https://smithery.ai/)

---

## 🆘 문제 해결

### Q1: MCP가 연결되지 않아요
```
A: Claude Desktop을 완전히 종료하고 재시작하세요.
   작업 관리자에서 프로세스까지 종료 확인.
```

### Q2: API 키 오류가 발생해요
```
A: API 키가 올바른지 확인하세요.
   따옴표 없이 키만 입력되어야 합니다.
```

### Q3: Context7이 프로젝트를 인식 못해요
```
A: 프로젝트 폴더를 Claude Desktop에서 다시 열어보세요.
   인덱싱에 1-2분 정도 소요될 수 있습니다.
```

---

## 📝 변경 이력

- **2024-10-22**: 초기 문서 생성 (Context7 MCP)
- **향후**: Supabase MCP 추가 예정 (Phase 2)

---

**문의사항이 있으시면 프로젝트 관리자에게 연락하세요.**
