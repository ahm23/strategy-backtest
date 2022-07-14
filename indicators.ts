import { KLine, TIMEFRAMES } from "./types";


export interface _C_indicator {
  compute: (start?: number, end?: number) => any;
  computeNext: (t: boolean, d?: KLine) => number;
  reset: (start: number, a: number[]) => void;
  getCache: () => number[][];
}

/*export class ma implements _C_indicator {
  constructor(getKline: KLine) {

  }

  reset() {}

  compute(start?: number, end?: number) {

  }

  computeNext() {

    return 0;
  }

  getCache() {}
}*/

export class rsi implements _C_indicator {
  private length: number;
  private MA_U: number = 0;
  private MA_D: number = 0;
  private candle: KLine[];
  private frame: TIMEFRAMES;
  private time: number = new Date().getTime();
  private busy: boolean = false;

  testb: number = 0;
  private cache: number[][];

  constructor(public getKline: (frame: TIMEFRAMES, start: number, end: number) => Promise<KLine[]>, args?: number[]) {
    if (args) this.setParameters(args);
  }

  private setParameters(args: number[]) {
    this.frame = args[0];
    this.length = args[1];
  }

  compute(end?: number) {
    
  }

  computeNext = (theory: boolean, data?: KLine): number => {
    if (this.isBusy()) throw 0;
    //if (this.length == 25) console.log(this.MA_U, this.MA_D)
    var MA_U = this.MA_U, MA_D = this.MA_D;
    //if (this.length == 25 && this.testb === 5) {console.log(MA_U, MA_D); this.testb++;}
    //else this.testb++;
    if (data) {
      MA_U = (MA_U*(this.length-1)+(data.close > data.open ? data.close/data.open - 1 : 0))/this.length;
      MA_D = (MA_D*(this.length-1)+(data.close < data.open ? 1 - data.close/data.open : 0))/this.length;
    } else {
      if (this.cache.length) this.time += this.frame;
      var result = this.getKline(this.frame, this.time, this.time)[0];
      MA_U = (MA_U*(this.length-1)+(result.close > result.open ? result.close/result.open - 1 : 0))/this.length;
      MA_D = (MA_D*(this.length-1)+(result.close < result.open ? 1 - result.close/result.open : 0))/this.length;
      if (theory && this.cache.length > 1) this.time -= this.frame;
    }
    let rsi: number = MA_D == 0 ? 0 : 100 - 100/(1+MA_U/MA_D);
    if (!theory) {
      this.MA_U = MA_U;
      this.MA_D = MA_D;
      this.cache.push([this.time, rsi]);
    }
    return rsi;
  }

  reset(start: number, args: number[]) {
    this.testb = 0;
    this.busy = true;
    this.MA_U = 0;
    this.MA_D = 0;
    const pre = 50;
    this.cache = [];
    this.setParameters(args);
    this.time = start - start%this.frame;
    start = start - (pre+this.length)*this.frame;
    let result = this.getKline(this.frame, start, this.time)    // good
    for (var i = 0; i < this.length; i++) {
      if (result[i].close > result[i].open) this.MA_U += result[i].close/result[i].open - 1;
      else this.MA_D += 1 - result[i].close/result[i].open;
    }
    this.MA_U /= this.length;
    this.MA_D /= this.length;
    for (var i = this.length; i < pre + this.length; i++) {
      this.MA_U = (this.MA_U*(this.length-1)+(result[i].close > result[i].open ? result[i].close/result[i].open - 1 : 0))/this.length;
      this.MA_D = (this.MA_D*(this.length-1)+(result[i].close < result[i].open ? 1 - result[i].close/result[i].open : 0))/this.length;
    }
    this.busy = false;
  }

  isBusy = () => this.busy;
  getCache = () => this.cache;
}


export class srsi {
  constructor(getKline: () => KLine) {

  }

  compute() {
  }

  computeNext() {

  }
}
