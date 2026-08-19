# API Reference

Base URL: `https://api.fibertap.dev`

## Authentication

Most endpoints require an API key in the `x-api-key` header. Public endpoints are marked below.

## Creators

### Register

`POST /api/creators/register` (public)

Register a new creator account.

**Request:**

```json
{
  "ckbAddress": "ckb1q...",
  "displayName": "My Blog"
}
```

**Response (201):**

```json
{
  "id": "ft_abc123",
  "apiKey": "ft_live_xyz789",
  "ckbAddress": "ckb1q...",
  "displayName": "My Blog"
}
```

### Get Creator

`GET /api/creators/:id` (public)

Get creator profile.

**Response (200):**

```json
{
  "id": "ft_abc123",
  "displayName": "My Blog",
  "ckbAddress": "ckb1q...",
  "createdAt": 1700000000000
}
```

### Update Configuration

`PATCH /api/creators/:id/config` (requires API key)

Update widget appearance and behavior.

**Request:**

```json
{
  "theme": "dark",
  "presetAmounts": [1, 5, 10],
  "customLabel": "Support me"
}
```

**Response (200):**

```json
{
  "success": true
}
```

### Register Webhook

`POST /api/creators/:id/webhooks` (requires API key)

Register a webhook URL for payment notifications.

**Request:**

```json
{
  "url": "https://your-server.com/webhook",
  "secret": "your-hmac-secret"
}
```

**Response (201):**

```json
{
  "webhookId": "ft_wh_abc123"
}
```

## Payments

### Create Payment Request

`POST /api/payments/request` (public)

Create a payment request before wallet interaction.

**Request:**

```json
{
  "creatorAddress": "ckb1q...",
  "amount": "100000000",
  "message": "Great article!",
  "senderAddress": "ckt1q..."
}
```

**Response (201):**

```json
{
  "paymentId": "ft_pay_xyz",
  "expiresAt": 1700000600000
}
```

### Confirm Payment

`POST /api/payments/:id/confirm` (public)

Confirm a payment was broadcast after wallet signing.

**Request:**

```json
{
  "txHash": "0xabc...",
  "senderAddress": "ckt1q..."
}
```

**Response (200):**

```json
{
  "status": "pending",
  "paymentId": "ft_pay_xyz",
  "txHash": "0xabc..."
}
```

### Get Payment Status

`GET /api/payments/:id/status` (public)

Check payment confirmation status.

**Response (200):**

```json
{
  "status": "confirmed",
  "txHash": "0xabc...",
  "amount": "100000000",
  "message": "Great article!",
  "createdAt": 1700000000000,
  "expiresAt": 1700000600000
}
```

## Health Check

`GET /health` (public)

**Response (200):**

```json
{
  "status": "ok",
  "network": "testnet",
  "timestamp": 1700000000000
}
```

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid request body |
| 401 | Missing or invalid API key |
| 403 | Unauthorized (wrong creator) |
| 404 | Resource not found |
| 409 | Address already registered |
| 410 | Payment request expired |
| 429 | Rate limit exceeded |
