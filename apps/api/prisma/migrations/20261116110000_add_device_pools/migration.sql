CREATE TABLE "DevicePool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'mixed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DevicePool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevicePoolDevice" (
    "poolId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DevicePoolDevice_pkey" PRIMARY KEY ("poolId", "deviceId")
);

CREATE UNIQUE INDEX "DevicePool_userId_name_key"
ON "DevicePool"("userId", "name");

CREATE INDEX "DevicePool_userId_idx"
ON "DevicePool"("userId");

CREATE INDEX "DevicePoolDevice_deviceId_idx"
ON "DevicePoolDevice"("deviceId");

ALTER TABLE "DevicePool"
ADD CONSTRAINT "DevicePool_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevicePoolDevice"
ADD CONSTRAINT "DevicePoolDevice_poolId_fkey"
FOREIGN KEY ("poolId") REFERENCES "DevicePool"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevicePoolDevice"
ADD CONSTRAINT "DevicePoolDevice_deviceId_fkey"
FOREIGN KEY ("deviceId") REFERENCES "Device"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
