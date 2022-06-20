import { queryDB } from "./db";
import { srsi, rsi, _C_indicator } from "./indicators";
import { KLine, KLineCollection, RESULT, TIMEFRAMES } from "./types";
import { ARG, _T_ARGS, _T_COMPARE, _T_BOUND, _T_POSITION } from "./types";
import { floor_tf } from "./utilities";

interface data_set {
  data: number[],
  refined: number[],
  mean: number,
  precision: number,    // False = Outside of 1.5 IQR
  std: number
}


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
      {type: _T_ARGS.num_p_nz, b_l: 3, b_u: 300}
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

function waitfor(test, expectedValue, msec, count, source, callback) {
  // Check if condition met. If not, re-check later (msec).
  while (test() !== expectedValue) {
      count++;
      setTimeout(function() {
          waitfor(test, expectedValue, msec, count, source, callback);
      }, msec);
      return;
  }
  // Condition finally met. callback() can be executed.
  console.log(source + ': ' + test() + ', expected: ' + expectedValue + ', ' + count + ' loops.');
  callback();
}

class CandleManager {
  private loading: boolean = false;
  candles: KLineCollection = {};
  private s: number = 0;
  private e: number = 0;
  //private lowest: number = new Date().getTime();
  //private highest: number = new Date().getTime();

  constructor(private symbol: string) {

  }

  async loadCandles(frame: TIMEFRAMES, start: number, end: number) {
    console.log("STATUS | Loading Candles from T:", start, "to T:", end);
    this.loading = true;
    if (!this.candles[frame]) {
      this.candles[frame] = {
        lowest: new Date().getTime(),
        highest: new Date().getTime()
      }
    }
    start = floor_tf(frame, start); end = floor_tf(frame, end);
    let raw: KLine[] = await queryDB(this.symbol, frame, start, end);
    if (raw[0].open_time < this.candles[frame].lowest) this.candles[frame].lowest = raw[0].open_time;
    if (raw[raw.length - 1].open_time > this.candles[frame].highest) this.candles[frame].highest = raw[raw.length - 1].open_time;
    for (const candle of raw) { this.candles[frame][candle.open_time] = candle; };
    this.loading = false;
  }

  getCandles = (frame: TIMEFRAMES, start: number, end: number): KLine[] => {
    let collector: KLine[] = [];
    start -= start%frame; end -= end%frame;
    for (var i = 0; i <= (end - start)/frame; i++) {
      if (this.candles[frame][start+i*frame])
        collector.push(this.candles[frame][start+i*frame]);
      else {
        if (this.candles[frame].lowest > start) {
          this.loadCandles(frame, start, this.candles[frame].lowest);
          this.candles[frame].lowest = start;
        } else if (this.candles[frame].highest < end) {
          this.loadCandles(frame, this.candles[frame].highest, end);
          this.candles[frame].highest = end;
        } else {
          this.loadCandles(frame, start+i*frame, start+i*frame);
        }
        for(;this.loading == true;) {}
        if (this.candles[frame][start+i*frame])
          collector.push(this.candles[frame][start+i*frame]);
        else {
          const p = this.candles[frame][start+(i-1)*frame] || null;
          console.warn("WARN | Missing Candle Data @ T:", start+i*frame);     // system would get choked upon mass missing candles, but that's ok.
          collector.push({ open_time: start+i*frame,
            close_time: start+(i+1)*frame - 1,
            open: p.close || 0,
            close: p.close || 0,
            high: p.close || 0,
            low: p.close || 0} as KLine);
        }
      }
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

function eliminateOutliers(data: number[]): number[] {
  data.sort((n1,n2) => n1 - n2);
  let q1_p = (data.length+1)*0.25;
  let k1 = Math.floor(q1_p);
  const Q1 = data[k1-1]+(q1_p - k1)*(data[k1]-data[k1-1]);
  let q3_p = (data.length+1)*0.75;
  let k3 = Math.floor(q1_p);
  const Q3 = data[k3-1]+(q3_p - k3)*(data[k3]-data[k3-1]);

  let r_dat: number[] = [];
  for (const d of data)
    if (d > Q1-1.5*(Q3-Q1) && d < Q3+1.5*(Q3-Q1)) r_dat.push(d);
    //else console.log(d);
  return r_dat;
}

function stdDeviation(data: number[]) {
  const mean = data.reduce((acc,v,i,a)=>(acc+v/a.length),0);
  let deviation = 0;
  for (const d of data) deviation += (d-mean)**2;
  return (deviation / (data.length-1))**(1/2);
}


async function main() {
  await candles.loadCandles(TIMEFRAMES["15m"], 1651363200000, 1654041600000);
  
  let start = 1651881600000;
  let end = 1654041600000;
  let count = (end - start)/TIMEFRAMES["15m"];

  let tests: number[][] = generateTestCases(INDICATORS.RSI);
  let ind = new INDICATORS.RSI.c(candles.getCandles);
  let [peak, trough] = await analyzePatterns(TIMEFRAMES["15m"], start, end);
  //ind.reset(1654819200410, [TIMEFRAMES["15m"], ...tests[0]]);




  
  //console.log(vals_l, vals_s)

  //console.log(ind.getCache()) Debug RSI Values [in case I mess with the math]
  
  for (const test of tests) {
    ind.reset(start, [TIMEFRAMES["15m"], ...test]);
    let vals_l: data_set = {data: [] as number[]} as data_set;
    let vals_s: data_set = {data: [] as number[]} as data_set;
  
    for (var i = start; i < end; i += TIMEFRAMES["15m"]) {
      try {
        if (i in peak) {
          let candle = candles.getCandles(TIMEFRAMES["15m"],i,i)[0];
          candle.close = candle.high;
          vals_s.data.push(ind.computeNext(true, candle));
        } else if (i in trough) {
          let candle = candles.getCandles(TIMEFRAMES["15m"],i,i)[0];
          candle.close = candle.low;
          vals_l.data.push(ind.computeNext(true, candle));
        }
        ind.computeNext(false);
      } catch (e) {
        i -= TIMEFRAMES["15m"]
        //await new Promise(r => setTimeout(r, 1)); 
      }
    }
  
    [vals_l.refined, vals_s.refined] = [eliminateOutliers(vals_l.data), eliminateOutliers(vals_s.data)];
    [vals_l.precision, vals_s.precision] = [vals_l.refined.length / vals_l.data.length, vals_s.refined.length / vals_s.data.length];
    [vals_l.std, vals_s.std] = [stdDeviation(vals_l.refined), stdDeviation(vals_s.refined)];
    [vals_l.mean, vals_s.mean] = [vals_l.refined.reduce((acc,v,i,a)=>(acc+v/a.length),0), vals_s.refined.reduce((acc,v,i,a)=>(acc+v/a.length),0)]
    
    if (vals_l.mean - vals_l.std > vals_s.mean + vals_s.std || vals_l.mean + vals_l.std < vals_s.mean - vals_s.std) {
      console.log("\n-------------- RSI Parameters [" + test.join(',') + "] -----------------");
      console.log("RSI Average  : ", "[LONG] ", vals_l.mean, "[SHORT] ", vals_s.mean);
      console.log("IQR Precision: ", "[LONG] ", vals_l.precision*100, "[SHORT] ", vals_s.precision*100);
      console.log("STD Deviation: ", "[LONG] ", vals_l.std, "[SHORT] ", vals_s.std);
    } else {
      console.log("\n----------- RSI Parameters [" + test.join(',') + "] INVALID --------------");
    }
    

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


