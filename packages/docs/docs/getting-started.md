# Getting Started

Go from zero to accepting CKB payments in under 5 minutes.

## Prerequisites

- A CKB wallet (JoyID recommended for browser, or any CCC-compatible wallet)
- A website where you can add HTML

## Step 1: Get Your CKB Address

Open your CKB wallet and copy your receiving address.

- Mainnet: starts with `ckb1q...`
- Testnet: starts with `ckt1q...`

## Step 2: Add the Widget

Paste this before the closing `</body>` tag on your website:

```html
<script
  src="https://cdn.fibertap.dev/widget.min.js"
  data-creator="YOUR_CKB_ADDRESS_HERE"
></script>
```

Replace `YOUR_CKB_ADDRESS_HERE` with your actual CKB address.

## Step 3: Test Locally

Create a file called `test.html`:

```html
<!DOCTYPE html>
<html>
<head><title>FiberTap Test</title></head>
<body>
  <h1>My Website</h1>
  <p>Visitors can now tip me with CKB.</p>

  <script
    src="https://cdn.fibertap.dev/widget.min.js"
    data-creator="ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c"
  ></script>
</body>
</html>
```

Open this file in your browser. You will see a blue "Tip" button in the bottom-right corner.

## Step 4: Deploy

Add the script tag to your production website. Visitors can now send you CKB tips.

## What Happens Next

1. Visitor clicks the "Tip" button
2. They select an amount or enter a custom amount
3. They click "Pay with Fiber"
4. Their wallet opens for confirmation
5. CKB is sent to your address via Fiber Network

## Customization

Add data attributes to change the widget appearance:

```html
<script
  src="https://cdn.fibertap.dev/widget.min.js"
  data-creator="YOUR_ADDRESS"
  data-theme="dark"
  data-position="bottom-left"
></script>
```

See [Widget Integration](/widget) for all options.
