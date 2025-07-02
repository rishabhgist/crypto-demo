import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import { useDashboard } from "@/contexts/DashboardContext";

const generateMockCandles = (
  count: number
): [number, number, number, number, number][] => {
  const candles: [number, number, number, number, number][] = [];
  let timestamp = Date.now() - count * 60 * 1000;
  let price = 100;

  for (let i = 0; i < count; i++) {
    const open = price;
    const close = open + (Math.random() - 0.5) * 2;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    candles.push([
      timestamp,
      parseFloat(open.toFixed(2)),
      parseFloat(high.toFixed(2)),
      parseFloat(low.toFixed(2)),
      parseFloat(close.toFixed(2)),
    ]);
    timestamp += 60 * 1000;
    price = close;
  }

  return candles;
};

const PriceChartPanel: React.FC = () => {
  const { state } = useDashboard();
  const { theme } = state;
  const [data, setData] = useState<[number, number, number, number, number][]>(
    []
  );

  useEffect(() => {
    const mockData = generateMockCandles(200);
    setData(mockData);
  }, []);

  const isDark = theme === "dark";

  const chartOptions: Highcharts.Options = useMemo(
    () => ({
      chart: {
        backgroundColor: "#00000000",
        style: {
          color: isDark ? "#ffffff" : "#000000",
        },
      },
      title: {
        text: "Price History",
        style: { color: isDark ? "#ffffff" : "#000000" },
      },
      rangeSelector: {
        selected: 1,
        inputStyle: {
          color: isDark ? "#ffffff" : "#000000",
          backgroundColor: isDark ? "#2c2c2c" : "#ffffff",
        },
        labelStyle: {
          color: isDark ? "#ffffff" : "#000000",
        },
      },
      xAxis: {
        type: "datetime",
        labels: {
          style: { color: isDark ? "#ffffff" : "#000000" },
        },
      },
      yAxis: {
        title: {
          text: "Price",
          style: { color: isDark ? "#ffffff" : "#000000" },
        },
        labels: {
          style: { color: isDark ? "#ffffff" : "#000000" },
        },
      },
      tooltip: {
        backgroundColor: isDark ? "#2c2c2c" : "#ffffff",
        style: {
          color: isDark ? "#ffffff" : "#000000",
        },
      },
      series: [
        {
          type: "candlestick",
          name: "Price Data",
          data,
          color: "#e74c3c", // 🔴 Red for down
          upColor: "#2ecc71", // 🟢 Green for up
          lineColor: isDark ? "#cccccc" : "#333333",
          upLineColor: isDark ? "#cccccc" : "#333333",
          tooltip: {
            valueDecimals: 2,
          },
        },
      ],
    }),
    [data, isDark]
  );

  return (
    <div className="bg-transparent h-full">
      <HighchartsReact
        key={theme}
        highcharts={Highcharts}
        constructorType="stockChart"
        options={chartOptions}
      />
    </div>
  );
};

export default PriceChartPanel;
