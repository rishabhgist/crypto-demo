"use client";
import React, { useCallback } from "react";
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
} from "dockview";
import "dockview/dist/styles/dockview.css";
import { DockViewDashboard } from "@/components/DockViewDashboard";
import { DashboardProvider } from "@/contexts/DashboardContext";

const PanelA: React.FC<IDockviewPanelProps> = () => <div>Panel A Content</div>;
const PanelB: React.FC<IDockviewPanelProps> = () => <div>Panel B Content</div>;
const PanelC: React.FC<IDockviewPanelProps> = () => <div>Panel C Content</div>;

const components = {
  a: PanelA,
  b: PanelB,
  c: PanelC,
};

export default function TestPage() {
  const onReady = useCallback((event: DockviewReadyEvent) => {
    const api = event.api;
    api.clear();
    const panelA = api.addPanel({ id: "a", component: "a", title: "Tab A" });
    const panelB = api.addPanel({
      id: "b",
      component: "b",
      title: "Tab B",
      position: { direction: "right", referencePanel: panelA },
    });
    api.addPanel({
      id: "c",
      component: "c",
      title: "Tab C",
      position: { direction: "below", referencePanel: panelB },
    });
  }, []);

  return (
    <div className="h-screen w-screen">
      <DockviewReact
        onReady={onReady}
        components={components}
        className="dockview-theme-dark h-full"
        watermarkComponent={() => null}
        defaultTabComponent={({ params }) => (
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <span>{params.title || "Panel"}</span>
          </div>
        )}
      />
    </div>
  );
}
