import fs from "node:fs";
import path from "node:path";
import { canonicalStringify, sha256Hex } from "@/lib/utils/canonical";

export type EphemerisObserver =
  | { kind: "GEOCENTER" }
  | { kind: "TOPO"; latitude: number; longitude: number; elevation?: number };

export interface EphemerisRequestInput {
  target: string;
  observer: EphemerisObserver;
  refFrame?: string;
  timescale?: string;
  start: string;
  stop: string;
  step: string;
  quantities: number[];
  units?: string;
  formatVersion?: string;
}

export interface EphemerisRequestCanonical {
  target: string;
  observer: EphemerisObserver;
  refFrame: string;
  timescale: string;
  start: string;
  stop: string;
  step: string;
  quantities: number[];
  units: string;
  formatVersion: string;
}

export function buildEphemerisRequest(input: EphemerisRequestInput): EphemerisRequestCanonical {
  return {
    target: input.target,
    observer: input.observer.kind === "TOPO"
      ? {
          kind: "TOPO",
          latitude: Number(input.observer.latitude.toFixed(6)),
          longitude: Number(input.observer.longitude.toFixed(6)),
          elevation:
            input.observer.elevation !== undefined
              ? Number(input.observer.elevation.toFixed(2))
              : undefined
        }
      : { kind: "GEOCENTER" },
    refFrame: input.refFrame ?? "ICRF",
    timescale: input.timescale ?? "UTC",
    start: input.start,
    stop: input.stop,
    step: input.step,
    quantities: [...input.quantities].sort((a, b) => a - b),
    units: input.units ?? "KM",
    formatVersion: input.formatVersion ?? "1.0"
  };
}

export function buildEphemerisCacheKey(request: EphemerisRequestCanonical) {
  return sha256Hex(canonicalStringify(request));
}

const fixturesDir = path.join(process.cwd(), "fixtures", "horizons");
const defaultFixture = path.join(fixturesDir, "sample_geocenter.txt");

function loadFixture(cacheKey: string) {
  const keyed = path.join(fixturesDir, `${cacheKey}.txt`);
  if (fs.existsSync(keyed)) {
    return fs.readFileSync(keyed, "utf8");
  }
  if (fs.existsSync(defaultFixture)) {
    return fs.readFileSync(defaultFixture, "utf8");
  }
  throw new Error("No Horizons fixtures available");
}

export async function fetchHorizonsRaw(request: EphemerisRequestCanonical): Promise<string> {
  const mode = process.env.HORIZONS_MODE ?? "fixtures";
  if (mode !== "live") {
    return loadFixture(buildEphemerisCacheKey(request));
  }

  // Placeholder for live mode wiring; keeping deterministic offline by default.
  throw new Error("Live Horizons fetch not configured; set HORIZONS_MODE=fixtures");
}

export interface EphemerisPoint {
  timestamp: string;
  ra: number;
  dec: number;
}

export interface ParsedEphemeris {
  formatVersion: string;
  units: { ra: string; dec: string };
  points: EphemerisPoint[];
}

export function parseHorizonsRaw(rawText: string): ParsedEphemeris {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"));

  const dataLines = lines.filter((l) => l.includes(",") && !l.toLowerCase().startsWith("date"));
  const points = dataLines.map((line) => {
    const [timestamp, ra, dec] = line.split(",");
    return {
      timestamp,
      ra: Number(parseFloat(ra).toFixed(6)),
      dec: Number(parseFloat(dec).toFixed(6))
    };
  });

  points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    formatVersion: "1",
    units: { ra: "deg", dec: "deg" },
    points
  };
}
