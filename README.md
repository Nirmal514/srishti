# SRISHTI

A PROJECT WHERE A SEED TURNES INTO A BRANCHING KNOWLEDGE SYSTEM.

## Local setup

1. Install dependencies:

```sh
npm install
```

2. Copy the sample environment file and fill in your real credentials:

```sh
cp .env.example .env
```

3. Add your values in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (preferred)
- optional `GEMINI_API_BASE` / `GEMINI_MODEL`
- optional `OPENAI_API_KEY` fallback

4. Start the app:

```sh
npm run dev -- --host 0.0.0.0
```

## Built with

- TanStack Start
- TypeScript
- React
- Supabase
- OpenAI-compatible API
