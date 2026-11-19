-- CreateTable
CREATE TABLE "MobileAppBuild" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "packageName" TEXT,
    "versionName" TEXT,
    "versionCode" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileAppBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileTestExecution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "providerExecutionId" TEXT,
    "deviceConfig" JSONB,
    "testConfig" JSONB,
    "summary" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileTestExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileTestArtifact" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" BIGINT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileTestArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileAppBuild_userId_createdAt_idx" ON "MobileAppBuild"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MobileAppBuild_userId_sha256_idx" ON "MobileAppBuild"("userId", "sha256");

-- CreateIndex
CREATE INDEX "MobileTestExecution_userId_createdAt_idx" ON "MobileTestExecution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MobileTestExecution_buildId_idx" ON "MobileTestExecution"("buildId");

-- CreateIndex
CREATE INDEX "MobileTestExecution_provider_providerExecutionId_idx" ON "MobileTestExecution"("provider", "providerExecutionId");

-- CreateIndex
CREATE INDEX "MobileTestExecution_status_idx" ON "MobileTestExecution"("status");

-- CreateIndex
CREATE INDEX "MobileTestArtifact_executionId_createdAt_idx" ON "MobileTestArtifact"("executionId", "createdAt");

-- AddForeignKey
ALTER TABLE "MobileAppBuild" ADD CONSTRAINT "MobileAppBuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTestExecution" ADD CONSTRAINT "MobileTestExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTestExecution" ADD CONSTRAINT "MobileTestExecution_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "MobileAppBuild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTestArtifact" ADD CONSTRAINT "MobileTestArtifact_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "MobileTestExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
