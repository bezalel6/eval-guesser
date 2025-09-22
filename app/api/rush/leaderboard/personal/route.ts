import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const personalBests = await prisma.leaderboard.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        mode: true,
        bestScore: true,
        achievedAt: true,
      },
    });

    return NextResponse.json(personalBests);
  } catch (error) {
    console.error("Failed to fetch personal bests:", error);
    return NextResponse.json({ error: "Failed to fetch personal bests" }, { status: 500 });
  }
}