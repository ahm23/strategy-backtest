import { queryDB } from "./db";
import { KLine, KLineCollection, TIMEFRAMES } from "./types";
import { floor_tf } from "./utilities";


class CandleManager {
  loading: boolean = false;
  candles: KLineCollection = {};
  private s: number = 0;
  private e: number = 0;

  constructor(private symbol: string) {

  }

  async loadCandles(frame: TIMEFRAMES, start: number, end: number) {
    this.loading = true;
    start = floor_tf(frame, start); end = floor_tf(frame, end);
    let raw: KLine[] = await queryDB(this.symbol, frame, start, end);
    for (const candle of raw) this.candles[candle.open_time] = candle;
    this.loading = false;
    console.log(this.candles)
  }
}

console.log("un un un");

var test = new CandleManager("BTCUSDT");

test.loadCandles(TIMEFRAMES["15m"], 1654819200410, 1655074800002);


