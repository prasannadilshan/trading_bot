import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Chart } from './Chart';
import type { CandleData } from './Chart';
import { Activity, Clock, DownloadCloud } from 'lucide-react';
import type { Time } from 'lightweight-charts';

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

export const TradingDashboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [data, setData] = useState<CandleData[]>([]);
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);
  
  // Loading & State
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Pagination State
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [earliestTime, setEarliestTime] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const symbol = 'BTCUSDT';
  
  const startTimeLimit = Date.now() - 365 * 24 * 60 * 60 * 1000; // exactly 12 months ago

  const fetchInitialData = useCallback(async (interval: string) => {
    setLoading(true);
    setErrorMsg(null);
    setEarliestTime(null);
    setProgress(0);

    try {
      // We just fetch the latest 1000 candles initially so the chart renders instantly
      const response = await axios.get('https://api.binance.com/api/v3/klines', {
        params: {
          symbol,
          interval,
          limit: 1000,
        },
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid data format from Binance');
      }

      if (response.data.length > 0) {
        setEarliestTime(response.data[0][0]);
      }

      const formattedData: CandleData[] = response.data.map((d: any) => ({
        time: (d[0] / 1000) as Time,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
      }));

      // Ensure data is strictly sorted by time
      formattedData.sort((a, b) => (a.time as number) - (b.time as number));

      setData(formattedData);
    } catch (error: any) {
      console.error('Error fetching historical data:', error);
      setErrorMsg(error.message || 'Failed to fetch chart data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreviousData = async () => {
    if (!earliestTime || loadingMore) return;
    setLoadingMore(true);
    setErrorMsg(null);
    
    let currentEndTime = earliestTime - 1;
    let newKlines: any[] = [];
    const MAX_REQUESTS = 20; // 20,000 candles per click

    try {
      for (let i = 0; i < MAX_REQUESTS; i++) {
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
           params: { symbol, interval: timeframe, endTime: currentEndTime, limit: 1000 },
        });

        if (!Array.isArray(response.data) || response.data.length === 0) break;
        
        newKlines = [...response.data, ...newKlines];
        currentEndTime = response.data[0][0] - 1;
        
        setProgress(Math.round(((i + 1) / MAX_REQUESTS) * 100));

        if (currentEndTime <= startTimeLimit || response.data.length < 1000) break;

        // Rate limit protection - Wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Filter out data before exactly 12 months if we overshot
      newKlines = newKlines.filter((d) => d[0] >= startTimeLimit);

      if (newKlines.length > 0) {
        setEarliestTime(newKlines[0][0]);
        const formattedNewData: CandleData[] = newKlines.map((d: any) => ({
          time: (d[0] / 1000) as Time,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));
        
        formattedNewData.sort((a, b) => (a.time as number) - (b.time as number));
        
        setData(prev => [...formattedNewData, ...prev]);
      }
    } catch(err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error loading more data');
    } finally {
      setLoadingMore(false);
      setProgress(0);
    }
  };

  const connectWebSocket = useCallback((interval: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const kline = message.k;

      if (kline) {
        const candle: CandleData = {
          time: (kline.t / 1000) as Time,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
        };
        setCurrentCandle(candle);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    fetchInitialData(timeframe);
    connectWebSocket(timeframe);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [timeframe, fetchInitialData, connectWebSocket]);

  // Can we load more?
  const canLoadMore = earliestTime && earliestTime > startTimeLimit && !loading && !errorMsg;

  return (
    <div className="flex flex-col h-[700px] w-full bg-[#16171d] text-white p-6 rounded-2xl shadow-2xl border border-[#2e303a]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              BTC / USDT
            </h2>
            <p className="text-sm text-gray-400">Binance Real-Time</p>
          </div>
        </div>
        
        <div className="flex items-center bg-[#1f2028] p-1 rounded-lg border border-[#2e303a] shadow-inner">
          <Clock className="w-4 h-4 text-gray-400 ml-2 mr-1" />
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                timeframe === tf.value
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'text-gray-400 hover:text-white hover:bg-[#2e303a]'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-[#0b0c10] rounded-xl overflow-hidden border border-[#2e303a] relative shadow-inner flex flex-col">
        
        {/* Top Bar for Loading More */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          {canLoadMore && !loadingMore && (
            <button 
              onClick={loadPreviousData}
              className="flex items-center gap-2 bg-[#2e303a]/80 hover:bg-[#3f4150] backdrop-blur-md text-gray-300 px-4 py-2 rounded-lg shadow-lg border border-[#3f4150] transition-colors text-sm font-medium"
            >
              <DownloadCloud className="w-4 h-4" />
              Load Previous Data
            </button>
          )}

          {loadingMore && (
            <div className="flex items-center gap-3 bg-[#1f2028]/90 backdrop-blur-md border border-[#2e303a] px-4 py-2 rounded-lg shadow-lg w-64">
              <span className="text-sm text-gray-300 font-medium whitespace-nowrap">Fetching...</span>
              <div className="w-full bg-[#0b0c10] rounded-full h-2.5 overflow-hidden border border-[#2e303a]">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-xs text-blue-400 font-mono">{progress}%</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm transition-opacity duration-300">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {errorMsg && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0b0c10]/90">
            <div className="text-red-500 font-bold text-lg mb-2">Failed to load chart data</div>
            <div className="text-gray-400">{errorMsg}</div>
            <button onClick={() => fetchInitialData(timeframe)} className="mt-4 px-4 py-2 bg-[#2e303a] rounded hover:bg-gray-700">Retry</button>
          </div>
        )}

        <Chart data={data} currentCandle={currentCandle} />
      </div>
    </div>
  );
};
