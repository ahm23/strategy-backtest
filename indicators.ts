import { KLine } from "./types";


export interface _C_indicator {
  compute: () => any;
  computeNext: (t: boolean, d?: KLine) => number;
}

export class ma implements _C_indicator {
  constructor(getKline: KLine) {

  }

  compute() {
  }

  computeNext() {

    return 0;
  }
}

export class rsi {
  constructor(getKline: KLine) {

  }

  compute() {
  }

  computeNext(theory: boolean, data?: KLine) {
    if (data) {

    }
    return 0;
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
