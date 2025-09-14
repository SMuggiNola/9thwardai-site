-- Add batch_id column to submissions for grouping attempts
ALTER TABLE submissions ADD COLUMN batch_id TEXT;
