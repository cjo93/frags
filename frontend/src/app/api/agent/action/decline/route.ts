import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const body = await request.text();

  try {
    const response = await fetch(`${backendUrl}/agent/action/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body,
    });

    const data = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[agent/action/decline POST]', error);
    return new Response(JSON.stringify({ error: 'Failed to decline action' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
