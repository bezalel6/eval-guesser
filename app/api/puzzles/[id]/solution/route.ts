
import { NextResponse } from 'next/server';
import PuzzleService from '@/app/lib/puzzle-service';

const puzzleService = PuzzleService.getInstance();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const puzzleId = params.id;
    if (!puzzleId) {
      return NextResponse.json({ error: 'Puzzle ID is required' }, { status: 400 });
    }

    const puzzle = await puzzleService.getPuzzleById(puzzleId, { includeSolution: true });
    
    if (!puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }
    
    // Return only the solution
    return NextResponse.json({ Moves: puzzle.Moves });

  } catch (error) {
    console.error(`Failed to fetch puzzle solution for ID ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch puzzle solution' }, { status: 500 });
  }
}
