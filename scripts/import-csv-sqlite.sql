-- SQLite script for efficient CSV import
-- This uses SQLite's native CSV import which is much faster than going through an ORM

-- Set CSV mode
.mode csv

-- Import with headers
.import --skip 1 puzzles.csv puzzles_temp

-- Create properly typed table if not exists
CREATE TABLE IF NOT EXISTS puzzles_final (
    PuzzleId TEXT PRIMARY KEY,
    FEN TEXT,
    Moves TEXT,
    Rating INTEGER,
    RatingDeviation INTEGER,
    Popularity INTEGER,
    NbPlays INTEGER,
    Themes TEXT,
    GameUrl TEXT,
    OpeningTags TEXT
);

-- Insert data with type conversion
INSERT INTO puzzles_final
SELECT 
    PuzzleId,
    FEN,
    Moves,
    CAST(Rating AS INTEGER),
    CAST(RatingDeviation AS INTEGER),
    CAST(Popularity AS INTEGER),
    CAST(NbPlays AS INTEGER),
    Themes,
    GameUrl,
    OpeningTags
FROM puzzles_temp;

-- Drop temp table
DROP TABLE puzzles_temp;

-- Rename final table
DROP TABLE IF EXISTS puzzles;
ALTER TABLE puzzles_final RENAME TO puzzles;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_popularity ON puzzles(Popularity);
CREATE INDEX IF NOT EXISTS idx_themes ON puzzles(Themes);
CREATE INDEX IF NOT EXISTS idx_rating ON puzzles(Rating);

-- Analyze for query optimization
ANALYZE;

-- Show count
SELECT COUNT(*) as total_puzzles FROM puzzles;