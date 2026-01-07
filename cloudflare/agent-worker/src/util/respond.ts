export function jsonResponse(
  body: unknown,
  init?: ResponseInit & { requestId?: string }
): Response {
  const headers = new Headers(init?.headers ?? {});
  headers.set("content-type", "application/json; charset=utf-8");
  if (init?.requestId) headers.set("x-request-id", init.requestId);
  return new Response(JSON.stringify(body), { ...init, headers });
}
