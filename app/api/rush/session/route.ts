import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RushMode } from "@prisma/client";

// Start a new Rush session
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mode } = await req.json();
    
    // Validate mode
    if (!Object.values(RushMode).includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    // End any active sessions for this user
    await prisma.rushSession.updateMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    // Create new session
    const newSession = await prisma.rushSession.create({
      data: {
        userId: session.user.id,
        mode,
        score: 0,
        strikes: 0,
      },
    });

    return NextResponse.json(newSession);
  } catch (error) {
    console.error("Failed to create rush session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

// Get active session
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeSession = await prisma.rushSession.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        attempts: {
          orderBy: {
            attemptOrder: 'asc',
          },
        },
      },
    });

    return NextResponse.json(activeSession);
  } catch (error) {
    console.error("Failed to get rush session:", error);
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 });
  }
}

// End session
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await req.json();

    const updatedSession = await prisma.rushSession.update({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    // Update leaderboard if this is a personal best
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

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Failed to end rush session:", error);
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
  }
}