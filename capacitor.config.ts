import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "me.stonechat.pablet",
  appName: "pablet",
  webDir: "build",
  server: {
    androidScheme: "http",
    hostname: "127.0.0.1",
    cleartext: true,
    allowNavigation: ["*"],
  },
};

export default config;
