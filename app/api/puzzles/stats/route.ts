import { NextResponse } from 'next/server';
import PuzzleService from '../../../lib/puzzle-service';

const puzzleService = PuzzleService.getInstance();

export async function GET() {
  try {
    const cacheStats = puzzleService.getCacheStats();
    
    return NextResponse.json({
      cache: {
        ...cacheStats,
        cacheAgeSeconds: cacheStats.cacheAge ? Math.floor(cacheStats.cacheAge / 1000) : null,
      }
    });
  } catch (error) {
    console.error('Failed to get stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}