import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const url = new URL(request.url);
  const queryStr = url.search;

  try {
    const response = await fetch(`${backendUrl}/spiral/events${queryStr}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[spiral/events GET]', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch spiral events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
