const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();

async function importPuzzles() {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'puzzles.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    console.log(`Found ${records.length} puzzles to import`);
    
    // Clear existing puzzles (optional)
    await prisma.puzzles.deleteMany();
    console.log('Cleared existing puzzles');
    
    // Import puzzles in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const puzzlesToCreate = batch.map(record => ({
        PuzzleId: record.PuzzleId,
        FEN: record.FEN || null,
        Moves: record.Moves || null,
        Rating: record.Rating ? parseInt(record.Rating) : null,
        RatingDeviation: record.RatingDeviation ? parseInt(record.RatingDeviation) : null,
        Popularity: record.Popularity ? parseInt(record.Popularity) : null,
        NbPlays: record.NbPlays ? parseInt(record.NbPlays) : null,
        Themes: record.Themes || null,
        GameUrl: record.GameUrl || null,
        OpeningTags: record.OpeningTags || null,
      }));
      
      await prisma.puzzles.createMany({
        data: puzzlesToCreate,
        skipDuplicates: true,
      });
      
      console.log(`Imported batch ${Math.floor(i / batchSize) + 1} (${i + batch.length} / ${records.length})`);
    }
    
    // Verify import
    const count = await prisma.puzzles.count();
    console.log(`Successfully imported ${count} puzzles`);
    
  } catch (error) {
    console.error('Error importing puzzles:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importPuzzles();