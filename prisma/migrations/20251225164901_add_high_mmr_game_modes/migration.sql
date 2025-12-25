-- AlterEnum: Add new GameMode values
-- This migration safely adds TWO_VS_TWO_HIGH_MMR and THREE_VS_THREE_HIGH_MMR to the GameMode enum
-- Using IF NOT EXISTS to avoid errors if values already exist

-- Add TWO_VS_TWO_HIGH_MMR value to GameMode enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TWO_VS_TWO_HIGH_MMR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
    ) THEN
        ALTER TYPE "GameMode" ADD VALUE 'TWO_VS_TWO_HIGH_MMR';
    END IF;
END $$;

-- Add THREE_VS_THREE_HIGH_MMR value to GameMode enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'THREE_VS_THREE_HIGH_MMR' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GameMode')
    ) THEN
        ALTER TYPE "GameMode" ADD VALUE 'THREE_VS_THREE_HIGH_MMR';
    END IF;
END $$;
