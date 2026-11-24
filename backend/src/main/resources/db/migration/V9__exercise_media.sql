-- An optional photo or short clip per exercise. The file lives in the data folder under media/,
-- so it is backed up with everything else; these columns only name it.
ALTER TABLE exercise ADD COLUMN media_file TEXT;
ALTER TABLE exercise ADD COLUMN media_type TEXT CHECK (media_type IS NULL OR media_type IN ('IMAGE', 'VIDEO'));
