export {};

type VectorizeIndex = {
  query: (vector: number[], options: { topK: number; filter?: Record<string, unknown> }) => Promise<{
    matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>;
  }>;
  upsert: (vectors: Array<{ id: string; values: number[]; metadata?: Record<string, unknown> }>) => Promise<void>;
};

declare global {
  interface Env {
    ENVIRONMENT: string;
    BACKEND_URL: string;

    AI: any;

    USER_AGENT_DO: DurableObjectNamespace;

    AGENT_DB: D1Database;
    AGENT_R2: R2Bucket;

    // Optional at runtime
    AGENT_MEM_INDEX?: VectorizeIndex;

    // Secrets
    JWT_PUBLIC_KEY?: string; // RS256 SPKI PEM (optional)
    AGENT_JWT_SECRET?: string; // HS256 shared secret
    AGENT_JWT_ISS?: string; // expected issuer
    AGENT_JWT_AUD?: string; // expected audience
    DEV_ADMIN_TOKEN?: string;
    BACKEND_HMAC_SECRET?: string; // optional (future signing)
    BUILD_VERSION?: string;
  }
}
