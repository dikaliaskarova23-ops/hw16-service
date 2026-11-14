import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Все страницы зависят от вошедшего пользователя, поэтому рендерим их на каждый запрос.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
