/**
 * API Route: SSE Stream for Chess Engine Analysis
 * GET /api/engine/stream?sessionId=xxx
 */

import { NextRequest } from 'next/server';
import EngineManager from '../../../lib/engine/engine-manager';
import type { SSEMessage } from '../../../types/engine';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  const engineManager = EngineManager.getInstance();
  
  // Check if session exists
  const status = engineManager.getSessionStatus(sessionId);
  if (!status) {
    return new Response('Session not found', { status: 404 });
  }

  // Create SSE response
  const encoder = new TextEncoder();
  let isClientConnected = true;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      const initialMessage: SSEMessage = {
        type: 'analysis-update',
        sessionId,
        data: {
          sessionId,
          status: status.isAnalyzing ? 'analyzing' : 'completed',
          depth: status.currentDepth,
          evaluation: null,
          lines: []
        }
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
      );

      // Subscribe to analysis updates
      const unsubscribe = engineManager.subscribe(sessionId, (response) => {
        if (!isClientConnected) {
          return;
        }

        try {
          const message: SSEMessage = {
            type: response.status === 'error' ? 'analysis-error' : 
                  response.status === 'completed' ? 'analysis-complete' :
                  response.status === 'stopped' ? 'analysis-stopped' :
                  'analysis-update',
            sessionId,
            data: response
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );

          // Close stream on completion or error
          if (response.status === 'completed' || response.status === 'error') {
            controller.close();
            isClientConnected = false;
          }
        } catch (streamError) {
          console.error('SSE stream error:', streamError);
          controller.error(streamError);
        }
      });

      // Handle client disconnect
      request.signal?.addEventListener('abort', () => {
        isClientConnected = false;
        unsubscribe();
        try {
          controller.close();
        } catch (error) {
          // Stream already closed
        }
      });
    },

    cancel() {
      isClientConnected = false;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    },
  });
}