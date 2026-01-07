import { importSPKI, jwtVerify } from "jose";

export type AuthContext = {
  userId: string;
  isDevAdmin: boolean;
  scopes: string[];
  memoryAllowed: boolean;
  toolsAllowed: boolean;
  exportAllowed: boolean;
};

export async function requireAuth(env: Env, req: Request): Promise<AuthContext> {
  const devToken = env.DEV_ADMIN_TOKEN?.trim();
  const authz = req.headers.get("authorization") || "";

  // Dev bypass (explicit token)
  if (devToken && authz === `Bearer ${devToken}`) {
    return {
      userId: "DEV_ADMIN",
      isDevAdmin: true,
      scopes: ["*"],
      memoryAllowed: true,
      toolsAllowed: true,
      exportAllowed: true
    };
  }

  const token = parseBearer(authz);
  if (!token) throw new Response("Unauthorized", { status: 401 });

  const pub = env.JWT_PUBLIC_KEY?.trim();
  const secret = env.AGENT_JWT_SECRET?.trim();
  if (!pub && !secret) {
    throw new Response("Server misconfigured: JWT_PUBLIC_KEY or AGENT_JWT_SECRET missing", { status: 500 });
  }

  const issuer = env.AGENT_JWT_ISS?.trim();
  const audience = env.AGENT_JWT_AUD?.trim() || "agent-worker";
  const key = pub ? await importSPKI(pub, "RS256") : new TextEncoder().encode(secret as string);
  const { payload } = await jwtVerify(token, key, {
    algorithms: pub ? ["RS256"] : ["HS256"],
    issuer: issuer || undefined,
    audience
  });

  const sub = payload.sub;
  if (!sub || typeof sub !== "string" || sub.length < 3) {
    throw new Response("Unauthorized: invalid sub", { status: 401 });
  }

  const scopes = normalizeScopes(payload.scope);
  const memoryAllowed = payload.mem !== false;
  const toolsAllowed = payload.tools !== false;
  const exportAllowed = payload.export !== false;

  return { userId: sub, isDevAdmin: false, scopes, memoryAllowed, toolsAllowed, exportAllowed };
}

function parseBearer(authz: string): string | null {
  const m = authz.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function normalizeScopes(scope: unknown): string[] {
  if (Array.isArray(scope)) return scope.map((s) => String(s));
  if (typeof scope === "string") return scope.split(/\s+/).filter(Boolean);
  return [];
}
