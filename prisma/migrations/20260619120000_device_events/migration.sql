-- Device fingerprint observations (PROMPT MASTER Bagian 8).
--
-- Append-only (deviceId hash, userId) log feeding the device-mismatch fraud
-- check in lib/fraud.ts. `deviceId` is a sha256 hash (x-device-id header or
-- IP+UA), so no raw PII is stored. Written idempotently to match this project's
-- migration style (safe to re-run / apply via psql or `migrate deploy`).

CREATE TABLE IF NOT EXISTS "DeviceEvent" (
  "id"        TEXT NOT NULL,
  "deviceId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DeviceEvent_deviceId_createdAt_idx" ON "DeviceEvent"("deviceId", "createdAt");
CREATE INDEX IF NOT EXISTS "DeviceEvent_userId_idx" ON "DeviceEvent"("userId");
