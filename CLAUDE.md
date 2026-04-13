# CLAUDE.md — Project Guidelines & Learned Solutions

## Project Overview
- **App**: Event Tickets Web Application (Next.js)
- **GitHub**: https://github.com/willvv/eventtickets
- **Cloudflare Pages**: https://eventtickets.pages.dev
- **Cloudflare Account**: willvv@gmail.com

## Infrastructure
- **Hosting**: Cloudflare Pages (auto-deploys from GitHub `main` branch)
- **Build command**: `npm run build`
- **Output dir**: `.next`
- **Framework**: Next.js

## Critical Rules

### Secrets & Security
- **NEVER commit `.secrets`** — it is in `.gitignore`. This file contains GitHub PAT and Cloudflare API keys.
- All credentials live in `.secrets` at the project root.
- Do not hardcode credentials anywhere in source code.

### API / Tool Calls
- **NEVER use `curl` or `wget`** — the context-mode hook blocks them. Always use `mcp__plugin_context-mode_context-mode__execute` with JavaScript `https` module for HTTP calls.
- **NEVER use `Bash` for commands that produce >20 lines of output** — use context-mode execute instead.

### Git Workflow
- Default branch is `main`.
- Remote: `https://github.com/willvv/eventtickets.git`
- Push to `main` triggers automatic Cloudflare Pages deployment.

---

## Learned Solutions Log

> **Rule**: Whenever you attempt a task, fail, and find the correct approach — document it here so it is never retried incorrectly.

### 2026-04-13 — Making HTTP/API calls from Claude Code

**Task**: Call GitHub API and Cloudflare API to create repos/projects.

**What FAILED**:
- `curl` via Bash tool is blocked by the context-mode PreToolUse hook with message: _"curl/wget blocked. Use mcp__plugin_context-mode_context-mode__fetch_and_index or execute instead."_

**What WORKS**:
Use `mcp__plugin_context-mode_context-mode__execute` with `language: "javascript"` and Node.js `https` module:
```javascript
const https = require('https');
const options = { hostname: 'api.github.com', path: '/...', method: 'POST', headers: {...} };
const req = https.request(options, (res) => { ... });
req.write(data); req.end();
```
This runs in a sandboxed subprocess and only the `console.log` output enters context.

---

## Next Steps
- [ ] Scaffold Next.js application (`npx create-next-app@latest`)
- [ ] Configure Next.js for Cloudflare Pages (`@cloudflare/next-on-pages`)
- [ ] Set up CI/CD environment variables in Cloudflare Pages dashboard
