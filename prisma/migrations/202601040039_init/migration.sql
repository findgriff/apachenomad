-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "endFixed" TEXT,
    "cities" TEXT[],
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "nightsMin" INTEGER NOT NULL,
    "nightsMax" INTEGER NOT NULL,
    "weekendOnly" BOOLEAN NOT NULL DEFAULT false,
    "cabin" TEXT NOT NULL DEFAULT 'ECONOMY',
    "maxConnections" INTEGER NOT NULL DEFAULT 1,
    "includeAirlines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludeAirlines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "budgetJobCents" INTEGER NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceMatrix" (
    "jobId" TEXT NOT NULL,
    "orig" TEXT NOT NULL,
    "dest" TEXT NOT NULL,
    "depDate" TIMESTAMP(3) NOT NULL,
    "filtersHash" TEXT NOT NULL,
    "offerId" TEXT,
    "priceCents" INTEGER,
    "currency" TEXT,
    "legs" JSONB,
    "provider" TEXT NOT NULL DEFAULT 'amadeus',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceMatrix_pkey" PRIMARY KEY ("jobId","orig","dest","depDate","filtersHash")
);

-- CreateTable
CREATE TABLE "Result" (
    "jobId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "cityOrder" TEXT[],
    "dates" TIMESTAMP(3)[],
    "totalPriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "pricingDeltaPct" DOUBLE PRECISION NOT NULL,
    "deepLink" TEXT NOT NULL,
    "legs" JSONB NOT NULL,
    "pricedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("jobId","rank")
);

-- CreateTable
CREATE TABLE "ApiSpend" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "provider" TEXT NOT NULL,
    "api" TEXT NOT NULL,
    "calls" INTEGER NOT NULL,
    "estCostCents" INTEGER NOT NULL,
    "window" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiSpend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiSpend_jobId_provider_api_window_key" ON "ApiSpend"("jobId", "provider", "api", "window");

-- AddForeignKey
ALTER TABLE "PriceMatrix" ADD CONSTRAINT "PriceMatrix_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
