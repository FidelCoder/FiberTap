# Widget Integration

Reference for all widget configuration options.

## Basic Usage

```html
<script
  src="https://cdn.fibertap.dev/widget.min.js"
  data-creator="ckb1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj3c"
></script>
```

## Configuration

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-creator` | string | (required) | CKB address to receive payments |
| `data-theme` | `light` / `dark` / `auto` | `auto` | Widget color scheme |
| `data-position` | `bottom-right` / `bottom-left` | `bottom-right` | Button placement |
| `data-api` | string | `https://api.fibertap.dev` | Custom API endpoint |

## Theme

The widget supports three theme modes:

- **light** - Always light mode
- **dark** - Always dark mode
- **auto** - Matches the user's system preference (`prefers-color-scheme`)

```html
<script
  src="https://cdn.fibertap.dev/widget.min.js"
  data-creator="YOUR_ADDRESS"
  data-theme="dark"
></script>
```

## Position

Place the widget on either side of the screen:

```html
<!-- Bottom right (default) -->
<script data-creator="YOUR_ADDRESS" data-position="bottom-right"></script>

<!-- Bottom left -->
<script data-creator="YOUR_ADDRESS" data-position="bottom-left"></script>
```

## Custom API Endpoint

If you run your own FiberTap API server:

```html
<script
  src="https://cdn.fibertap.dev/widget.min.js"
  data-creator="YOUR_ADDRESS"
  data-api="https://your-api.example.com"
></script>
```

## Style Isolation

The widget renders inside a Shadow DOM. This means:

- The widget's styles do not affect your page
- Your page's styles do not affect the widget
- You cannot override widget styles with CSS (by design)

## Bundle Size

The widget is approximately 3KB gzipped. It loads fast and has zero runtime dependencies.

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

## Manual Initialization

If you need to initialize the widget programmatically instead of via script tag:

```html
<script type="module">
  import { createWidget } from "https://cdn.fibertap.dev/widget.min.js";

  createWidget({
    creator: "YOUR_ADDRESS",
    theme: "dark",
    position: "bottom-left",
  });
</script>
```
