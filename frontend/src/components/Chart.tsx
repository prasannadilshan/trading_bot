import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { ISeriesApi, Time } from 'lightweight-charts';

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartProps {
  data: CandleData[];
  currentCandle?: CandleData | null;
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

export const Chart: React.FC<ChartProps> = ({
  data,
  currentCandle,
  colors: {
    backgroundColor = '#16171d',
    textColor = '#9ca3af',
  } = {},
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      grid: {
        vertLines: { color: '#2e303a' },
        horzLines: { color: '#2e303a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      }
    });

    chart.timeScale().fitContent();

    const newSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    seriesRef.current = newSeries;
    
    // Set initial data
    if (data && data.length > 0) {
       newSeries.setData(data);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, backgroundColor, textColor]);
  
  // Handle realtime updates
  useEffect(() => {
     if (seriesRef.current && currentCandle) {
         seriesRef.current.update(currentCandle);
     }
  }, [currentCandle]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full h-full min-h-[500px]"
    />
  );
};
