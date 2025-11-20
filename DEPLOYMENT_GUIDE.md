# 🚀 Deployment & Hybrid Scheduler Setup Guide

이 가이드는 Supabase + Vercel + GitHub Actions를 사용한 완전 자동화 배포 가이드입니다.

## 📋 목차

1. [Vercel 배포](#1-vercel-배포)
2. [GitHub Secrets 설정](#2-github-secrets-설정)
3. [Vercel 환경변수 설정](#3-vercel-환경변수-설정)
4. [GitHub Actions 활성화](#4-github-actions-활성화)
5. [테스트 및 확인](#5-테스트-및-확인)

---

## 1. Vercel 배포

### 1.1 GitHub 저장소에 Push

```bash
git add .
git commit -m "feat: Add Supabase + GitHub Actions hybrid scheduler"
git push origin main
```

### 1.2 Vercel에 프로젝트 연결

1. https://vercel.com 접속 및 로그인
2. **New Project** 클릭
3. GitHub 저장소 선택 (`stockweb`)
4. **Import** 클릭
5. 환경변수 설정 (다음 섹션 참조)
6. **Deploy** 클릭

---

## 2. GitHub Secrets 설정

GitHub Actions가 Vercel API를 호출하려면 2개의 Secrets이 필요합니다.

### 2.1 CRON_SECRET 생성

```bash
# PowerShell에서 실행
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

또는:

```bash
# Git Bash에서 실행
openssl rand -base64 32
```

**생성된 값 복사** → 예: `AbCdEf123456...`

### 2.2 GitHub Secrets 등록

1. GitHub 저장소 페이지 이동
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭
4. 다음 2개 Secret 등록:

| Name | Value | 설명 |
|------|-------|------|
| `CRON_SECRET` | (위에서 생성한 값) | API 인증 토큰 |
| `VERCEL_URL` | `https://your-project.vercel.app` | Vercel 배포 URL |

> ⚠️ **VERCEL_URL**: Vercel 배포 후 생성된 URL을 복사하여 입력하세요 (예: `https://stockweb-abc123.vercel.app`)

---

## 3. Vercel 환경변수 설정

### 3.1 필수 환경변수

Vercel Dashboard → 프로젝트 → **Settings** → **Environment Variables**에서 다음 변수들을 추가:

| Variable | Value | 설명 |
|----------|-------|------|
| `DATABASE_URL` | `postgresql://postgres.qcsslfsbsfafuljpdzuw:wnthdud1245@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres` | Supabase DB 연결 |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` | Production URL |
| `NEXTAUTH_SECRET` | (기존 값 복사) | NextAuth 시크릿 |
| `KIS_APP_KEY` | (기존 값 복사) | KIS API Key |
| `KIS_APP_SECRET` | (기존 값 복사) | KIS API Secret |
| `KIS_API_URL` | `https://openapivts.koreainvestment.com:29443` | KIS API URL |
| `OPENAI_API_KEY` | (기존 값 복사) | OpenAI API Key |
| `CRON_SECRET` | (위에서 생성한 값) | GitHub Actions 인증 |
| `AUTO_BACKFILL_JOURNAL` | `true` | 저널 자동 백필 |
| `AUTO_BACKFILL_JOURNAL_DAYS` | `7` | 백필 최대 일수 |

### 3.2 환경변수 적용

- 모든 환경변수는 **Production**, **Preview**, **Development** 모두에 적용
- **Save** 클릭 후 **Redeploy** 필요

---

## 4. GitHub Actions 활성화

### 4.1 워크플로우 확인

저장소의 `.github/workflows/` 디렉토리에 7개 워크플로우가 있는지 확인:

- ✅ `cron-midnight.yml` - 자정 작업 (00:00 KST)
- ✅ `cron-daily-candle.yml` - 일봉 생성 (15:35 KST)
- ✅ `cron-market-analysis.yml` - 시장 분석 (15:35 KST)
- ✅ `cron-portfolio-snapshot.yml` - 포트폴리오 스냅샷 (15:40 KST)
- ✅ `cron-portfolio-analysis.yml` - 포트폴리오 분석 (16:00 KST)
- ✅ `cron-ranking-update.yml` - 랭킹 업데이트 (16:10 KST)
- ✅ `cron-database-backup.yml` - DB 백업 (23:59 KST)

### 4.2 Actions 권한 설정

1. GitHub 저장소 → **Settings** → **Actions** → **General**
2. **Workflow permissions** 섹션:
   - ✅ **Read and write permissions** 선택
   - ✅ **Allow GitHub Actions to create and approve pull requests** 체크
3. **Save** 클릭

### 4.3 첫 실행 확인

1. **Actions** 탭 이동
2. 7개 워크플로우가 표시되는지 확인
3. 수동 테스트:
   - 원하는 워크플로우 클릭
   - **Run workflow** → **Run workflow** 클릭
   - 실행 결과 확인

---

## 5. 테스트 및 확인

### 5.1 API 엔드포인트 수동 테스트

로컬에서 테스트:

```bash
# CRON_SECRET 환경변수 설정
$CRON_SECRET = "your-cron-secret-here"

# Midnight Tasks 테스트
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  https://your-project.vercel.app/api/cron/midnight

# Daily Candle 테스트
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  https://your-project.vercel.app/api/cron/daily-candle
```

**예상 결과**:
```json
{
  "success": true,
  "message": "Task completed",
  ...
}
```

### 5.2 스케줄 동작 확인

다음 날 확인 사항:

- [ ] 00:00 - Midnight tasks 실행됨
- [ ] 15:35 - Daily candle 생성됨
- [ ] 15:35 - Market analysis 생성됨
- [ ] 15:40 - Portfolio snapshots 생성됨
- [ ] 16:00 - Portfolio analysis 생성됨
- [ ] 16:10 - Rankings 업데이트됨
- [ ] 23:59 - Database backup 생성됨

**확인 방법**:
1. GitHub → **Actions** 탭 → 각 워크플로우의 실행 기록 확인
2. Vercel → **Logs** 탭 → API 호출 로그 확인

### 5.3 오류 발생 시

**증상**: API가 401 Unauthorized 반환

**해결**:
1. GitHub Secrets의 `CRON_SECRET` 값 확인
2. Vercel 환경변수의 `CRON_SECRET` 값이 동일한지 확인
3. 두 값이 정확히 일치해야 함

**증상**: 워크플로우가 실행되지 않음

**해결**:
1. `.github/workflows/` 파일들이 `main` 브랜치에 푸시되었는지 확인
2. GitHub Actions 권한이 활성화되어 있는지 확인
3. cron 표현식이 UTC 기준인지 확인 (KST = UTC+9)

---

## 6. 아키텍처 설명

### 스케줄러 구조

```
┌─────────────────────────────────────────────┐
│           GitHub Actions (Scheduler)        │
│  - 정해진 시간에 API 호출                     │
│  - 무료 (월 2000분)                          │
│  - 서버 없이도 작동                           │
└─────────────────┬───────────────────────────┘
                  │ HTTP POST
                  │ (with Bearer Token)
                  ↓
┌─────────────────────────────────────────────┐
│        Vercel (Serverless Functions)        │
│  - API 엔드포인트 호출 받음                   │
│  - 실제 작업 실행                            │
│  - Supabase DB 연결                          │
└─────────────────┬───────────────────────────┘
                  │ SQL
                  ↓
┌─────────────────────────────────────────────┐
│          Supabase (PostgreSQL)              │
│  - 클라우드 데이터베이스                      │
│  - 24/7 작동                                 │
└─────────────────────────────────────────────┘
```

### 주요 장점

✅ **서버 불필요**: 로컬 컴퓨터 꺼져도 작동
✅ **무료**: GitHub Actions 월 2000분 무료
✅ **안정적**: GitHub + Vercel 인프라 사용
✅ **확장 가능**: 스케줄 추가/수정 용이

---

## 7. 유지보수

### 스케줄 시간 변경

`.github/workflows/` 파일의 cron 표현식 수정:

```yaml
schedule:
  # 기존: 15:35 KST = 06:35 UTC
  - cron: '35 6 * * 1-5'

  # 변경 예시: 16:00 KST = 07:00 UTC
  - cron: '0 7 * * 1-5'
```

변경 후 `git push` → 자동 적용

### 새 스케줄 작업 추가

1. API 엔드포인트 생성 (`src/app/api/cron/[name]/route.ts`)
2. GitHub Actions 워크플로우 생성 (`.github/workflows/cron-[name].yml`)
3. Push 후 확인

---

## 🎉 완료!

이제 서버 없이도 모든 스케줄 작업이 자동으로 실행됩니다!

문제 발생 시 GitHub Actions 로그와 Vercel 로그를 확인하세요.
