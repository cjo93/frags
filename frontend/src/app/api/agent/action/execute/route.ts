import { NextRequest } from 'next/server';

interface ExecuteActionRequest {
  session_id: string;
  action: string;
  args?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  
  try {
    const body: ExecuteActionRequest = await request.json();
    
    const response = await fetch(`${backendUrl}/agent/action/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[agent/action/execute POST]', error);
    return new Response(JSON.stringify({ error: 'Failed to execute action' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
