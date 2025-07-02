// perspective-loader.ts
// This file now primarily acts as a single point of import for Perspective modules.

export const loadPerspective = async (): Promise<void> => {
  console.log("Starting Perspective library dynamic import...");
  try {
    // Dynamically import the core Perspective library first.
    // This typically sets up `window.perspective` and handles WASM loading internally.
    await import("@finos/perspective");
    console.log("@finos/perspective imported.");

    // Then import the viewer and plugins. These register custom elements
    // and integrate with the global `perspective` object.
    await import("@finos/perspective-viewer");
    console.log("@finos/perspective-viewer imported.");

    await import("@finos/perspective-viewer-datagrid");
    console.log("@finos/perspective-viewer-datagrid imported.");

    // If you need other plugins like d3fc:
    // await import("@finos/perspective-viewer-d3fc");
    // console.log("@finos/perspective-viewer-d3fc imported.");

    console.log("All Perspective modules dynamically imported.");
  } catch (error) {
    console.error("Error during Perspective module dynamic import:", error);
    // Rethrow to propagate the error to the component
    throw error;
  }
};
