/**
 * Data Recovery Script
 * Restores 3 user accounts lost on November 14, 2025 at 14:27
 *
 * Lost accounts:
 * - dlwndud@test.com (created 2025-11-06)
 * - dlwndud1@test.com (created 2025-11-06)
 * - posttest@test.com (original, created 2025-11-06)
 *
 * Cause: Integration tests ran on production database
 * Source: backups/backup_20251114_142600.sql
 */

BEGIN;

-- Restore User accounts
INSERT INTO users (id, email, password, username, "displayName", bio, "profileImage", "createdAt", "updatedAt")
VALUES
  ('cmho1ftbi002tenb66atzvr6h', 'dlwndud1@test.com', '$2b$10$HwH.V8gbuZSeKZarhjt1xeHE1WEoOeFiZ.HUJ8ABXIixkNedsybce', 'dlwndud1', 'dlwndud@test.com', NULL, NULL, '2025-11-06 23:08:35.503', '2025-11-06 23:08:35.503'),
  ('cmho1gvm20032enb602bkwkr3', 'dlwndud@test.com', '$2b$10$RETtd6yuA7GzXqSGFzaYiOVoGOlWPCjY/GnqZOlrcNWX9j7Ayk1v2', 'dlwndud', 'dlwndud1@test.com', NULL, NULL, '2025-11-06 23:09:25.13', '2025-11-06 23:09:25.13'),
  ('cmho0z7v3010ibta39h7c3l6v', 'posttest@test.com', 'hashedpassword', 'posttestuser', 'Post Test User', NULL, NULL, '2025-11-06 22:55:41.199', '2025-11-06 22:55:41.199')
ON CONFLICT (id) DO NOTHING; -- Skip if already exists

-- Restore Portfolio data
INSERT INTO portfolios (id, "userId", "initialCapital", "currentCash", "totalAssets", "totalReturn", "realizedPL", "unrealizedPL", "createdAt", "updatedAt")
VALUES
  ('cmho1ftbk002venb6lojqoiep', 'cmho1ftbi002tenb66atzvr6h', 10000000, 4864229, 9711479, -2.89, 0, -287750, '2025-11-06 23:08:35.505', '2025-11-14 14:09:12.294'),
  ('cmho1gvm20034enb6z7jovnlo', 'cmho1gvm20032enb602bkwkr3', 10000000, 9503926, 9989926, -0.1, 0, -10000, '2025-11-06 23:09:25.131', '2025-11-14 10:36:04.708'),
  ('cmho0z7v3010jbta3denwpqf3', 'cmho0z7v3010ibta39h7c3l6v', 10000000, 9000000, 11000000, 10, 0, 0, '2025-11-06 22:55:41.199', '2025-11-06 22:55:41.199')
ON CONFLICT (id) DO NOTHING;

-- Restore Holdings data
INSERT INTO holdings (id, "portfolioId", "stockCode", "stockName", quantity, "avgPrice", "currentPrice", "createdAt", "updatedAt")
VALUES
  ('cmho0z7v4010lbta3pyz8jnrn', 'cmho0z7v3010jbta3denwpqf3', '005930', '삼성전자', 10, 50000, 51234, '2025-11-06 22:55:41.201', '2025-11-06 22:55:41.201'),
  ('cmho1ha9g0039enb6nyhflqmh', 'cmho1gvm20034enb6z7jovnlo', '005930', '삼성전자', 5, 99200, 97200, '2025-11-06 23:09:44.117', '2025-11-14 10:36:04.707'),
  ('cmho1g3yk0030enb61kbuaxxv', 'cmho1ftbk002venb6lojqoiep', '000660', 'SK하이닉스', 5, 593000, 560000, '2025-11-06 23:08:49.293', '2025-11-14 14:09:12.287'),
  ('cmhx6l2jj00h5ix7yxlo0chg6', 'cmho1ftbk002venb6lojqoiep', '005930', '삼성전자', 20, 103300, 97200, '2025-11-13 08:42:34.399', '2025-11-14 14:09:12.289'),
  ('cmhyb1pq003ev10dzu6dx0mfb', 'cmho1ftbk002venb6lojqoiep', '024110', '기업은행', 5, 20800, 20650, '2025-11-14 03:35:15.577', '2025-11-14 14:09:12.292')
ON CONFLICT (id) DO NOTHING;

-- Restore Transaction history
INSERT INTO transactions (id, "userId", type, "stockCode", "stockName", quantity, price, "totalAmount", fee, note, "createdAt")
VALUES
  ('cmho1g3yi002yenb6yzyum769', 'cmho1ftbi002tenb66atzvr6h', 'BUY', '000660', 'SK하이닉스', 5, 593000, 2965445, 445, NULL, '2025-11-06 23:08:49.291'),
  ('cmho1ha9f0037enb6o73cnw0q', 'cmho1gvm20032enb602bkwkr3', 'BUY', '005930', '삼성전자', 5, 99200, 496074, 74, NULL, '2025-11-06 23:09:44.115'),
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
  p."totalReturn"
FROM users u
LEFT JOIN portfolios p ON u.id = p."userId"
WHERE u.id IN (
  'cmho1ftbi002tenb66atzvr6h',
  'cmho1gvm20032enb602bkwkr3',
  'cmho0z7v3010ibta39h7c3l6v'
)
ORDER BY u."createdAt";
