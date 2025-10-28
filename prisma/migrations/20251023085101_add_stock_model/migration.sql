-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "stockCode" TEXT NOT NULL,
    "stockName" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stocks_stockCode_key" ON "stocks"("stockCode");

-- CreateIndex
CREATE INDEX "stocks_stockName_idx" ON "stocks"("stockName");

-- CreateIndex
CREATE INDEX "stocks_stockCode_idx" ON "stocks"("stockCode");
