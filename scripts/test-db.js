const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    // Test basic count
    const count = await prisma.puzzles.count();
    console.log(`Total puzzles in database: ${count.toLocaleString()}`);
    
    // Test random puzzle fetch
    console.log('\nFetching a random puzzle...');
    const randomOffset = Math.floor(Math.random() * count);
    const [randomPuzzle] = await prisma.$queryRaw`
      SELECT * FROM puzzles LIMIT 1 OFFSET ${randomOffset}
    `;
    
    if (randomPuzzle) {
      console.log('Random puzzle:');
      console.log(`  ID: ${randomPuzzle.PuzzleId}`);
      console.log(`  Rating: ${randomPuzzle.Rating}`);
      console.log(`  Themes: ${randomPuzzle.Themes}`);
      console.log(`  Popularity: ${randomPuzzle.Popularity}`);
    }
    
    // Test query performance
    console.log('\nTesting query performance...');
    
    const start1 = Date.now();
    const popularPuzzles = await prisma.puzzles.findMany({
      take: 10,
      orderBy: { Popularity: 'desc' }
    });
    console.log(`Popular puzzles query: ${Date.now() - start1}ms`);
    
    const start2 = Date.now();
    const ratingRange = await prisma.puzzles.findMany({
      where: {
        Rating: { gte: 1500, lte: 1600 }
      },
      take: 10
    });
    console.log(`Rating range query: ${Date.now() - start2}ms`);
    
    console.log('\n✅ Database is working correctly!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();