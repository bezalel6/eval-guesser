import { NextResponse } from 'next/server';
import PuzzleService from '../../../lib/puzzle-service';

const puzzleService = PuzzleService.getInstance();

export async function GET() {
  try {
    // By default, getRandomPuzzle now excludes the solution
    const puzzle = await puzzleService.getRandomPuzzle();
    
    if (!puzzle) {
      return NextResponse.json(
        { error: 'No puzzle found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(puzzle);
  } catch (error) {
    console.error('Failed to fetch puzzle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch puzzle' },
      { status: 500 }
    );
  }
}