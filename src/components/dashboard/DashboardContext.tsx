"use client";

import { createContext, useContext, useEffect } from "react";
import { loadDefaults } from "@/lib/defaults-client";
import { useImageStore } from "@/store/image-store";

interface DashboardInfo {
  loggedIn: boolean;
  user: { name?: string | null; email?: string | null } | null;
}

const Ctx = createContext<DashboardInfo>({ loggedIn: false, user: null });

export const useDashboard = () => useContext(Ctx);

let defaultsApplied = false;

export function DashboardProvider({ value, children }: { value: DashboardInfo; children: React.ReactNode }) {
  // Apply saved defaults once per page load, before the user starts working.
  useEffect(() => {
    if (defaultsApplied) return;
    defaultsApplied = true;
    loadDefaults(value.loggedIn).then((d) => {
      if (d && useImageStore.getState().items.length === 0) useImageStore.getState().applyDefaults(d);
    });
  }, [value.loggedIn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
