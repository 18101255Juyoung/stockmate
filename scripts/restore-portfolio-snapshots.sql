/**
 * Restore Portfolio Snapshots for dlwndud1
 * Restores historical snapshots needed for portfolio analysis generation
 *
 * Source: backups/backup_20251114_142600.sql
 */

BEGIN;

-- Restore historical snapshots for dlwndud1 portfolio
INSERT INTO portfolio_snapshots (id, "portfolioId", date, "totalAssets", "totalReturn", "currentCash", "createdAt")
VALUES
  -- 2025-11-10: Early snapshot
  ('cmht9qw6d002t9e6h036n7u7t', 'cmho1ftbk002venb6lojqoiep', '2025-11-10', 9934555, -0.65, 7034555, '2025-11-10 15:00:00.159'),

  -- 2025-11-11: Portfolio improving
  ('cmhue1i9z003rx6h3fthpg5zg', 'cmho1ftbk002venb6lojqoiep', '2025-11-11', 10129555, 1.3, 7034555, '2025-11-11 09:48:00.072'),

  -- 2025-11-12: Slight decline
  ('cmhvbdcuc00bg51t8u0uphakw', 'cmho1ftbk002venb6lojqoiep', '2025-11-12', 10094555, 0.95, 7034555, '2025-11-12 01:21:00.078'),

  -- 2025-11-13: After 삼성전자 purchase
  ('cmhx611oc00f18tm8s3rloo04', 'cmho1ftbk002venb6lojqoiep', '2025-11-13', 10084245, 0.84, 4968245, '2025-11-13 08:27:00.091'),

  -- 2025-11-14: After 기업은행 purchase (final state before data loss)
  ('cmhxk2g0k09ta2w4nqgegefub', 'cmho1ftbk002venb6lojqoiep', '2025-11-14', 9711479, -2.89, 4864229, '2025-11-13 15:00:00.02')
ON CONFLICT ("portfolioId", date) DO UPDATE SET
  "totalAssets" = EXCLUDED."totalAssets",
  "totalReturn" = EXCLUDED."totalReturn",
  "currentCash" = EXCLUDED."currentCash";

-- Manually create snapshot for 2025-11-06 (first transaction date)
-- Based on: SK하이닉스 BUY 5 shares at 593,000 + fee 445
-- currentCash = 10,000,000 - 2,965,445 = 7,034,555
-- Assuming stock price stayed at 593,000 at end of day
INSERT INTO portfolio_snapshots (id, "portfolioId", date, "totalAssets", "totalReturn", "currentCash", "createdAt")
VALUES
  ('snapshot_dlwndud1_20251106', 'cmho1ftbk002venb6lojqoiep', '2025-11-06', 10000000, 0, 7034555, '2025-11-06 23:59:00.000')
ON CONFLICT ("portfolioId", date) DO UPDATE SET
  "totalAssets" = EXCLUDED."totalAssets",
  "totalReturn" = EXCLUDED."totalReturn",
  "currentCash" = EXCLUDED."currentCash";

COMMIT;

-- Verification query
SELECT
  "portfolioId",
  date,
  "totalAssets",
  "totalReturn",
  "currentCash"
FROM portfolio_snapshots
WHERE "portfolioId" = 'cmho1ftbk002venb6lojqoiep'
  AND date IN ('2025-11-06', '2025-11-13', '2025-11-14')
ORDER BY date;
