"use client";

import { useEffect, useState } from "react";
import { registerAutoSync, type SyncStatus } from "@/lib/offline/sync";
import { clsx } from "clsx";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("IDLE");

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const unregister = registerAutoSync(setSyncStatus);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      unregister();
    };
  }, []);

  const label = !online
    ? "Offline"
    : syncStatus === "SYNCING"
    ? "Syncing"
    : syncStatus === "SYNC_ERROR"
    ? "Sync error"
    : "Online";

  const dotColor = !online
    ? "bg-warning"
    : syncStatus === "SYNC_ERROR"
    ? "bg-danger"
    : syncStatus === "SYNCING"
    ? "bg-warning"
    : "bg-success";

  return (
    <div className="flex items-center gap-1.5 text-xs text-gate-textMuted">
      <span className={clsx("h-1.5 w-1.5 rounded-full", dotColor)} aria-hidden />
      {label}
    </div>
  );
}
