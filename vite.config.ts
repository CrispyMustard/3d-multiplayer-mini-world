import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/3d-multiplayer-mini-world/" : "/",
  server: {
    host: "localhost",
    port: 5173,
  },
});
