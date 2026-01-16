# Defrag

**Old technology. Updated interface.**

Defrag is a structured self-reflection tool that synthesizes ancient symbolic systems—Astrology, Human Design, and Gene Keys—into clear, actionable insights. It helps you understand timing, patterns, and relationships without prediction or diagnosis.

## What is Defrag?

Defrag combines deterministic symbolic computation with AI-powered interpretation to provide:
- **Reflection**: Bring your thoughts and experiences into a clean field
- **Pattern Recognition**: Identify signals across time and relationships
- **Timing Context**: Understand when to act and when to wait

**Not predictive. Not diagnostic.** Built for clarity, pacing, and self-authored decisions.

## Key Features

- **Structured Synthesis**: Combines Astrology, Human Design, and Gene Keys into coherent insights
- **Privacy-First**: Optional memory, user-controlled data, no cross-user sharing
- **Secure Exports**: Time-limited export links with clear trust indicators
- **Conversational Agent**: Ask questions and explore your patterns through natural dialogue

## Technology Stack

- **Backend**: Python (FastAPI) with deterministic synthesis engine
- **Frontend**: Next.js with TypeScript
- **Worker**: Cloudflare Workers for AI agent interactions
- **Database**: PostgreSQL with Alembic migrations

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL

### Backend Setup
```bash
# Install dependencies
pip install -e .

# Set required environment variables
export SYNTH_DATABASE_URL="postgresql://..."
export SYNTH_JWT_SECRET="your-secret"
export SYNTH_BACKEND_HMAC_SECRET="your-hmac-secret"

# Run migrations
alembic upgrade head

# Start the server
uvicorn synth_engine.api.app:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install

# Set required environment variables
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Start the development server
npm run dev
```

### Worker Setup
See `cloudflare/agent-worker/README.md` for Cloudflare Worker deployment.

## Architecture

- **Synthesis Engine**: Deterministic computation of symbolic systems
- **AI Interpretation Layer**: Explains computed results with clear boundaries
- **Agent System**: Conversational interface with memory management
- **Security**: JWT authentication, HMAC verification, rate limiting

## Documentation

For detailed documentation, see:
- `docs/DEVELOPER_GUIDE.md` - Development setup and workflows
- `docs/deployment.md` - Deployment instructions
- `docs/frontend_contract.md` - Frontend/backend API contract
- `docs/dev-admin.md` - Admin access (internal only)

## Security & Privacy

- **Deterministic First**: Symbolic computation happens before AI interpretation
- **User Control**: Optional memory, scoped to active profile
- **No Predictions**: Clear boundaries on what the system can and cannot do
- **Data Protection**: Encrypted in transit, access-controlled at rest

## Contributing

This is a private repository. For questions or access requests, please contact the maintainers.

## License

Proprietary - All rights reserved
