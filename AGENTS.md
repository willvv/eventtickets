<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# General Rules

- **Think before acting.** Read and understand the code before modifying it. Precision matters more than speed. Never guess — check first.
- **Read a file completely before editing it.** Understand the full context, not just the lines you plan to change.

# Browser/UI Testing Rules

- **Read the page source before clicking anything.** Use `grep` on the page component to find exact selectors before using Patchright. Never guess selectors.
- **Test locally first** (`npm run dev` on port 4000) before deploying to Vercel. Vercel deployments take time and the alias may be stale.
- **To kill the dev server**, use `npx kill-port 4000` — do not use `taskkill` or `Stop-Process`.
- **Reuse the same browser tab** (pageId) across interactions — don't `browse` to a new URL when you can `interact` on the existing page.
- **Keep timeouts short** — `waitFor: 2000` is enough for most pages locally.
- **When a page has multiple submit buttons**, always use a specific selector like `form[action="..."] button[type="submit"]`, never bare `button[type="submit"]`.
