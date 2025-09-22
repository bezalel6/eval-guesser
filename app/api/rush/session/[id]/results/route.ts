import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessionId = params.id;
    
    // Get session with attempts
    const rushSession = await prisma.rushSession.findUnique({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
      include: {
        attempts: {
          orderBy: {
            attemptOrder: 'asc',
          },
        },
      },
    });

    if (!rushSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get personal best for this mode
    const personalBest = await prisma.leaderboard.findUnique({
      where: {
        userId_mode: {
          userId: session.user.id,
          mode: rushSession.mode,
        },
      },
      select: {
        bestScore: true,
      },
    });

    const isNewRecord = personalBest ? rushSession.score > personalBest.bestScore : true;

    return NextResponse.json({
      session: {
        id: rushSession.id,
        mode: rushSession.mode,
        score: rushSession.score,
        strikes: rushSession.strikes,
        timeSpent: rushSession.timeSpent,
      },
      attempts: rushSession.attempts.map(a => ({
        id: a.id,
        puzzleId: a.puzzleId,
        userGuess: a.userGuess,
        actualEval: a.actualEval,
        isCorrect: a.isCorrect,
        attemptOrder: a.attemptOrder,
      })),
      personalBest: personalBest?.bestScore,
      isNewRecord,
    });
  } catch (error) {
    console.error("Failed to fetch results:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}