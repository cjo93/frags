import { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const { sessionId } = await params;
  const targetUrl = `${backendUrl}/agent/session/${sessionId}/cancel`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
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
    console.error('[agent/session/cancel POST]', error);
    return new Response(JSON.stringify({ error: 'Failed to cancel session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
