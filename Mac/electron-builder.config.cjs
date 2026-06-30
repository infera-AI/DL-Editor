const targetArch = process.env.DL_STUDIO_MAC_ARCH || process.env.npm_config_arch || process.arch;
const isArm64 = targetArch === "arm64";

module.exports = {
  appId: "com.dlstudio.mac",
  productName: "DL Studio",
  directories: {
    output: "release",
    buildResources: "build"
  },
  files: ["dist/**/*", "src/main/**/*", "build/icon.svg", "build/icon.png", "build/icon.ico", "package.json"],
  extraResources: [
    {
      from: "node_modules/ffmpeg-static/ffmpeg",
      to: "bin/ffmpeg"
    },
    isArm64
      ? {
          from: "node_modules/@ffprobe-installer/darwin-arm64/ffprobe",
          to: "bin/ffprobe-arm64"
        }
      : {
          from: "node_modules/ffprobe-static/bin/darwin/x64/ffprobe",
          to: "bin/ffprobe-x64"
        }
  ],
  mac: {
    icon: "build/icon.png",
    target: ["dmg", "pkg"],
    artifactName: "DL-Studio-Mac-${version}-${arch}.${ext}",
    category: "public.app-category.video",
    hardenedRuntime: false,
    gatekeeperAssess: false
  },
  dmg: {
    artifactName: "DL-Studio-Mac-${version}-${arch}.${ext}",
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: "link",
        path: "/Applications"
      }
    ]
  },
  pkg: {
    artifactName: "DL-Studio-Mac-${version}-${arch}.${ext}",
    installLocation: "/Applications"
  }
};
