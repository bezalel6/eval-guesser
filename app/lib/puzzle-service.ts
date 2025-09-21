import { PrismaClient } from '@/generated/prisma';
import type { puzzles } from '@/generated/prisma';

class PuzzleService {
  private static instance: PuzzleService;
  private prisma: PrismaClient;
  private totalCount: number | null = null;
  private countCacheTime: number = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache
  
  private constructor() {
    this.prisma = new PrismaClient();
  }
  
  public static getInstance(): PuzzleService {
    if (!PuzzleService.instance) {
      PuzzleService.instance = new PuzzleService();
    }
    return PuzzleService.instance;
  }
  
  /**
   * Get the total number of puzzles, with caching
   */
  private async getTotalCount(): Promise<number> {
    const now = Date.now();
    
    // Return cached count if still valid
    if (this.totalCount !== null && now - this.countCacheTime < this.CACHE_DURATION) {
      return this.totalCount;
    }
    
    // Fetch and cache the count
    console.log('Fetching puzzle count from database...');
    this.totalCount = await this.prisma.puzzles.count();
    this.countCacheTime = now;
    console.log(`Cached puzzle count: ${this.totalCount}`);
    
    return this.totalCount;
  }
  
  /**
   * Get a random puzzle efficiently using cached count
   */
  public async getRandomPuzzle(): Promise<puzzles | null> {
    const totalCount = await this.getTotalCount();
    
    if (totalCount === 0) {
      return null;
    }
    
    // Generate random index
    const randomIndex = Math.floor(Math.random() * totalCount);
    
    // Fetch the puzzle at that index
    const puzzle = await this.prisma.puzzles.findFirst({
      skip: randomIndex,
      take: 1,
    });
    
    return puzzle;
  }
  
  /**
   * Get a puzzle by its ID
   */
  public async getPuzzleById(puzzleId: string): Promise<puzzles | null> {
    return await this.prisma.puzzles.findUnique({
      where: { PuzzleId: puzzleId }
    });
  }
  
  /**
   * Get puzzles by rating range
   */
  public async getPuzzlesByRatingRange(
    minRating: number,
    maxRating: number,
    limit: number = 10
  ): Promise<puzzles[]> {
    // Note: Rating is stored as string in the database
    // We'll need to handle this with raw SQL or convert in application
    const puzzles = await this.prisma.$queryRaw<puzzles[]>`
      SELECT * FROM puzzles 
      WHERE CAST(Rating AS INTEGER) BETWEEN ${minRating} AND ${maxRating}
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;
    
    return puzzles;
  }
  
  /**
   * Get puzzles by theme
   */
  public async getPuzzlesByTheme(theme: string, limit: number = 10): Promise<puzzles[]> {
    return await this.prisma.puzzles.findMany({
      where: {
        Themes: {
          contains: theme
        }
      },
      take: limit,
      orderBy: {
        Popularity: 'desc'
      }
    });
  }
  
  /**
   * Get puzzles by opening
   */
  public async getPuzzlesByOpening(opening: string, limit: number = 10): Promise<puzzles[]> {
    return await this.prisma.puzzles.findMany({
      where: {
        OpeningTags: {
          contains: opening
        }
      },
      take: limit,
      orderBy: {
        Popularity: 'desc'
      }
    });
  }
  
  /**
   * Get popular puzzles
   */
  public async getPopularPuzzles(limit: number = 10): Promise<puzzles[]> {
    return await this.prisma.puzzles.findMany({
      take: limit,
      orderBy: {
        Popularity: 'desc'
      }
    });
  }
  
  /**
   * Invalidate the cache (useful for admin operations)
   */
  public invalidateCache(): void {
    this.totalCount = null;
    this.countCacheTime = 0;
    console.log('Puzzle cache invalidated');
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats() {
    const now = Date.now();
    return {
      totalCount: this.totalCount,
      cacheAge: this.totalCount !== null ? now - this.countCacheTime : null,
      cacheValid: this.totalCount !== null && now - this.countCacheTime < this.CACHE_DURATION
    };
  }
  
  /**
   * Cleanup (for graceful shutdown)
   */
  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default PuzzleService;