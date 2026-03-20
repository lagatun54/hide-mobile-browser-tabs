const path = require("path");
const { defineConfig } = require("vite");

module.exports = defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      // Только app.html — иначе два входа дают main.js + main2.js. Корневой index.html копируется в dist после сборки (npm run build).
      input: path.resolve(__dirname, "app.html"),
      output: {
        // Один предсказуемый URL: старые деплои / кэш ищут main.js; хеш только у чанков.
        entryFileNames: "main.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
