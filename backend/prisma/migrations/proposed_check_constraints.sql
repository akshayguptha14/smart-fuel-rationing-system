-- Proposed Migration to Enforce Non-Negative Balances
-- This migration adds CHECK constraints directly to the PostgreSQL tables.
-- It ensures that even raw SQL queries or faulty application logic cannot force 
-- fuel quotas or station inventories below zero.

-- Ensure inventory quantity is non-negative
ALTER TABLE "FuelInventory" ADD CONSTRAINT "FuelInventory_quantity_check" CHECK ("quantity" >= 0);

-- Ensure inventory quantity never exceeds its defined capacity
ALTER TABLE "FuelInventory" ADD CONSTRAINT "FuelInventory_capacity_check" CHECK ("quantity" <= "capacity");

-- Ensure remaining fuel quota is non-negative
ALTER TABLE "FuelQuota" ADD CONSTRAINT "FuelQuota_remainingQuota_check" CHECK ("remainingQuota" >= 0);

-- Ensure remaining quota never exceeds the total allocated quota
ALTER TABLE "FuelQuota" ADD CONSTRAINT "FuelQuota_totalQuota_check" CHECK ("remainingQuota" <= "totalQuota");
