import { NextResponse } from 'next/server';
import PuzzleService from '../../../lib/puzzle-service';

const puzzleService = PuzzleService.getInstance();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const theme = searchParams.get('theme');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!theme) {
      return NextResponse.json(
        { error: 'Theme parameter is required' },
        { status: 400 }
      );
    }
    
    const puzzles = await puzzleService.getPuzzlesByTheme(theme, limit);
    
    return NextResponse.json({
      puzzles,
      count: puzzles.length,
      theme,
      limit
    });
  } catch (error) {
    console.error('Failed to fetch puzzles by theme:', error);
    return NextResponse.json(
      { error: 'Failed to fetch puzzles' },
      { status: 500 }
    );
  }
}