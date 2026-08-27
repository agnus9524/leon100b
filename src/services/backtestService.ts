import { kisService } from './kisService';

export interface BacktestResult {
  totalReturn: number;
  winRate: number;
  trades: number;
  chartData: {
    date: string;
    value: number;
  }[];
}

export interface Strategy {
  name: string;

  indicators: string[];

  conditions: {
    buy: string;
    sell: string;
  };

  explanation?: string;
}


interface ParsedStrategy {
  buyRSI: number;
  sellRSI: number;
  volumeMultiplier: number;
  stopLoss: number;
  takeProfit: number;
  useMACD: boolean;
  useVolume: boolean;
  useSMA: boolean;
}


interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function calculateEMA(
  prices: number[],
  period: number
): number[] {

  const result: number[] = [];

  const multiplier =
    2 / (period + 1);

  let ema = prices[0];

  result.push(ema);

  for (
    let i = 1;
    i < prices.length;
    i++
  ) {

    ema =
      (prices[i] - ema)
      * multiplier
      + ema;

    result.push(ema);
  }

  return result;
}

function calculateMACD(
  prices: number[]
) {

  const ema12 =
    calculateEMA(
      prices,
      12
    );

  const ema26 =
    calculateEMA(
      prices,
      26
    );

  const macd =
  prices.map(
    (_, i) =>
      (ema12[i] ?? 0)
      -
      (ema26[i] ?? 0)
  );

  const signal =
    calculateEMA(
      macd,
      9
    );

  return {
    macd,
    signal
  };
}


function calculateVolumeAverage(
  volumes: number[],
  period = 20
) {

  const result: number[] =
    [];

  for (
    let i = period - 1;
    i < volumes.length;
    i++
  ) {

    let sum = 0;

    for (
      let j =
        i - period + 1;
      j <= i;
      j++
    ) {
      sum += volumes[j];
    }

    result.push(
      sum / period
    );
  }

  return result;
}


function calculateRSI(
  prices: number[],
  period = 14
): number[] {

  const result: number[] = [];

  for (
    let i = period;
    i < prices.length;
    i++
  ) {

    let gains = 0;
    let losses = 0;

    for (
      let j = i - period + 1;
      j <= i;
      j++
    ) {

      const diff =
        prices[j] -
        prices[j - 1];

      if (diff > 0) {
        gains += diff;
      } else {
        losses += Math.abs(diff);
      }
    }

    const avgGain =
      gains / period;

    const avgLoss =
      losses / period;

    if (avgLoss === 0) {
      result.push(100);
      continue;
    }

    const rs =
      avgGain / avgLoss;

    result.push(
      100 -
      100 / (1 + rs)
    );
  }

  return result;
}

function calculateSMA(
  values: number[],
  period: number
): number[] {

  const result: number[] = [];

  for (
    let i = period - 1;
    i < values.length;
    i++
  ) {

    let sum = 0;

    for (
      let j = i - period + 1;
      j <= i;
      j++
    ) {
      sum += values[j];
    }

    result.push(
      sum / period
    );
  }

  return result;
}

function parseStrategy(
  strategy: Strategy
) {

 const buy =
  (strategy.conditions?.buy || '')
    .toUpperCase();

const sell =
  (strategy.conditions?.sell || '')
    .toUpperCase();

 
const buySellText =
  strategy.conditions?.buy + " " + strategy.conditions?.sell;
   

   
   const config: ParsedStrategy = {

  buyRSI: 40,
  sellRSI: 70,

  volumeMultiplier: 1.2,

  stopLoss: 5,
  takeProfit: 15,

  useMACD:
  (strategy.indicators || [])
    .includes("MACD"),

  useVolume: true,
  useSMA: buySellText.includes("SMA20")

};

  const buyRSIMatch =
    buy.match(
  /RSI.*?(\d+)/
);

  if (buyRSIMatch) {
    config.buyRSI =
      Number(
        buyRSIMatch[1]
      );
  }

  const sellRSIMatch =
    sell.match(
  /RSI.*?(\d+)/
);

  if (sellRSIMatch) {
    config.sellRSI =
      Number(
        sellRSIMatch[1]
      );
  }

 const stopLossMatch =
  (buy + " " + sell)
    .match(/손절\s*(\d+)/);

const takeProfitMatch =
  (buy + " " + sell)
    .match(/익절\s*(\d+)/);
	  
	  
const volumeMatch =
  (buy + " " + sell)
    .match(/거래량\s*(\d+)/);

if (volumeMatch) {
  config.volumeMultiplier =
    Number(volumeMatch[1]) / 100;
}

  if (stopLossMatch) {
    config.stopLoss =
      Number(
        stopLossMatch[1]
      );
  }

  

  if (takeProfitMatch) {
    config.takeProfit =
      Number(
        takeProfitMatch[1]
      );
  }

  return config;

}


export const runBacktest = async (
  strategy: Strategy,
  symbol: string = '005930'
): Promise<BacktestResult> => {

  const response =
    await kisService.getDomesticDailyPrice(
      symbol,
      'D'
    );
	
const config = parseStrategy(strategy);

  if (
    !response ||
    !Array.isArray(response.output)
  ) {
    throw new Error(
      'KIS 일봉 데이터 조회 실패'
    );
  }

  const candles: Candle[] =
  [...response.output]
    .reverse()
    .map((item: any) => ({

      date:
        item.stck_bsop_date,

      open:
        Number(item.stck_oprc),

      high:
        Number(item.stck_hgpr),

      low:
        Number(item.stck_lwpr),

      close:
        Number(item.stck_clpr),

      volume:
        Number(item.acml_vol)

    }));

  if (
  candles.length < 40
) {
  throw new Error(
    '백테스트용 데이터 부족 (최소 40개 이상 필요)'
  );
}


  const prices =
    candles.map(
      c => c.close
    );

  const rsi =
    calculateRSI(
      prices,
      14
    );

  const sma20 =
    calculateSMA(
      prices,
      20
    );
	

	const {
  macd,
  signal
} =
  calculateMACD(
    prices
  );

const volumes =
  candles.map(
    c => c.volume
  );

const volumeAvg20 =
  calculateVolumeAverage(
    volumes,
    20
  );

const feeRate =
  0.00015;

const taxRate =
  0.0018;	

	
  const initialCapital =
    10000000;

  let cash =
    initialCapital;

  let shares = 0;

  let buyPrice = 0;

  let tradeCount = 0;

  let winCount = 0;

  const chartData: {
    date: string;
    value: number;
  }[] = [];

  for (
  let i = 35;
  i < candles.length;
  i++
) {

    const price =
      candles[i].close;

    const currentRSI =
      rsi[i - 14] ?? 50;

    const currentSMA =
      sma20[i - 19] ?? price;

    const currentMACD =
  macd[i] ?? 0;

const currentSignal =
  signal[i] ?? 0;
	
const prevMACD =
  macd[i - 1] ?? 0;

const prevSignal =
  signal[i - 1] ?? 0;
	
const macdGoldenCross =

  prevMACD <= prevSignal &&

  currentMACD > currentSignal;
	
const macdDeadCross =

  prevMACD >= prevSignal &&

  currentMACD < currentSignal;


const currentVolume =
  candles[i].volume;

const avgVolume =
  volumeAvg20[
    i - 19
  ] ?? currentVolume;


const buySignal =

  currentRSI <
  config.buyRSI &&

 (
  !config.useMACD ||
  macdGoldenCross
) &&

  (
    !config.useVolume ||
    currentVolume >
    avgVolume *
    config.volumeMultiplier
  ) &&

  (
    !config.useSMA ||
    price > currentSMA
  );
	
  const stopLoss =
  buyPrice > 0 &&
  (
    (price - buyPrice)
    /
    buyPrice
  ) <=
  -(config.stopLoss / 100);

const takeProfit =
  buyPrice > 0 &&
  (
    (price - buyPrice)
    /
    buyPrice
  ) >=
  config.takeProfit / 100;

const macdSellCondition =
  !config.useMACD ||
  macdDeadCross;
	
const sellSignal =

  currentRSI >
  config.sellRSI ||

  (
    config.useMACD &&
    macdDeadCross
  ) ||

  (
    config.useSMA &&
    price < currentSMA
  ) ||

  stopLoss ||

  takeProfit;

    if (
      buySignal &&
      shares === 0
    ) {

shares =
  Math.floor(
    cash /
    (price * (1 + feeRate))
  );

      if (shares > 0) {

      

        buyPrice = price;

        cash -=

  shares *
  price *

  (1 + feeRate);
      }
    }

    if (
      sellSignal &&
      shares > 0
    ) {

     cash +=

  shares *
  price *

  (
    1 -
    feeRate -
    taxRate
  );

    const pnl =

  (
    price *
    (
      1 -
      feeRate -
      taxRate
    )

    -

    buyPrice *
    (
      1 +
      feeRate
    )

  ) * shares;

if (pnl > 0) {
  winCount++;
}
	tradeCount++;
      shares = 0;
    }

    const accountValue =
      cash +
      shares * price;

    chartData.push({
      date:
        candles[i].date,
      value:
        Math.round(
          accountValue
        )
    });
  }

  const lastPrice =
    candles[
      candles.length - 1
    ].close;

if (shares > 0) {


  const liquidationValue =

    shares *
    lastPrice *
    (
      1 -
      feeRate -
      taxRate
    );

  const finalPnl =

    liquidationValue

    -

    (
      shares *
      buyPrice *
      (
        1 +
        feeRate
      )
    );

  cash += liquidationValue;

  tradeCount++;

  if (finalPnl > 0) {
    winCount++;
  }

  shares = 0;
}

  const finalValue = cash;
  return {


    totalReturn:
      Number(
        (
          (
            finalValue -
            initialCapital
          )
          /
          initialCapital *
          100
        ).toFixed(2)
      ),

    winRate:
      tradeCount > 0
        ? Number(
            (
              winCount /
              tradeCount *
              100
            ).toFixed(1)
          )
        : 0,

    trades:
      tradeCount,

    chartData
  };
};
