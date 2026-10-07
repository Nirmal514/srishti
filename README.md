# SRISHTI

A PROJECT WHERE A SEED TURNES INTO A BRANCHING KNOWLEDGE SYSTEM.

## Run in VS Code

The VS Code workspace opens the parent folder, while the app and `package.json` are in `shrishti/`. Use **Terminal → Run Task → Run SHRISHTI** to start the dev server with the correct working directory.

From the integrated PowerShell terminal, the equivalent command is:

```powershell
npm --prefix ".\shrishti" run dev:vscode
```

If you opened the `shrishti` project folder itself in VS Code, run `npm run dev:vscode` instead. The app is served at `http://localhost:4177/`.

Install dependencies with `npm install` from the project folder. Add `GEMINI_API_KEY` to the ignored local `.env` file to enable research. The optional `OPENAI_API_KEY` is used as a fallback.

## Built with

- TanStack Start
- TypeScript
- React
- Local file-backed backend
- Gemini API

THANK YOU
