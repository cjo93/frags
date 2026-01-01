"use client";

import { useMemo, useState } from "react";
import { EphemerisScene } from "./EphemerisScene";

type ComputeArtifact = {
  engine: string;
  engineVersion: string;
  profileId: string;
  inputsHash: string;
  birthData: any;
  options: any;
  ephemeris: {
    cacheKey: string;
    canonicalHash: string;
    request: any;
    canonical: any;
  };
};

interface ComputePanelProps {
  profileId: string;
  profileName: string;
}

export function ComputePanel({ profileId, profileName }: ComputePanelProps) {
  const [engineVersion, setEngineVersion] = useState("1.0.0");
  const [artifact, setArtifact] = useState<ComputeArtifact | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "cached" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function runCompute() {
    setStatus("running");
    setError(null);
    try {
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, engineVersion })
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message ?? "Compute failed");
      }
      setArtifact(body.artifact);
      setStatus(body.cached ? "cached" : "idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const ephemerisPoints = useMemo(() => {
    if (!artifact?.ephemeris?.canonical?.points) return [];
    return artifact.ephemeris.canonical.points as { timestamp: string; ra: number; dec: number }[];
  }, [artifact]);

  return (
    <div className="space-y-4 rounded border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">Run compute for {profileName}</p>
          <p className="text-sm text-gray-500">Ephemeris-backed, deterministic compute.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="rounded border px-2 py-1 text-sm"
            value={engineVersion}
            onChange={(e) => setEngineVersion(e.target.value)}
          />
          <button
            onClick={runCompute}
            className="rounded bg-blue-700 px-3 py-2 text-white hover:bg-blue-600 disabled:opacity-60"
            disabled={status === "running"}
          >
            {status === "running" ? "Computing..." : "Run Compute"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {artifact && (
        <div className="space-y-3">
          <div className="rounded border p-3 text-sm">
            <div className="flex flex-wrap gap-3">
              <span className="rounded bg-gray-100 px-2 py-1">engine {artifact.engine}</span>
              <span className="rounded bg-gray-100 px-2 py-1">version {artifact.engineVersion}</span>
              <span className="rounded bg-gray-100 px-2 py-1">inputsHash {artifact.inputsHash.slice(0, 8)}…</span>
              <span className="rounded bg-gray-100 px-2 py-1">
                ephemeris {artifact.ephemeris.cacheKey.slice(0, 8)}…
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                status {status === "cached" ? "cached" : "fresh"}
              </span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border p-3">
              <h3 className="text-sm font-semibold">Summary</h3>
              <p className="text-xs text-gray-600">Birth data normalized and ephemeris cache details.</p>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                {JSON.stringify(
                  {
                    birthData: artifact.birthData,
                    ephemeris: {
                      cacheKey: artifact.ephemeris.cacheKey,
                      canonicalHash: artifact.ephemeris.canonicalHash
                    }
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <div className="rounded border p-3">
              <h3 className="text-sm font-semibold">Ephemeris points</h3>
              <EphemerisScene points={ephemerisPoints} />
            </div>
          </div>
          <div className="rounded border p-3">
            <h3 className="text-sm font-semibold">Raw artifact</h3>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(artifact, null, 2)}
            </pre>
          </div>
        </div>
      )}
      {!artifact && (
        <div className="rounded border border-dashed p-3 text-sm text-gray-600">
          No compute run yet. Click “Run Compute” to generate ephemeris-backed output.
        </div>
      )}
    </div>
  );
}
