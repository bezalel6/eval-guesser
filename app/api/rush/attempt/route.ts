import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GAME_CONFIG } from "@/lib/game-config";

// Submit a puzzle attempt
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, puzzleId, userGuess, actualEval, timeSpent } = await req.json();

    // Get the session
    const rushSession = await prisma.rushSession.findUnique({
      where: {
        id: sessionId,
        userId: session.user.id,
        isActive: true,
      },
      include: {
        attempts: true,
      },
    });

    if (!rushSession) {
      return NextResponse.json({ error: "Session not found or inactive" }, { status: 404 });
    }

    // Check if already at max strikes
    if (rushSession.strikes > GAME_CONFIG.MAX_STRIKES) {
      return NextResponse.json({ error: `Session already ended (${GAME_CONFIG.MAX_STRIKES} strikes)` }, { status: 400 });
    }

    // Determine if guess is correct
    // Rule: Must have correct side (sign) AND be within threshold
    const isCorrectSide = Math.sign(userGuess) === Math.sign(actualEval);
    const difference = Math.abs(userGuess - actualEval);
    const isCorrect = isCorrectSide && difference <= GAME_CONFIG.EVAL_THRESHOLD;

    // Create attempt record
    const attempt = await prisma.rushAttempt.create({
      data: {
        sessionId,
        puzzleId,
        userGuess,
        actualEval,
        isCorrect,
        attemptOrder: rushSession.attempts.length + 1,
        timeSpent,
      },
    });

    // Update session
    const updatedData: {
      score?: number;
      strikes?: number;
      isActive?: boolean;
      endedAt?: Date;
    } = {};
    
    if (isCorrect) {
      updatedData.score = rushSession.score + 1;
    } else {
      updatedData.strikes = rushSession.strikes + 1;
      // End session if max strikes exceeded
      if (updatedData.strikes > GAME_CONFIG.MAX_STRIKES) {
        updatedData.isActive = false;
        updatedData.endedAt = new Date();
      }
    }

    const updatedSession = await prisma.rushSession.update({
      where: { id: sessionId },
      data: updatedData,
    });

    // Check if session ended (3 strikes) and update leaderboard
    if (!updatedSession.isActive) {
      const existingBest = await prisma.leaderboard.findUnique({
        where: {
          userId_mode: {
            userId: session.user.id,
            mode: updatedSession.mode,
          },
        },
      });

      if (!existingBest || updatedSession.score > existingBest.bestScore) {
        await prisma.leaderboard.upsert({
          where: {
            userId_mode: {
              userId: session.user.id,
              mode: updatedSession.mode,
            },
          },
          create: {
            userId: session.user.id,
            mode: updatedSession.mode,
            bestScore: updatedSession.score,
            bestSessionId: updatedSession.id,
            achievedAt: new Date(),
          },
          update: {
            bestScore: updatedSession.score,
            bestSessionId: updatedSession.id,
            achievedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      attempt,
      session: updatedSession,
      isCorrect,
      feedback: isCorrect 
        ? "Correct!" 
        : !isCorrectSide 
          ? "Wrong side! You evaluated the advantage for the wrong player."
          : `Off by ${(difference / 100).toFixed(1)} pawns`,
    });
  } catch (error) {
    console.error("Failed to submit attempt:", error);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}