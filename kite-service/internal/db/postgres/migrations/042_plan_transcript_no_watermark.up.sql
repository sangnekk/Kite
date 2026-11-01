-- Plans that may hide the "made by" badge of transcripts. Off for every plan
-- until it is turned on in the admin console.
ALTER TABLE plans ADD COLUMN feature_transcript_no_watermark BOOLEAN NOT NULL DEFAULT FALSE;
