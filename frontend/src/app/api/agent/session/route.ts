import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const url = new URL(request.url);
  
  // Forward query params (user_id, prompt, etc.)
  const queryStr = url.search;
  const targetUrl = `${backendUrl}/agent/session${queryStr}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    // Stream SSE back to client
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[agent/session GET]', error);
    return new Response(JSON.stringify({ error: 'Failed to connect to backend' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
