import { NextResponse } from 'next/server';
import PuzzleService from '../../../lib/puzzle-service';

const puzzleService = PuzzleService.getInstance();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const puzzle = await puzzleService.getPuzzleById(id);
    
    if (!puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
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