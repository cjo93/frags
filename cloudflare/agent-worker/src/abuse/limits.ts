export const LIMITS = {
  chat: {
    maxBodyBytes: 64 * 1024,
    maxMessageChars: 8_000,
    maxTurns: 30,
    maxPageContextChars: 20_000,
    maxTotalContextChars: 40_000,
    ratePerMin: 20,
    concurrency: 2
  },
  tool: {
    maxBodyBytes: 16 * 1024,
    ratePerMin: 30,
    concurrency: 3
  },
  memory: {
    maxItems: 200
  },
  globalIp: {
    ratePerMin: 120
  }
} as const;
