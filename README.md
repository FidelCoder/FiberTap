# FiberTap

Embeddable micropayment widget for the CKB Fiber Network. One script tag. Any website.

## What It Does

A floating tip button that visitors click to send CKB directly to a creator through Fiber. No accounts. No custodial wallets. No fiat.

## Packages

| Package | Purpose |
|---------|---------|
| `@fibertap/core` | Types, Fiber SDK wrapper, utilities |
| `@fibertap/widget` | Embeddable browser widget (vanilla JS) |
| `@fibertap/api` | Creator backend (registration, payments, webhooks) |
| `@fibertap/docs` | Documentation site |

## Integration

```html
<script
  src="https://cdn.fibertap.dev/widget.min.js"
  data-creator="ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c"
></script>
```

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Stack

- TypeScript
- pnpm workspaces
- Turborepo
- Vite (widget build)
- Hono (API server)
- VitePress (docs)
- SQLite (storage)
