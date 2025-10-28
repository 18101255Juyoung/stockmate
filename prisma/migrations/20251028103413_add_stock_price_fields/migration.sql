-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "currentPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "highPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lowPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "openPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "volume" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "stock_price_history" (
    "id" TEXT NOT NULL,
    "stockCode" TEXT NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL,
    "highPrice" DOUBLE PRECISION NOT NULL,
    "lowPrice" DOUBLE PRECISION NOT NULL,
    "closePrice" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_price_history_stockCode_date_idx" ON "stock_price_history"("stockCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "stock_price_history_stockCode_date_key" ON "stock_price_history"("stockCode", "date");

-- AddForeignKey
ALTER TABLE "stock_price_history" ADD CONSTRAINT "stock_price_history_stockCode_fkey" FOREIGN KEY ("stockCode") REFERENCES "stocks"("stockCode") ON DELETE CASCADE ON UPDATE CASCADE;
