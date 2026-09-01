import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.amova.space",
  appName: "Amova",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#100A14",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#100A14",
    },
  },
};

export default config;
