/**
 * Data Recovery Script - dlwndud1 Account Only
 * Restores the missing dlwndud1@test.com account
 *
 * Current situation:
 * - dlwndud@test.com: Already recreated by user (2025-11-15)
 * - posttest@test.com: Already recreated (2025-11-14)
 * - dlwndud1@test.com: MISSING - needs restoration
 *
 * Source: backups/backup_20251114_142600.sql
 */

BEGIN;

-- Restore dlwndud1 user account
INSERT INTO users (id, email, password, username, "displayName", bio, "profileImage", "createdAt", "updatedAt")
VALUES
  ('cmho1ftbi002tenb66atzvr6h', 'dlwndud1@test.com', '$2b$10$HwH.V8gbuZSeKZarhjt1xeHE1WEoOeFiZ.HUJ8ABXIixkNedsybce', 'dlwndud1', 'dlwndud@test.com', NULL, NULL, '2025-11-06 23:08:35.503', '2025-11-06 23:08:35.503')
ON CONFLICT (id) DO NOTHING;

-- Restore dlwndud1 portfolio
INSERT INTO portfolios (id, "userId", "initialCapital", "currentCash", "totalAssets", "totalReturn", "realizedPL", "unrealizedPL", "createdAt", "updatedAt")
VALUES
  ('cmho1ftbk002venb6lojqoiep', 'cmho1ftbi002tenb66atzvr6h', 10000000, 4864229, 9711479, -2.89, 0, -287750, '2025-11-06 23:08:35.505', '2025-11-14 14:09:12.294')
ON CONFLICT (id) DO NOTHING;

-- Restore dlwndud1 holdings (3 stocks)
INSERT INTO holdings (id, "portfolioId", "stockCode", "stockName", quantity, "avgPrice", "currentPrice", "createdAt", "updatedAt")
VALUES
  ('cmho1g3yk0030enb61kbuaxxv', 'cmho1ftbk002venb6lojqoiep', '000660', 'SK하이닉스', 5, 593000, 560000, '2025-11-06 23:08:49.293', '2025-11-14 14:09:12.287'),
  ('cmhx6l2jj00h5ix7yxlo0chg6', 'cmho1ftbk002venb6lojqoiep', '005930', '삼성전자', 20, 103300, 97200, '2025-11-13 08:42:34.399', '2025-11-14 14:09:12.289'),
  ('cmhyb1pq003ev10dzu6dx0mfb', 'cmho1ftbk002venb6lojqoiep', '024110', '기업은행', 5, 20800, 20650, '2025-11-14 03:35:15.577', '2025-11-14 14:09:12.292')
ON CONFLICT (id) DO NOTHING;

-- Restore dlwndud1 transaction history (4 transactions)
INSERT INTO transactions (id, "userId", type, "stockCode", "stockName", quantity, price, "totalAmount", fee, note, "createdAt")
VALUES
  ('cmho1g3yi002yenb6yzyum769', 'cmho1ftbi002tenb66atzvr6h', 'BUY', '000660', 'SK하이닉스', 5, 593000, 2965445, 445, NULL, '2025-11-06 23:08:49.291'),
  ('cmhx6l2jh00h3ix7ym9tgbre9', 'cmho1ftbi002tenb66atzvr6h', 'BUY', '005930', '삼성전자', 20, 103300, 2066310, 310, NULL, '2025-11-13 08:42:34.397'),
  ('cmhyb1ppy03et10dzfhy6bha9', 'cmho1ftbi002tenb66atzvr6h', 'BUY', '024110', '기업은행', 5, 20800, 104016, 16, NULL, '2025-11-14 03:35:15.574')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verification query
SELECT
  u.username,
  u.email,
  u."createdAt" as user_created,
  p."totalAssets",
  p."totalReturn",
  (SELECT COUNT(*) FROM holdings WHERE "portfolioId" = p.id) as holdings_count,
  (SELECT COUNT(*) FROM transactions WHERE "userId" = u.id) as transaction_count
FROM users u
LEFT JOIN portfolios p ON u.id = p."userId"
WHERE u.email = 'dlwndud1@test.com';
