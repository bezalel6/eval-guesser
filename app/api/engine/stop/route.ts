/**
 * API Route: Stop Chess Engine Analysis
 * POST /api/engine/stop
 */

import { NextRequest, NextResponse } from 'next/server';
import EngineManager from '../../../lib/engine/engine-manager';

interface StopRequest {
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StopRequest = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Valid session ID is required' },
        { status: 400 }
      );
    }

    const engineManager = EngineManager.getInstance();
    
    const stopped = await engineManager.stopAnalysis(sessionId);

    if (!stopped) {
      return NextResponse.json(
        { error: 'Session not found or already stopped' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId,
      status: 'stopped',
      message: 'Analysis stopped successfully'
    });

  } catch (error) {
    console.error('Analysis stop error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to stop analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}