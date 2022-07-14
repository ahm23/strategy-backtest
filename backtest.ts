import { _C_indicator } from "./indicators";
import { KLine, POSITION } from "./types";

const protection_ratio: number = -0.125;
const profitable_ratio: number = 0.15;

interface data_analysis {
  data: number[],
  params: number[],
  refined: number[],
  mean: number,
  precision: number,    // False = Outside of 1.5 IQR
  std: number
}

interface confirmed {
  c: new (...args: any[]) => any;
  analysis: data_analysis;
}

interface test_case {
  success: number,
  failiure: number,
  compare: string,
  o: operation | null,
  p: POSITION
}


interface tester {
  gte_std: test_case,
  gte: test_case,
  lte: test_case,
  lte_std: test_case,
}

interface operation {
  value: number,
  action: string
}

interface r_long {
  args: any[],
  rate: number,
  compare: string,
  o: operation | null
}

export function backtest<T extends _C_indicator>(indic: T, cdls: KLine[], analysis, leverage) {
  let b_position = null;
  let b_entry = 0;
  let money = 50;
  let action, pnl;

  let results_l = [];

  var tester_l: test_case[] = [
    { success: 0, failiure: 0, compare: 'gte', o: { value: analysis.std, action: 'add' }, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'lte', o: { value: analysis.std, action: 'add' }, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'gte', o: { value: -analysis.std, action: 'add' }, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'lte', o: { value: -analysis.std, action: 'add' }, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'gte', o: null, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'lte', o: null, p: {type: null, entry: 0} }    
  ]

  let tester_s: test_case[] = [
    { success: 0, failiure: 0, compare: 'gte', o: { value: analysis.std, action: 'add' }, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'lte', o: { value: analysis.std, action: 'add' }, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'gte', o: { value: -analysis.std, action: 'add' }, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'lte', o: { value: -analysis.std, action: 'add' }, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'gte', o: null, p: {type: null, entry: 0} },
    { success: 0, failiure: 0, compare: 'lte', o: null, p: {type: null, entry: 0} }
  ]

  /*let s: tester = {
    gte_std: { success: 0, failiure: 0, o: {  }, p: {type: null, entry: 0} },
    lte_std: { success: 0, failiure: 0, p: {type: null, entry: 0} },
    gte: { success: 0, failiure: 0, p: {type: null, entry: 0} },
    lte: { success: 0, failiure: 0, p: {type: null, entry: 0} }
  } as tester;*/

  for (const b_data of cdls) {
    //let cdl = b_data;
    // test @ cdl high
    for (var z = 0; z < 2; z++) {
      let close = z == 0 ? b_data.low : b_data.high;
      //cdl.close = z == 0 ? b_data.low : b_data.high;
      const val = indic.computeNext(true, {close: close, open: b_data.open} as KLine);

      let tester = z == 0 ? tester_l : tester_s;

      for (var i = 0; i < tester.length; i++) {
        if (tester[i].p.entry !== 0 && z == 0) {
          if ((close/tester[i].p.entry - 1)*leverage >= profitable_ratio) {
            tester[i].p.entry = 0;
            tester[i].success++;
          } else if ((close/tester[i].p.entry - 1)*leverage <= protection_ratio) {
            tester[i].p.entry = 0;
            tester[i].failiure++;
          } else continue;
        } else if (tester[i].p.entry !== 0 && z == 1) {
          if ((1-close/tester[i].p.entry)*leverage >= profitable_ratio) {
            tester[i].p.entry = 0;
            tester[i].success++;
          } else if ((1-close/tester[i].p.entry)*leverage <= protection_ratio) {
            tester[i].p.entry = 0;
            tester[i].failiure++;
          } else continue;
        }
        //console.log(analysis.std)
        const o_val = tester[i].o?.value || 0;    // <-- to satisfy TSLint
        var compar = analysis.mean || 0;
        if (tester[i].o) {
          switch (tester[i].o?.action) {
            case 'add':
              compar += o_val
              break;
            case 'mult':
              compar *= o_val
              break;
          }
        }
        switch (tester[i].compare) {
          case 'gte':
            //console.log("PISS: ", val, analysis.mean, analysis.std, o_val, compar)
            if (val >= compar) tester[i].p.entry = close;
            break;
          case 'lte':
            if (val <= compar) tester[i].p.entry = close;
            break;
        }
      }
      if (z == 0) tester_l = tester;
      else tester_s = tester;
    }
    indic.computeNext(false);

    /*if (action) {
      var date = new Date(data.open_time);
      console.log("["+date.toLocaleString()+"]", action);
      if (action == 'close') {
        money += b_position == 'long' ? (money * (data.close / b_entry) - money) * leverage : b_position == 'short' ?  (money * (1 + 1 - data.close / b_entry) - money) * leverage : 0;
        b_position = null;
      }
      else if (action && b_position && action !== b_position) {
        money += b_position == 'long' ? (money * (data.close / b_entry) - money) * leverage : b_position == 'short' ?  (money * (1 + 1 - data.close / b_entry) - money) * leverage : 0;
        b_position = action;
        b_entry = data.close;
      } else {
        b_position = action;
        b_entry = data.close;
      }
      //continue;
    }
    /*action = func(parseInt(data.open_time), data.high, b_position);
    if (action) {
      if (action == 'close') pnl = b_position == 'long' ? (money * (data.high / entry) - money) * leverage : b_position == 'short' ?  (money * (1 + 1 - data.high / entry) - money) * leverage : 0;  
      else { b_position = action; b_entry = data.high; }
      continue;
    }*/
  }
  return [tester_l, tester_s];
}


