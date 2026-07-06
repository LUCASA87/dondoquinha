"use client";

import { useEffect } from "react";
import { initPwaInstallListener } from "@/lib/pwa-install";
import { registerServiceWorker } from "@/lib/pwa-utils";

export function PwaBootstrap() {
  useEffect(() => {
    initPwaInstallListener();
    void registerServiceWorker();
  }, []);

  return null;
}
