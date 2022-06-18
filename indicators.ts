import { KLine, TIMEFRAMES } from "./types";


export interface _C_indicator {
  compute: (start?: number, end?: number) => any;
  computeNext: (t: boolean, d?: KLine) => number;
  reset: (start: number, a: number[]) => void;
}

export class ma implements _C_indicator {
  constructor(getKline: KLine) {

  }

  reset() {}

  compute(start?: number, end?: number) {

  }

  computeNext() {

    return 0;
  }
}

export class rsi {
  private length: number;
  private MA_U: number = 0;
  private MA_D: number = 0;
  private candle: KLine[];
  private frame: TIMEFRAMES;
  private time: number = new Date().getTime();

  private cache: number[][] = [];

  constructor(public getKline: (frame: TIMEFRAMES, start: number, end: number) => KLine[], args?: number[]) {
    if (args) this.setParameters(args);
  }

  private setParameters(args: number[]) {
    this.frame = args[0];
    this.length = args[1];
  }

  compute(end?: number) {
    
  }

  computeNext(theory: boolean, data?: KLine) {
    let MA_U = this.MA_U, MA_D = this.MA_D;
    if (data) {
      MA_U = (MA_U*(this.length-1)+(data.close > data.open ? data.close/data.open - 1 : 0))/this.length;
      MA_D = (MA_D*(this.length-1)+(data.close < data.open ? 1 - data.close/data.open : 0))/this.length;
    } else {
      this.time += this.frame;
      let result = this.getKline(this.frame, this.time, this.time)[0];
      MA_U = (MA_U*(this.length-1)+(result.close > result.open ? result.close/result.open - 1 : 0))/this.length;
      MA_D = (MA_D*(this.length-1)+(result.close < result.open ? 1 - result.close/result.open : 0))/this.length;
    }
    let rsi = MA_D == 0 ? 0 : 100 - 100/(1+MA_U/MA_D);
    if (!theory) {
      this.MA_U = MA_U;
      this.MA_D = MA_D;
      this.cache.push([this.time, rsi]);
    }
    return rsi;
  }

  reset(start: number, args: number[]) {
    const pre = 100;
    this.setParameters(args);
    this.time = start - start%this.frame;
    start = start - (pre+this.length)*this.frame;
    let result = this.getKline(this.frame, start, this.time);
    for (var i = 0; i < this.length; i++) {
      if (result[i].close > result[i].open) this.MA_U += result[i].close/result[i].open - 1;
      else this.MA_D += 1 - result[i].close/result[i].open;
    }
    this.MA_U /= this.length;
    this.MA_D /= this.length;
    for (var i = this.length; i <= pre + this.length; i++) {
      this.MA_U = (this.MA_U*(this.length-1)+(result[i].close > result[i].open ? result[i].close/result[i].open - 1 : 0))/this.length;
      this.MA_D = (this.MA_D*(this.length-1)+(result[i].close < result[i].open ? 1 - result[i].close/result[i].open : 0))/this.length;
    }
  }
}


export class srsi {
  constructor(getKline: () => KLine) {

  }

  compute() {
  }

  computeNext() {

  }
}
