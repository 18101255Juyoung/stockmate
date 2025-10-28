# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StockMate (스톡메이트)** - A social platform for practicing stock investment safely through mock trading and community engagement.

### Tech Stack
- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js (email/password)
- **Charts**: Lightweight Charts (TradingView)
- **APIs**: KIS Developers API (stock data)
- **Testing**: Jest, React Testing Library
- **Code Quality**: Prettier, ESLint

---

## CRITICAL: Test-Driven Development (TDD)

This project **MUST** be developed using TDD. All code changes must follow this strict workflow:

### TDD Cycle (Non-negotiable)
1. 🔴 **RED**: Write the test first (no implementation yet)
2. 🔴 **RED**: Run test to verify it fails
3. 🟢 **GREEN**: Write minimal implementation to pass the test
4. 🟢 **GREEN**: Run test to verify it passes
5. 🔵 **REFACTOR**: Improve code while keeping tests passing
6. 🔵 **GREEN**: Re-run tests to ensure they still pass

### TDD Rules
- ❌ **NEVER** write implementation before tests
- ❌ **NEVER** skip verifying test failures
- ❌ **NEVER** modify tests during implementation
- ✅ **ALWAYS** ask "Should I write the test first?" when receiving feature requests

---

## Development Commands

### Project Setup
```bash
npm install                    # Install dependencies
npx prisma generate           # Generate Prisma Client
npx prisma migrate dev        # Run migrations
npx prisma db seed            # Seed database (if configured)
```

### Development
```bash
npm run dev                   # Start dev server (http://localhost:3000)
npm run build                 # Build for production
npm start                     # Start production server
```

### Testing
```bash
npm test                      # Run all tests
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Generate coverage report (target: 80%+)
jest path/to/test.spec.ts     # Run single test file
jest -t "test name"           # Run specific test by name
```

### Database
```bash
npx prisma studio             # Open database GUI
npx prisma migrate dev        # Create and apply migration
npx prisma migrate reset      # Reset database (destructive)
npx prisma db push            # Push schema without migration
```

### Code Quality
```bash
npm run lint                  # Run ESLint
npm run format                # Run Prettier
```

---

## Database Schema (Prisma)

### Core Models & Relations

```
User ─┬─< Portfolio (1:1)
      ├─< Transaction (1:N)
      ├─< Post (1:N)
      ├─< Comment (1:N)
      ├─< Like (1:N)
      ├─< Follow (M:N self-relation)
      └─< Ranking (1:1)

Portfolio ─< Holding (1:N)
Post ─┬─< Comment (1:N)
      └─< Like (1:N)
```

### Key Schema Details

**User**: Basic authentication and profile
- `id`, `email`, `password` (bcrypt), `username`, `displayName`, `bio`, `profileImage`

**Portfolio**: User's investment portfolio
- `initialCapital`: 10,000,000 (default)
- `currentCash`: Available cash
- `totalAssets`: Cash + stock values
- `totalReturn`: ROI percentage
- `realizedPL`: Realized profit/loss
- `unrealizedPL`: Unrealized profit/loss

**Holding**: Individual stock positions
- `stockCode`: Stock ticker (e.g., "005930")
- `quantity`: Number of shares
- `avgPrice`: Average purchase price (FIFO)
- `currentPrice`: Latest price from KIS API

**Transaction**: Trading history
- `type`: BUY or SELL
- `stockCode`, `stockName`, `quantity`, `price`
- `totalAmount`: quantity × price
- `fee`: Trading fee
- `note`: User's investment memo

**Post**: Community posts
- `isVerified`: Auto-verified if linked to real transactions
- `linkedTransactionIds`: Connected transaction IDs for verification
- `likeCount`, `commentCount`, `viewCount`

**Follow**: User follow relationships
- `followerId`: User who follows
- `followingId`: User being followed
- Unique constraint prevents duplicate follows

**Ranking**: Leaderboard entries
- `rank`: User's position
- `totalReturn`: ROI for ranking
- `period`: DAILY, WEEKLY, MONTHLY, ALL_TIME

---

## API Routes Structure

### Authentication (`/api/auth/*`)
- `POST /api/auth/register` - Create new user + portfolio
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Clear session

### Portfolio (`/api/portfolio/*`)
- `GET /api/portfolio` - Get current user's portfolio
- `GET /api/portfolio/history` - Portfolio value history

### Stocks (`/api/stocks/*`)
- `GET /api/stocks/[code]` - Get stock details (via KIS API)
- `GET /api/stocks/search?q=...` - Search stocks by name/code
- `GET /api/stocks/[code]/chart` - Get chart data

### Trading (`/api/transactions/*`)
- `POST /api/transactions/buy` - Execute buy order
- `POST /api/transactions/sell` - Execute sell order
- `GET /api/transactions` - Get transaction history
- `GET /api/transactions/[id]` - Get transaction details

### Community (`/api/posts/*`)
- `GET /api/posts` - List posts (supports filtering)
- `POST /api/posts` - Create post
- `GET /api/posts/[id]` - Get post details
- `PATCH /api/posts/[id]` - Update post (author only)
- `DELETE /api/posts/[id]` - Delete post (author only)
- `POST /api/posts/[id]/like` - Toggle like
- `POST /api/posts/[id]/comments` - Add comment
- `GET /api/posts/[id]/verify` - Verify investment authenticity

### Ranking (`/api/ranking/*`)
- `GET /api/ranking?period=DAILY` - Get rankings (DAILY/WEEKLY/MONTHLY/ALL_TIME)

### Users (`/api/users/*`)
- `GET /api/users/[username]` - Get public profile
- `PATCH /api/users/me` - Update own profile
- `POST /api/users/[id]/follow` - Follow user
- `DELETE /api/users/[id]/unfollow` - Unfollow user
- `GET /api/users/[id]/followers` - Get followers list
- `GET /api/users/[id]/following` - Get following list

---

## Core Business Logic

### 1. Buy Transaction Flow
```typescript
1. Validate input (stockCode, quantity > 0)
2. Fetch current price from KIS API
3. Calculate totalAmount = quantity × price + fee
4. Check if currentCash >= totalAmount
5. Create Transaction record (type: BUY)
6. Update Portfolio:
   - currentCash -= totalAmount
7. Update/Create Holding:
   - If holding exists:
     avgPrice = (old_quantity × old_avgPrice + quantity × price) / (old_quantity + quantity)
     quantity += new_quantity
   - If new: Create holding with avgPrice = price
8. Recalculate portfolio metrics
```

### 2. Sell Transaction Flow
```typescript
1. Validate input (stockCode, quantity > 0)
2. Check if holding exists and quantity <= holding.quantity
3. Fetch current price from KIS API
4. Calculate totalAmount = quantity × price - fee
5. Create Transaction record (type: SELL)
6. Update Portfolio:
   - currentCash += totalAmount
   - realizedPL += (price - holding.avgPrice) × quantity
7. Update Holding:
   - quantity -= sold_quantity
   - If quantity === 0: Delete holding
8. Recalculate portfolio metrics
```

### 3. Portfolio Metrics Calculation
```typescript
// Total Assets
totalAssets = currentCash + Σ(holding.quantity × holding.currentPrice)

// Total Return (%)
totalReturn = ((totalAssets - initialCapital) / initialCapital) × 100

// Unrealized P/L
unrealizedPL = Σ((holding.currentPrice - holding.avgPrice) × holding.quantity)
```

### 4. Average Price Calculation (FIFO)
```typescript
// When adding to existing position
newAvgPrice = (oldQuantity × oldAvgPrice + newQuantity × newPrice) / (oldQuantity + newQuantity)
```

### 5. Investment Verification
```typescript
// Post is verified if:
1. linkedTransactionIds.length > 0
2. All linked transactions exist and belong to post author
3. Set isVerified = true
4. Display verification badge in UI
```

### 6. Ranking Calculation (Batch Job)
```typescript
// Run daily at 00:00 KST
1. Query all Portfolio records
2. Order by totalReturn DESC
3. Update Ranking table:
   - DAILY: Today's returns
   - WEEKLY: Last 7 days returns
   - MONTHLY: Last 30 days returns
   - ALL_TIME: Total returns since account creation
4. Only store top 100 per period
```

---

## Testing Strategy

### Directory Structure
```
tests/
├── unit/
│   ├── services/
│   │   ├── stockService.test.ts
│   │   ├── tradingService.test.ts
│   │   ├── portfolioService.test.ts
│   │   └── rankingService.test.ts
│   └── utils/
│       ├── calculations.test.ts
│       └── validators.test.ts
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── trading.test.ts
│   │   ├── community.test.ts
│   │   └── ranking.test.ts
│   └── database/
│       └── prisma.test.ts
└── e2e/ (optional)
    ├── trading-flow.spec.ts
    └── community-flow.spec.ts
```

### Coverage Targets
- **Unit Tests**: 90%+
- **Integration Tests**: All API endpoints
- **Overall**: 80% minimum

### Critical Test Cases
1. **Trading Service**:
   - Buy with insufficient funds → Reject
   - Sell more than owned → Reject
   - Average price calculation → Verify math
   - Portfolio metrics update → Verify calculations

2. **Authentication**:
   - Register with duplicate email → Reject
   - Login with wrong password → Reject
   - Protected routes without auth → Redirect

3. **Community**:
   - Duplicate like → Toggle
   - Verify post with fake transaction → Reject
   - Delete post → Cascade delete comments/likes

4. **Ranking**:
   - Equal returns → Stable sort order
   - Edge cases: 0%, negative returns

---

## KIS API Integration

### Authentication
```typescript
// Get access token (valid for 24 hours)
POST https://openapi.koreainvestment.com:9443/oauth2/tokenP
Headers:
  content-type: application/json
Body:
  {
    "grant_type": "client_credentials",
    "appkey": process.env.KIS_APP_KEY,
    "appsecret": process.env.KIS_APP_SECRET
  }

// Cache token in Redis or memory
// Refresh before expiry
```

### Key Endpoints Used
1. **Stock Price**: `/uapi/domestic-stock/v1/quotations/inquire-price`
2. **Stock Search**: `/uapi/domestic-stock/v1/quotations/search-stock-info`
3. **Chart Data**: `/uapi/domestic-stock/v1/quotations/inquire-daily-price`

### Rate Limiting
- **Free tier**: 1 req/sec, 1000 req/day
- Implement request queue to avoid hitting limits
- Cache frequently requested data (5-minute TTL)

### Error Handling
```typescript
// KIS API returns errors in response body even with 200 status
if (response.rt_cd !== "0") {
  throw new Error(`KIS API Error: ${response.msg1}`)
}
```

---

## Code Conventions

### General
- **Indentation**: 2 spaces
- **Async**: Always use async/await (not .then())
- **Error handling**: Wrap all async operations in try-catch
- **JSDoc**: Required for all exported functions/components

### Naming
- **Files**: kebab-case (e.g., `trading-service.ts`)
- **Components**: PascalCase (e.g., `StockChart.tsx`)
- **Functions**: camelCase (e.g., `calculateTotalReturn`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `INITIAL_CAPITAL`)

### API Response Format
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

### Error Codes
- `AUTH_*`: Authentication errors
- `TRADING_*`: Trading-related errors (e.g., `TRADING_INSUFFICIENT_FUNDS`)
- `VALIDATION_*`: Input validation errors
- `EXTERNAL_*`: External API errors (e.g., `EXTERNAL_KIS_API_ERROR`)

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Next.js project setup
- [ ] Prisma schema + migrations
- [ ] Authentication system (TDD)
- [ ] Basic UI layout (header, nav, footer)

### Phase 2: Core Trading (Week 3-4)
- [ ] KIS API integration (TDD)
- [ ] Portfolio system (TDD)
- [ ] Buy/Sell functionality (TDD)
- [ ] Transaction history (TDD)
- [ ] Investment journal auto-generation

### Phase 3: Community (Week 5-6)
- [ ] Post CRUD (TDD)
- [ ] Comment system (TDD)
- [ ] Like functionality (TDD)
- [ ] Investment verification (TDD)
- [ ] Image upload (Vercel Blob)

### Phase 4: Social & Ranking (Week 7)
- [ ] Follow system (TDD)
- [ ] Ranking calculation (TDD)
- [ ] Profile pages
- [ ] Leaderboard UI

### Phase 5: Polish & Deploy (Week 8)
- [ ] Responsive design
- [ ] Performance optimization (caching, lazy loading)
- [ ] Integration testing
- [ ] Vercel deployment
- [ ] Production DB setup (Supabase/Neon)

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..." # openssl rand -base64 32

# KIS API
KIS_APP_KEY="..."
KIS_APP_SECRET="..."
KIS_API_URL="https://openapi.koreainvestment.com:9443"

# File Upload (Vercel Blob)
BLOB_READ_WRITE_TOKEN="..."

# Optional: Redis for caching
REDIS_URL="redis://..."
```

---

## Deployment

### Vercel Setup
1. Connect GitHub repository
2. Set environment variables
3. Configure build command: `npm run build`
4. Deploy

### Database (Supabase)
1. Create new project
2. Copy connection string to `DATABASE_URL`
3. Run migrations: `npx prisma migrate deploy`

### Cron Jobs (Vercel Cron)
```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/update-rankings",
    "schedule": "0 0 * * *" // Daily at midnight KST
  }]
}
```

---

## Key Files & Directories

```
/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (dashboard)/         # Main app pages
│   │   ├── trading/         # Trading interface
│   │   ├── portfolio/       # Portfolio view
│   │   ├── journal/         # Investment journal
│   │   ├── community/       # Community feed
│   │   ├── ranking/         # Leaderboard
│   │   └── profile/         # User profiles
│   ├── api/                 # API routes
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── trading/             # Trading-specific components
│   ├── community/           # Community components
│   └── layout/              # Layout components
├── lib/                     # Utilities and services
│   ├── services/            # Business logic
│   │   ├── stockService.ts  # KIS API wrapper
│   │   ├── tradingService.ts
│   │   ├── portfolioService.ts
│   │   └── rankingService.ts
│   ├── utils/               # Helper functions
│   ├── prisma.ts            # Prisma client
│   └── auth.ts              # NextAuth config
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Migration history
├── tests/                   # Test files (see Testing Strategy)
└── public/                  # Static assets
```

---

## Common Pitfalls

### 1. TDD Violations
- Writing implementation before tests
- Skipping test failure verification
- Modifying tests to make them pass

### 2. Trading Logic Bugs
- Not checking cash balance before buy
- Not validating stock quantity before sell
- Incorrect average price calculation (use FIFO)
- Forgetting to update portfolio metrics after trades

### 3. Database Issues
- Missing unique constraints (e.g., duplicate likes)
- Not using transactions for multi-step operations
- N+1 queries (use Prisma `include` wisely)

### 4. KIS API
- Forgetting to refresh expired tokens
- Hitting rate limits (implement queuing)
- Not handling API errors properly (check `rt_cd`)

### 5. Authentication
- Exposing password hashes in API responses
- Not protecting routes properly
- Storing plain-text passwords

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [KIS API Docs](https://apiportal.koreainvestment.com/apiservice)
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
- [shadcn/ui Components](https://ui.shadcn.com/)
