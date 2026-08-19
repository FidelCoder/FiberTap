# Creator Setup

Register as a creator to receive payments and manage your widget configuration.

## Register

```bash
curl -X POST https://api.fibertap.dev/api/creators/register \
  -H "Content-Type: application/json" \
  -d '{
    "ckbAddress": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
    "displayName": "My Blog"
  }'
```

Response:

```json
{
  "id": "ft_abc123",
  "apiKey": "ft_live_xyz789",
  "ckbAddress": "ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c",
  "displayName": "My Blog"
}
```

Save your API key. It is shown only once.

## Get Your Profile

```bash
curl https://api.fibertap.dev/api/creators/ft_abc123
```

## Update Widget Configuration

```bash
curl -X PATCH https://api.fibertap.dev/api/creators/ft_abc123/config \
  -H "Content-Type: application/json" \
  -H "x-api-key: ft_live_xyz789" \
  -d '{
    "theme": "dark",
    "presetAmounts": [1, 5, 10, 25],
    "customLabel": "Buy me a coffee"
  }'
```

## Register a Webhook

Get notified when payments are confirmed:

```bash
curl -X POST https://api.fibertap.dev/api/creators/ft_abc123/webhooks \
  -H "Content-Type: application/json" \
  -H "x-api-key: ft_live_xyz789" \
  -d '{
    "url": "https://your-server.com/webhooks/fibertap",
    "secret": "your-webhook-secret"
  }'
```

Response:

```json
{
  "webhookId": "ft_wh_abc123"
}
```

## Webhook Events

Your webhook endpoint receives POST requests with this structure:

```json
{
  "type": "payment.confirmed",
  "paymentId": "ft_pay_xyz",
  "amount": "100000000",
  "senderAddress": "ckt1q...",
  "txHash": "0xabc...",
  "confirmedAt": 1700000000000,
  "message": "Great article!"
}
```

### Headers

| Header | Description |
|--------|-------------|
| `X-FiberTap-Signature` | HMAC-SHA256 signature of the payload |
| `X-FiberTap-Event` | Event type (`payment.confirmed` or `payment.failed`) |

### Verify Signatures

```javascript
import crypto from "crypto";

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```
