import { NextResponse } from 'next/server';
import PuzzleService from '../../../lib/puzzle-service';

const puzzleService = PuzzleService.getInstance();

export async function GET(request: Request) {
  try {
    // Check if we need to include the solution
    const { searchParams } = new URL(request.url);
    const includeSolution = searchParams.get('includeSolution') === 'true';
    
    const puzzle = await puzzleService.getRandomPuzzle({ includeSolution });
    
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