/**
 * API Route: Start Chess Engine Analysis
 * POST /api/engine/analyze
 */

import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisRequest } from '../../../types/engine';

// In-memory session storage for coordination (in production, use Redis or similar)
const sessionStore = new Map<string, {
  fen: string;
  depth: number;
  multiPV: number;
  createdAt: number;
  status: 'pending' | 'active' | 'completed' | 'error';
}>();

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { fen, depth = 20, multiPV = 3, sessionId } = body;

    // Validate FEN
    if (!fen || typeof fen !== 'string') {
      return NextResponse.json(
        { error: 'Valid FEN string is required' },
        { status: 400 }
      );
    }

    // Validate depth
    if (depth < 1 || depth > 30) {
      return NextResponse.json(
        { error: 'Depth must be between 1 and 30' },
        { status: 400 }
      );
    }

    // Validate multiPV
    if (multiPV < 1 || multiPV > 5) {
      return NextResponse.json(
        { error: 'MultiPV must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Generate session ID if not provided
    const analysisSessionId = sessionId || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Store session info for coordination
    sessionStore.set(analysisSessionId, {
      fen,
      depth,
      multiPV,
      createdAt: Date.now(),
      status: 'pending'
    });

    // Clean up old sessions (simple cleanup)
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    for (const [id, session] of sessionStore) {
      if (now - session.createdAt > maxAge) {
        sessionStore.delete(id);
      }
    }

    return NextResponse.json({
      sessionId: analysisSessionId,
      status: 'started',
      message: 'Analysis session created - connect via SSE to begin'
    });

  } catch (error) {
    console.error('Analysis start error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to start analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}