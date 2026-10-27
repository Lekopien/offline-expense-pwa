# Offline Expense Tracker (PWA)

[![ci](https://github.com/Lekopien/offline-expense-pwa/actions/workflows/ci.yml/badge.svg)](https://github.com/Lekopien/offline-expense-pwa/actions/workflows/ci.yml)

**Live app: https://expenses.lekopien.com** (install it from your browser menu)

An installable **Progressive Web App** for tracking spending, written in vanilla JavaScript with no framework and no build step. After the first visit it works with no internet at all, and every expense stays on the device in IndexedDB.

## Features

- **Offline-first**: a cache-first service worker serves the whole app without a network.
- **Installable** on Android, iOS, Windows and macOS via the web app manifest.
- **IndexedDB storage** behind a small promise wrapper, with an in-memory fallback for private browsing.
- Monthly totals, daily average, **budget bar** that turns red when you overspend.
- **SVG donut chart** by category, computed from scratch (arc maths in `logic.js`).
- **CSV export and import** with a proper parser (quoted fields, commas, CRLF); bad rows are reported, not fatal.
- Amounts in Kenyan shillings, light and dark themes, mobile-first layout.

## Run it

No build needed; serve the `app/` folder over HTTP (service workers don't run from `file://`):

```bash
npm start            # npx serve app → http://localhost:3000
npm test             # node:test on the pure logic
```

## Structure

| File | Role |
| --- | --- |
| `app/index.html` | Markup, manifest and icon links |
| `app/app.js` | UI wiring, rendering, install prompt, online/offline badge |
| `app/logic.js` | Pure functions: validation, monthly summary, donut geometry, CSV in and out |
| `app/db.js` | IndexedDB wrapper with memory fallback |
| `app/sw.js` | Service worker: precache, cache cleanup, cache-first fetch with offline fallback |
| `test/logic.test.js` | Unit tests for the logic module |

Keeping the logic pure means it's tested in Node without a browser, while the same file runs in the app.

## Deploying updates

Bump `VERSION` in `app/sw.js` when you change any file, so returning visitors get the new cache. The `app/` folder is served free by a Cloudflare Worker (`wrangler.jsonc`) at `expenses.lekopien.com`.

## License

MIT
