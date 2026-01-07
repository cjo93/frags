export async function readJsonWithLimit<T>(
  req: Request,
  maxBytes: number
): Promise<T> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Response("Payload Too Large", { status: 413 });
  }

  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    throw new Response("Payload Too Large", { status: 413 });
  }
  const text = new TextDecoder().decode(buf);
  return JSON.parse(text) as T;
}
