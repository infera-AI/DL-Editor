import packageJson from "@platform/package";

const APP_NAME = "DL Studio";

const APP_INFO = {
  name: "DL Studio",
  version: packageJson.version,
  updatedAt: "2026-09-05",
  engine: "FFmpeg / FFprobe",
  stack: "Electron + React"
};

export { APP_NAME, APP_INFO };
