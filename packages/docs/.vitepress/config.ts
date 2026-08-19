import { defineConfig } from "vitepress";

export default defineConfig({
  title: "FiberTap",
  description: "Embed CKB micropayments into any website",
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "API", link: "/api" },
      { text: "GitHub", link: "https://github.com/FidelCoder/FiberTap" },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Overview", link: "/" },
          { text: "Getting Started", link: "/getting-started" },
        ],
      },
      {
        text: "Widget",
        items: [
          { text: "Integration", link: "/widget" },
          { text: "Examples", link: "/examples" },
        ],
      },
      {
        text: "Creator",
        items: [
          { text: "Setup", link: "/creator" },
          { text: "API Reference", link: "/api" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/FidelCoder/FiberTap" },
    ],
  },
});
