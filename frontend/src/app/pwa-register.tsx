"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.hostname !== "localhost" // Optional: avoid SW caching dev mode in localhost
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA Service Worker registered with scope: ", registration.scope);
          })
          .catch((err) => {
            console.error("PWA Service Worker registration failed: ", err);
          });
      });
    }
  }, []);

  return null;
}
