const path = require("path");

// Dependencies and platform assets continue to come from the package being built.
// The shared renderer therefore needs no separate install step in the release jobs.
function createRendererConfig(platformRoot, defineConfig, react) {
  const packageDirectory = (name) => path.dirname(require.resolve(`${name}/package.json`, { paths: [platformRoot] }));

  return defineConfig({
    plugins: [react()],
    root: platformRoot,
    base: "./",
    resolve: {
      alias: {
        "@platform/package": path.join(platformRoot, "package.json"),
        "@platform/icon": path.join(platformRoot, "build", "icon.svg"),
        react: packageDirectory("react"),
        "react-dom": packageDirectory("react-dom"),
        "lucide-react": packageDirectory("lucide-react")
      },
      dedupe: ["react", "react-dom"]
    },
    build: {
      outDir: "dist",
      emptyOutDir: true
    },
    server: {
      port: 5173,
      strictPort: true,
      fs: { allow: [platformRoot, path.resolve(__dirname, "../renderer")] }
    }
  });
}

module.exports = { createRendererConfig };
