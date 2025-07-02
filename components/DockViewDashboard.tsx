"use client";

import React, { useCallback, useState, useEffect } from "react";
import {
  DockviewApi,
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
} from "dockview";
import { MarketDataPanel } from "./panels/MarketDataPanel";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import PriceChartPanel from "./panels/PriceChartPanel";
import "dockview/dist/styles/dockview.css";
import dynamic from "next/dynamic";
import { DashboardProvider } from "@/contexts/DashboardContext";

const LiveTradesPanel = dynamic(() => import("./panels/LiveTradesPanel"), {
  ssr: false,
});

// Static fallback components
const LiveTradesPanelFallback: React.FC<IDockviewPanelProps> = () => (
  <div className="flex items-center justify-center h-full p-4">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading Live Trades...</p>
    </div>
  </div>
);

const PriceChartPanelFallback: React.FC<IDockviewPanelProps> = () => (
  <div className="flex items-center justify-center h-full p-4">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading Price Chart...</p>
    </div>
  </div>
);

const MarketDataPanelFallback: React.FC<IDockviewPanelProps> = () => (
  <div className="flex items-center justify-center h-full p-4">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading Market Data...</p>
    </div>
  </div>
);

// Error boundary component
class DockviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("DockView Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-background">
          <div className="text-center space-y-4 max-w-lg p-6">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Panel Loading Error
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error?.message || "Unknown error occurred"}
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Panel components registry with better error handling
const createComponents = () => {
  const components: Record<string, React.FC<IDockviewPanelProps>> = {};

  // Use real components
  //@ts-ignore
  components["live-trades"] = LiveTradesPanel;
  components["price-chart"] = PriceChartPanel;
  components["market-data"] = MarketDataPanel;

  return components;
};

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress: number;
  step: string;
}

export function DockViewDashboard() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    error: null,
    progress: 0,
    step: "Initializing components...",
  });

  const [components] = useState(() => {
    console.log("[DASHBOARD] Creating components registry...");
    const comps = createComponents();
    console.log("[DASHBOARD] Components created:", Object.keys(comps));
    return comps;
  });

  const [dockviewApi, setDockviewApi] = useState<DockviewApi | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Update loading progress
  const updateProgress = useCallback((progress: number, step: string) => {
    console.log(`[PROGRESS] ${progress}% - ${step}`);
    setLoadingState((prev) => ({
      ...prev,
      progress,
      step,
    }));
  }, []);

  const onReady = useCallback(
    async (event: DockviewReadyEvent) => {
      try {
        console.log("[DASHBOARD] onReady callback triggered!", event);
        setIsReady(true);

        const api = event.api;
        setDockviewApi(api);

        updateProgress(10, "DockView API ready...");

        // Ensure API is properly initialized
        if (!api) {
          throw new Error("DockView API is null");
        }

        updateProgress(20, "Clearing existing panels...");
        api.clear();

        // Add a small delay to ensure DOM is ready
        await new Promise((resolve) => setTimeout(resolve, 200));

        updateProgress(30, "Verifying components...");
        const availableComponents = Object.keys(components);
        console.log("[DASHBOARD] Available components:", availableComponents);

        if (availableComponents.length === 0) {
          throw new Error("No components available for panel creation");
        }

        updateProgress(40, "Creating Live Trades panel...");
        try {
          const panel1 = api.addPanel({
            id: "live-trades",
            component: "live-trades",
            title: "Live Trades",
          });
          console.log("[DASHBOARD] Live Trades panel created:", panel1?.id);

          if (!panel1) {
            throw new Error(
              "Failed to create Live Trades panel - panel is null"
            );
          }
        } catch (panelError) {
          console.error(
            "[DASHBOARD] Error creating Live Trades panel:",
            panelError
          );
          throw new Error(
            `Failed to create Live Trades panel: ${
              panelError instanceof Error ? panelError.message : "Unknown error"
            }`
          );
        }

        // updateProgress(60, "Creating Price Chart panel...");
        try {
          const panel2 = api.addPanel({
            id: "price-chart",
            component: "price-chart",
            title: "Price Chart",
            position: { direction: "right", referencePanel: "live-trades" },
          });
          console.log("[DASHBOARD] Price Chart panel created:", panel2?.id);
        } catch (panelError) {
          console.warn(
            "[DASHBOARD] Failed to create Price Chart panel with reference, trying without:",
            panelError
          );
          // Fallback: create without position reference
          const panel2 = api.addPanel({
            id: "price-chart",
            component: "price-chart",
            title: "Price Chart",
          });
          console.log(
            "[DASHBOARD] Price Chart panel created (fallback):",
            panel2?.id
          );
        }

        // updateProgress(80, "Creating Market Data panel...");
        try {
          const panel3 = api.addPanel({
            id: "market-data",
            component: "market-data",
            title: "Market Data",
          });
          console.log("[DASHBOARD] Market Data panel created:", panel3?.id);
        } catch (panelError) {
          console.warn(
            "[DASHBOARD] Failed to create Market Data panel:",
            panelError
          );
          // Continue anyway - at least we have some panels
        }

        // updateProgress(100, "Dashboard ready!");
        // console.log("[DASHBOARD] All panels created successfully!");

        // // Wait a moment before hiding loading
        // setTimeout(() => {
        //   setLoadingState((prev) => ({
        //     ...prev,
        //     isLoading: false,
        //   }));
        //   console.log(
        //     "[DASHBOARD] Loading state cleared, dashboard should be visible"
        //   );
        // }, 500);
      } catch (error) {
        console.error("[DASHBOARD] Critical error in onReady:", error);
        setLoadingState({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to initialize dashboard panels.",
          progress: 0,
          step: "Error",
        });
      }
    },
    [updateProgress, components]
  );

  // Enhanced timeout with better diagnostics
  useEffect(() => {
    console.log("[DASHBOARD] Setting up timeout watcher...");

    const timeout = setTimeout(() => {
      if (loadingState.isLoading && !loadingState.error && !isReady) {
        console.error("[DASHBOARD] Timeout reached - onReady never fired!");
        console.log(
          "[DASHBOARD] Components available:",
          Object.keys(components)
        );
        console.log("[DASHBOARD] Current loading state:", loadingState);

        setLoadingState({
          isLoading: false,
          error: "Dashboard initialization error. ",
          progress: 0,
          step: "Timeout",
        });
      } else if (isReady) {
        console.log("[DASHBOARD] Timeout");
      }
    }, 15000);

    return () => {
      console.log("[DASHBOARD] Clearing timeout");
      clearTimeout(timeout);
    };
  }, [loadingState.isLoading, loadingState.error, isReady, components]);

  useEffect(() => {
    console.log("[DASHBOARD] Component mounted");
    console.log("[DASHBOARD] Components registry:", components);
    updateProgress(5, "Components registered...");
  }, [components, updateProgress]);

  const handleRetry = useCallback(() => {
    console.log("[DASHBOARD] Retry requested");
    setLoadingState({
      isLoading: true,
      error: null,
      progress: 0,
      step: "Retrying initialization...",
    });
    setIsReady(false);

    if (dockviewApi) {
      try {
        dockviewApi.clear();
      } catch (error) {
        console.warn("Error clearing dockview:", error);
      }
    }

    setTimeout(() => {
      console.log("[DASHBOARD] Reloading page...");
      window.location.reload();
    }, 2000);
  }, [dockviewApi]);

  // if (loadingState.error) {
  //   return (
  //     <div className="h-full flex items-center justify-center bg-background">
  //       <div className="text-center space-y-4 max-w-lg p-6">
  //         <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
  //         <div>
  //           <h3 className="text-xl font-semibold mb-2">
  //             Dashboard Failed to Load
  //           </h3>
  //           <p className="text-sm text-muted-foreground mb-4">
  //             {loadingState.error}
  //           </p>
  //           <details className="text-xs text-left bg-muted p-2 rounded">
  //             <summary className="cursor-pointer">Technical Details</summary>
  //             <pre className="mt-2 whitespace-pre-wrap">
  //               Components: {Object.keys(components).join(", ")}
  //               {"\n"}Ready State: {isReady ? "Ready" : "Not Ready"}
  //               {"\n"}API State: {dockviewApi ? "Available" : "Not Available"}
  //             </pre>
  //           </details>
  //         </div>
  //         <div className="flex gap-2 justify-center">
  //           <Button onClick={handleRetry} variant="outline" size="sm">
  //             <RefreshCw className="h-4 w-4 mr-2" />
  //             Retry
  //           </Button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // if (loadingState.isLoading) {
  //   return (
  //     <div className="h-full flex items-center justify-center bg-background">
  //       <div className="text-center space-y-6 max-w-md p-6">
  //         <div className="space-y-4">
  //           <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
  //           <div>
  //             <h3 className="text-xl font-semibold mb-2">Loading Dashboard</h3>
  //             <p className="text-sm text-muted-foreground">
  //               {loadingState.step}
  //             </p>
  //           </div>
  //         </div>
  //         <div className="space-y-2">
  //           <Progress value={loadingState.progress} className="w-full" />
  //           <div className="text-xs text-muted-foreground">
  //             {loadingState.progress}% complete
  //           </div>
  //         </div>
  //         {loadingState.progress === 0 && (
  //           <div className="text-xs text-muted-foreground">
  //             If this takes too long, check the browser console for errors
  //           </div>
  //         )}
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <DockviewErrorBoundary>
      <DashboardProvider
        children={
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
        }
      />
    </DockviewErrorBoundary>
  );
}
