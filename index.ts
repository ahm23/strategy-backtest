import { queryDB } from "./db";
import { srsi, rsi, _C_indicator } from "./indicators";
import { KLine, KLineCollection, RESULT, TIMEFRAMES } from "./types";
import { ARG, _T_ARGS, _T_COMPARE, _T_BOUND, _T_POSITION } from "./types";
import { floor_tf } from "./utilities";


interface INDICATOR_LIST {
  [k: string]: INDICATOR<_C_indicator>;
}

interface INDICATOR<T extends _C_indicator> {
  c: new (...args: any[]) => T;
  args: ARG[];
  compare: _T_COMPARE;
  max?: number,
  min?: number
}

const INDICATORS: INDICATOR_LIST = {
  RSI: {
    c: rsi,
    args: [
      {type: _T_ARGS.num_p_nz, b_l: 7, b_u: 50}
    ],
    compare: _T_COMPARE.value,
    max: 100,
    min: 0
  },
  SRSI: {
    c: rsi,
    args: [
      {type: _T_ARGS.num_p_nz, b_l: 1, b_u: 25},
      {type: _T_ARGS.num_p_nz, b_l: 1, b_u: 5}
    ],
    compare: _T_COMPARE.value,
    max: 100,
    min: 0
  }
}

class CandleManager {
  private loading: boolean = false;
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
    //console.log(this.candles)
  }

  getCandles = (frame: TIMEFRAMES, start: number, end: number): KLine[] => {
    //console.log(this.candles)
    let collector: KLine[] = [];
    start -= start%frame; end -= end%frame;
    for (var i = 0; i <= (end - start)/frame; i++) {
      if (this.candles[start+i*frame])
        collector.push(this.candles[start+i*frame]);
    }
    return collector;
  }
  isBusy() {
    return this.loading;
  }
}


function getArgIncrement(type: _T_ARGS): number {
  switch (type) {
    case _T_ARGS.num_p_nz:
      return 1;
    default: return 0;
  }
}


function generateArgCases(index: number, args: ARG[], append: number[]): number[][] {
  let cases: number[][] = [];
  for (var i = args[index].b_l; i <= args[index].b_u; i += getArgIncrement(args[index].type)) {
    if (index < args.length - 1)
      cases.push(...generateArgCases(index+1, args, [...append, i]));
    else
      cases.push([...append, i]);
  }
  return cases;
}


function generateTestCases<T extends _C_indicator>(indicator: INDICATOR<T>): number[][] {
  let discovery: RESULT[] = [];
  let cases: number[][] = [];
  cases = generateArgCases(0, indicator.args, []);
  return cases;
}

var candles = new CandleManager("BTCUSDT");

function analyzePatterns(frame: TIMEFRAMES, start: number, end: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    queryDB('BTCUSDT', frame, start, end, (result: KLine[]) => {
      let l = 14;
      var trend = result[l].close-result[0].close < 0 ? "Down" : "Up";
      var lock: string | boolean = false;
      var lock_end: number = 0;
      var tmp;
      let peaks = {}, troughs = {};
      for (var i = 1; i < result.length - l; i++) {
        if (!lock) {
          if (trend === "Up" && result[i+l].close-result[i].close < 0) {
            lock = "high";
            lock_end = i+l;
            tmp = result[i];
            trend = "Down";
            if (i > 3) i -= 3;
          } else if (trend === "Down" && result[i+l].close-result[i].close > 0) {
            lock = "low";
            lock_end = i+l;
            tmp = result[i];
            trend = "Up";
            if (i > 3) i -= 3;
          }
        } else {
          if (i == lock_end) {
            console.log( "["+(lock == "high" ? tmp.high : tmp.low)+"] " + (lock == "high" ? "Peak @ " : "Trough @ ") + new Date(tmp.open_time).toLocaleString());
            lock == "high" ? peaks[new Date(tmp.open_time).getTime()] = parseFloat(tmp.high) : troughs[new Date(tmp.open_time).getTime()] = parseFloat(tmp.low);
            lock = false;
          } else if ((lock === "low" && result[i].low < tmp.low) || (lock === "high" && (result[i].close > tmp.close || (result[i].high > tmp.high && result[i].close < result[i].open)))) {
            tmp = result[i];
            if (i+2 >= lock_end)
              lock_end++;
          }
        }
        // slope 14, flip slope -> lock endpoint, regress until lowest close.
      }
      resolve([peaks, troughs])
    });
  });

}

async function main() {
  await candles.loadCandles(TIMEFRAMES["15m"], 1654041600000, 1655074800002);
  
  let start = 1654819200410 - 1654819200410%TIMEFRAMES["15m"];
  let end = 1655074800002 - 1655074800002%TIMEFRAMES["15m"];
  let count = (end - start)/TIMEFRAMES["15m"];

  let tests: number[][] = generateTestCases(INDICATORS.RSI);
  let ind = new INDICATORS.RSI.c(candles.getCandles);
  let [peak, trough] = await analyzePatterns(TIMEFRAMES["15m"], 1654819200410, 1655074800002);
  ind.reset(1654819200410, [TIMEFRAMES["15m"], ...tests[0]]);

  let vals_l: number[] = [];
  let vals_s: number[] = [];

  for (var i = start; i < end; i += TIMEFRAMES["15m"]) {
    if (i in peak) {
      let candle = candles.getCandles(TIMEFRAMES["15m"],i,i)[0];
      candle.close = candle.high;
      vals_s.push(ind.computeNext(true, candle));
    } else if (i in trough) {
      let candle = candles.getCandles(TIMEFRAMES["15m"],i,i)[0];
      candle.close = candle.low;
      vals_l.push(ind.computeNext(true, candle));
    }
    ind.computeNext(false);
  }
  //console.log(vals_l, vals_s)

  //console.log(ind.getCache()) Debug RSI Values [in case I mess with the math]

  for (const test of tests) {
    //ind.reset(1654819200410, [TIMEFRAMES["15m"], ...test]);

  }
}

main()

/*
async function tester<T extends _C_indicator>(i: INDICATOR<T>, start: number, end: number) {
  let entry: number;
  let position: _T_POSITION | null = null;
  let money: number = 50;
  let leverage: number = 10;


  const data: KLine[] = candles.getCandles(start, end);
  
  let args: any[] = [candles.getCandles, null, start, end];
  let args_v: any[] = [];
  let cancel = false;
  let upper = i.max || null, lower = i.min || null;
  let type = upper && lower ? _T_BOUND.bound : lower ? _T_BOUND.floor : _T_BOUND.unbound;
  let increment = upper ? 0.01*upper : 1;
  
  let params = {
    gte: lower || 0
  }

  if (type == _T_BOUND.bound) params["lte"] = upper;  // verify upper is defined.

  var value: number;

  for (const t of i.argTypes)
    args_v.push(t.b_l);
  for (const e in TIMEFRAMES) {
    args[1] = [TIMEFRAMES[e]];
    let c: T = new i.c(...args, ...args_v);
    // long test
    while (!cancel) {
      for (let lv = params.gte; (type == _T_BOUND.bound && upper ? lv <= upper : true); lv += increment) {
        for (let uv = upper || params.gte + increment; uv > params.gte; uv -= increment) {
          for (const candle of data) {    // need to look more into RVGI mechanics
            let temp = candle;
            temp.close = candle.low;
            value = c.computeNext(true, temp);

          }
        }
      }
    }
  }
}
*/



console.log("un un un");




/*
function verify(time, price, position) {
  let close = 0;
  let long = 0;
  let short = 0;
  const max = 100;

  for (const i of Object.values(INDICATORS)) {
    //const pos = Math.floor((time-cache_st)/i.interval)+i.c_req;
    //var c_data = INDICATORS[i.c_type].cache.slice(pos - i.c_req, pos);
    //let result = i.f(...i.fparams, c_data[0][0], i.cache[i.c_req - 1][0], price, c_data);
    // update cache proceedure
    var data = 

    if (i.long.gte ? data[1] >= i.long.gte : i.long.lte ? data[1] <= i.long.lte : false) 
      long+=i.weight*max;
    if (i.short.gte ? data[1] >= i.short.gte : i.short.lte ? data[1] <= i.short.lte : false) 
      short+=i.weight*max;

    if (position == "long") 
      if (i.long.close.gte ? data[1] >= i.long.close.gte : i.long.close.lte ? data[1] <= i.long.close.lte : false) 
        close++;
    if (position == "short") 
      if (i.short.close.gte ? data[1] >= i.short.close.gte : i.short.close.lte ? data[1] <= i.short.close.lte : false) 
        close++;
  }

  if (close >= Object.keys(INDICATORS).length/2) return "close";
  if (long > max) long = max;
  if (short > max) short = max;

  if (position !== "long" && long - short > long/2) return "long";
  if (position !== "short" && short - long > short/2) return "short";
  
  return null;
}*/


//test.loadCandles(TIMEFRAMES["15m"], 1654819200410, 1655074800002);


