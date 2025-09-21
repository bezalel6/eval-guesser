const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

// This script migrates 1000 random puzzles from SQLite to Supabase PostgreSQL

async function migrate() {
  console.log('Starting migration of 1000 random puzzles to Supabase...');
  
  // Connect to SQLite
  const sqliteDb = new sqlite3.Database('./puzzles.db');
  
  // Get 1000 random puzzles from SQLite
  const getPuzzles = () => {
    return new Promise((resolve, reject) => {
      sqliteDb.all(
        'SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1000',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  };

  try {
    const puzzles = await getPuzzles();
    console.log(`Fetched ${puzzles.length} random puzzles from SQLite`);
    
    // Initialize Prisma client for PostgreSQL 
    // Use pooler connection from .env.local
    const prisma = new PrismaClient();
    
    // Clear existing data (optional)
    await prisma.puzzles.deleteMany();
    console.log('Cleared existing puzzles in Supabase');
    
    // Insert puzzles one by one to avoid prepared statement issues with pooler
    console.log('Inserting puzzles...');
    let insertCount = 0;
    
    for (const puzzle of puzzles) {
      await prisma.puzzles.create({
        data: {
          PuzzleId: puzzle.PuzzleId,
          FEN: puzzle.FEN,
          Moves: puzzle.Moves,
          Rating: puzzle.Rating,
          RatingDeviation: puzzle.RatingDeviation,
          Popularity: puzzle.Popularity,
          NbPlays: puzzle.NbPlays,
          Themes: puzzle.Themes,
          GameUrl: puzzle.GameUrl,
          OpeningTags: puzzle.OpeningTags
        }
      });
      
      insertCount++;
      if (insertCount % 50 === 0) {
        console.log(`Inserted ${insertCount}/${puzzles.length} puzzles`);
      }
    }
    
    console.log(`Inserted all ${insertCount} puzzles`);
    
    console.log('✅ Migration complete!');
    
    // Verify
    const totalCount = await prisma.puzzles.count();
    console.log(`Total puzzles in Supabase: ${totalCount}`);
    
    await prisma.$disconnect();
    sqliteDb.close();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();