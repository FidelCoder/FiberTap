# Examples

Copy-paste snippets for common integrations.

## Basic Blog Tipping

```html
<!DOCTYPE html>
<html>
<head><title>My Blog</title></head>
<body>
  <article>
    <h1>How I Built This</h1>
    <p>Here is how I built my latest project...</p>
  </article>

  <script
    src="https://cdn.fibertap.dev/widget.min.js"
    data-creator="ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c"
    data-theme="auto"
  ></script>
</body>
</html>
```

## React Component

```tsx
import { useEffect, useRef } from "react";

type FiberTapProps = {
  creator: string;
  theme?: "light" | "dark" | "auto";
  position?: "bottom-right" | "bottom-left";
};

export function FiberTap({ creator, theme = "auto", position = "bottom-right" }: FiberTapProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const script = document.createElement("script");
    script.src = "https://cdn.fibertap.dev/widget.min.js";
    script.dataset.creator = creator;
    script.dataset.theme = theme;
    script.dataset.position = position;
    document.body.appendChild(script);

    initialized.current = true;
  }, [creator, theme, position]);

  return null;
}

// Usage
function App() {
  return (
    <div>
      <h1>My App</h1>
      <FiberTap creator="ckb1q..." theme="dark" />
    </div>
  );
}
```

## Next.js Integration

In `pages/_document.tsx`:

```tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        <script
          src="https://cdn.fibertap.dev/widget.min.js"
          data-creator="ckb1q..."
          data-theme="dark"
        />
      </body>
    </Html>
  );
}
```

## Hugo Template

In `layouts/_default/baseof.html`:

```html
{{ define "main" }}{{ end }}

{{ define "scripts" }}
  <script
    src="https://cdn.fibertap.dev/widget.min.js"
    data-creator="ckb1q..."
  ></script>
{{ end }}
```

## Custom Styling Override

The widget uses Shadow DOM so you cannot override its styles with CSS. However, you can customize via data attributes:

```html
<script
  src="https://cdn.fibertap.dev/widget.min.js"
  data-creator="ckb1q..."
  data-theme="dark"
  data-position="bottom-left"
></script>
```

For advanced customization, fork the widget source and rebuild.

## Webhook Handler (Node.js)

```javascript
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.FIBERTAP_WEBHOOK_SECRET;

app.post("/webhooks/fibertap", (req, res) => {
  const signature = req.headers["x-fibertap-signature"];
  const payload = JSON.stringify(req.body);

  // Verify signature
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Handle event
  const { type, amount, senderAddress, message } = req.body;

  if (type === "payment.confirmed") {
    console.log(`Received ${amount} shannons from ${senderAddress}: ${message}`);
    // Send thank you email, update database, etc.
  }

  res.json({ received: true });
});

app.listen(3000);
```

## Webhook Handler (Hono)

```typescript
import { Hono } from "hono";
import crypto from "crypto";

const app = new Hono();
const WEBHOOK_SECRET = process.env.FIBERTAP_WEBHOOK_SECRET ?? "";

app.post("/webhooks/fibertap", async (c) => {
  const signature = c.req.header("X-FiberTap-Signature") ?? "";
  const payload = await c.req.text();

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const event = JSON.parse(payload);

  if (event.type === "payment.confirmed") {
    console.log(`Received ${event.amount} shannons from ${event.senderAddress}`);
  }

  return c.json({ received: true });
});

export default app;
```
