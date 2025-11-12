-- Drop the old unique constraint on userId only
DROP INDEX "rankings_userId_key";

-- Add the new unique constraint on (userId, period)
CREATE UNIQUE INDEX "rankings_userId_period_key" ON "rankings"("userId", "period");
