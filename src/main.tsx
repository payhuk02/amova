import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (Capacitor.isNativePlatform()) {
  void import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    void StatusBar.setStyle({ style: Style.Dark });
    void StatusBar.setBackgroundColor({ color: "#0F1114" });
  });
  void import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    void SplashScreen.hide();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
