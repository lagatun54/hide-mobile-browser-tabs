const path = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      // Сборка только для index.html.
      input: path.resolve(__dirname, "index.html"),
      output: {
        // Один предсказуемый URL: старые деплои / кэш ищут main.js; хеш только у чанков.
        entryFileNames: "main.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
