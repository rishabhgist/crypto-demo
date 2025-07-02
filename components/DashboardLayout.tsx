"use client";

import React from "react";
import { DashboardHeader } from "./DashboardHeader";
import { DockViewDashboard } from "./DockViewDashboard";
import { DashboardProvider } from "@/contexts/DashboardContext";

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 overflow-hidden">
        <DashboardProvider children={<DockViewDashboard />} />
      </main>
    </div>
  );
}
