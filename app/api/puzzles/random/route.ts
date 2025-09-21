import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get total count
    const totalCount = await prisma.puzzles.count();
    
    // Get a random puzzle
    const skip = Math.floor(Math.random() * totalCount);
    
    const puzzle = await prisma.puzzles.findFirst({
      skip,
      take: 1,
    });
    
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