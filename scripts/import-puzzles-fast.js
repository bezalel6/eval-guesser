#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'puzzles.db');
const csvPath = path.join(__dirname, '..', 'puzzles.csv');

console.log('Starting fast CSV import to SQLite...');
console.log(`CSV file: ${csvPath}`);
console.log(`Database: ${dbPath}`);

// Check if CSV exists
if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found!');
  process.exit(1);
}

// Get CSV stats
const stats = fs.statSync(csvPath);
console.log(`CSV size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

// Create SQLite commands
const sqlCommands = `
.mode csv
.headers on
.import "${csvPath.replace(/\\/g, '/')}" puzzles_import

-- Clean up and convert data types
CREATE TABLE IF NOT EXISTS puzzles_new (
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

INSERT OR IGNORE INTO puzzles_new
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
FROM puzzles_import;

DROP TABLE IF EXISTS puzzles;
ALTER TABLE puzzles_new RENAME TO puzzles;
DROP TABLE puzzles_import;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_popularity ON puzzles(Popularity DESC);
CREATE INDEX IF NOT EXISTS idx_themes ON puzzles(Themes);
CREATE INDEX IF NOT EXISTS idx_rating ON puzzles(Rating);

-- Optimize database
VACUUM;
ANALYZE;

-- Show results
SELECT COUNT(*) as count FROM puzzles;
`;

// Write SQL to temp file
const tempSqlFile = path.join(__dirname, 'import_temp.sql');
fs.writeFileSync(tempSqlFile, sqlCommands);

try {
  console.log('Importing CSV to database (this may take a few minutes for 931MB)...');

  // Use sqlite3 CLI for fastest import
  const result = execSync(`sqlite3 "${dbPath}" < "${tempSqlFile}"`, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });

  console.log('Import complete!');
  console.log(result);

  // Clean up temp file
  fs.unlinkSync(tempSqlFile);

  console.log('Successfully imported puzzles to database');

} catch (error) {
  console.error('Error during import:', error.message);
  // Clean up temp file on error
  if (fs.existsSync(tempSqlFile)) {
    fs.unlinkSync(tempSqlFile);
  }
  process.exit(1);
}