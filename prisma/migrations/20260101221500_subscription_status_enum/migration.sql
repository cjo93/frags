-- Convert User.subscriptionStatus from TEXT to enum for typo-proof data.
-- Safe for existing installs where the column may already exist.

DO $$
BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'INACTIVE', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;

-- Attempt to convert existing values; if there are unexpected strings, this will error.
-- In early stages, you can manually normalize those rows first.
ALTER TABLE "User"
  ALTER COLUMN "subscriptionStatus" TYPE "SubscriptionStatus"
  USING ("subscriptionStatus"::"SubscriptionStatus");
