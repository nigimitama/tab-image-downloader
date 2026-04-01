import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Download Image in Tabs",
  description: "__MSG_description__",
  default_locale: "ja",
  version: pkg.version,
  icons: {
    128: "public/icon128.png",
  },
  action: {
    default_icon: {
      128: "public/icon128.png",
    },
    default_popup: "src/popup/index.html",
  },
  permissions: ["tabs", "downloads", "storage"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  options_page: "src/options/index.html",
});
