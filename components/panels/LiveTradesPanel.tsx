"use client";

import React, { useEffect, useRef } from "react";

import "@finos/perspective";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer";
import "@finos/perspective-viewer/dist/css/themes.css";

import perspective from "@finos/perspective";
import perspective_viewer from "@finos/perspective-viewer";
import type * as psp from "@finos/perspective";

import SERVER_WASM_URL from "@finos/perspective/dist/wasm/perspective-server.wasm?url";
import CLIENT_WASM_URL from "@finos/perspective-viewer/dist/wasm/perspective-viewer.wasm?url";

if (!(window as any).__perspective_client_initialized) {
  perspective_viewer.init_client(fetch(CLIENT_WASM_URL));
  (window as any).__perspective_client_initialized = true;
}
// Schema definition
const SCHEMA: psp.Schema = {
  timestamp: "datetime",
  symbol: "string",
  price: "float",
  volume: "float",
};

// Simulated data
function generateMockRow(count = 20): any[] {
  const symbols = [
    "AAPL",
    "GOOG",
    "TSLA",
    "MSFT",
    "AMZN",
    "META",
    "NFLX",
    "NVDA",
    "AMD",
    "INTC",
    "IBM",
    "ORCL",
    "CRM",
    "UBER",
    "LYFT",
    "SHOP",
    "BABA",
    "T",
    "VZ",
    "DIS",
  ];
  const now = new Date();
  return Array.from({ length: count }, () => ({
    timestamp: new Date(now.getTime() + Math.floor(Math.random() * 1000)),
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    price: +(Math.random() * 1000).toFixed(2),
    volume: Math.floor(Math.random() * 1000),
  }));
}

const LiveMarketPanel: React.FC = () => {
  const viewerRef = useRef<any>(null); // direct reference to <perspective-viewer> DOM element

  useEffect(() => {
    let interval: any;

    const setup = async () => {
      await perspective.init_server(fetch(SERVER_WASM_URL));

      const worker = await perspective.worker();
      const table = await worker.table(SCHEMA);

      // Wait until <perspective-viewer> is defined in DOM
      if (viewerRef.current) {
        await viewerRef.current.load(table);
        viewerRef.current.restore({
          group_by: ["symbol"],
          columns: ["price", "volume"],
          sort: [["timestamp", "desc"]],
          plugin_config: {},
          theme: "material",
        });
      }

      interval = setInterval(() => {
        table.update(generateMockRow(200));
      }, 1000);
    };

    setup();

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ height: "100vh", padding: "10px" }}>
      <perspective-viewer
        ref={viewerRef}
        style={{ height: "100%", width: "100%" }}
        view="datagrid"
        plugin="datagrid"
      ></perspective-viewer>
    </div>
  );
};

export default LiveMarketPanel;
