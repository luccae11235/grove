import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  output: "static",
  site: process.env.SITE_URL ?? "http://localhost:4321",
  base: process.env.BASE_PATH ?? "/",
  integrations: [mdx(), react(), sitemap({ filter: (page) => !page.endsWith("/404/") })],
  vite: {
    plugins: [{
      name: "grove-react-development-runtime",
      apply: "serve",
      // React's development JSX transform calls `jsxDEV`. Make the dependency
      // optimizer use the matching development runtime while `astro dev` runs.
      config: () => ({
        define: {
          "process.env.NODE_ENV": JSON.stringify("development"),
        },
      }),
    }],
  },
});
