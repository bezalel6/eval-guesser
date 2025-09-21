import { NextResponse } from 'next/server';
import PuzzleService from '../../../lib/puzzle-service';

const puzzleService = PuzzleService.getInstance();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minRating = parseInt(searchParams.get('min') || '800');
    const maxRating = parseInt(searchParams.get('max') || '3000');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validate parameters
    if (isNaN(minRating) || isNaN(maxRating) || isNaN(limit)) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }
    
    const puzzles = await puzzleService.getPuzzlesByRatingRange(
      minRating,
      maxRating,
      limit
    );
    
    return NextResponse.json({
      puzzles,
      count: puzzles.length,
      params: { minRating, maxRating, limit }
    });
  } catch (error) {
    console.error('Failed to fetch puzzles by rating:', error);
    return NextResponse.json(
      { error: 'Failed to fetch puzzles' },
      { status: 500 }
    );
  }
}