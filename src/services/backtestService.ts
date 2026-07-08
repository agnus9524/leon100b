
export interface BacktestResult {
  totalReturn: number;
  winRate: number;
  trades: number;
  chartData: { date: string; value: number }[];
}

export interface Strategy {
  name: string;
  indicators: string[];
  conditions: {
    buy: string;
    sell: string;
  };
}

export const runBacktest = async (strategy: Strategy, days: number = 30): Promise<BacktestResult> => {
  // Simple simulation of backtesting
  // In a real app, this would fetch historical data and evaluate conditions
  
  const initialValue = 10000000;
  let currentValue = initialValue;
  const chartData = [];
  let winCount = 0;
  let tradeCount = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Random market movement simulation
    const dailyChange = (Math.random() - 0.45) * 0.02; // Slightly bullish bias
    currentValue = currentValue * (1 + dailyChange);
    
    chartData.push({
      date: date.toLocaleDateString(),
      value: Math.floor(currentValue)
    });

    if (Math.random() > 0.7) {
      tradeCount++;
      if (dailyChange > 0) winCount++;
    }
  }

  return {
    totalReturn: ((currentValue - initialValue) / initialValue) * 100,
    winRate: tradeCount > 0 ? (winCount / tradeCount) * 100 : 0,
    trades: tradeCount,
    chartData
  };
};
