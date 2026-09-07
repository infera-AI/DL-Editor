const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const { createRendererConfig } = require("../shared/build/vite.config.cjs");

module.exports = createRendererConfig(__dirname, defineConfig, react);
