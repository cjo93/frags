-- This migration corresponds to the initial schema for Frags.
-- Adjust as needed once the real schema is defined.

CREATE TABLE IF NOT EXISTS "User" (
  "id" text NOT NULL CONSTRAINT "User_pkey" PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "name" text,
  "createdAt" timestamptz NOT NULL DEFAULT NOW()
);
