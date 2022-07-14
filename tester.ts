import { arithmetic, c, cmp, o, ops } from "./deep";
import { _C_indicator } from "./indicators";
import { KLine, ANALYSIS, POSITION, _T_POSITION } from "./types";

const protection_ratio: number = -0.125;

interface item<T extends _C_indicator> {
  ind: T;
  ref: number;
  sell: number;
  compare: cmp;
  weight: number;
}

interface TEST {
  pass: number;
  fail: number;
  indicators: item<_C_indicator>[];
  entry: number;
}

export function prepare(analysis: ANALYSIS): TEST[] {
  let tests: TEST[] = [];
  for (const op of Object.keys(arithmetic)) 
    for (const cm of Object.keys(cmp))
      tests.push({pass: 0, fail: 0, indicators: [{sell: analysis.s_mean, ref: o(ops[op], analysis.b_mean, analysis.std), compare: cmp[cm], weight: 1}], entry: 0});
  return tests;
}

export function backtest<T extends _C_indicator>(cdls: KLine[], analysis: ANALYSIS, leverage: number, position: _T_POSITION, cases: TEST[]) {
  let score = 0;
  try {
    if (!cases)
      cases = prepare(analysis);
    
    for (const candle of cdls) {
      //const ref = indic.map(ind => ind.computeNext(true, {close: close, open: candle.open} as KLine));   // wack
      for (var i = 0; i < cases.length; i++) {            // for each test case
        const close = position == _T_POSITION.LONG ? cases[i].entry ? {...candle, close: candle.high} : {...candle, close: candle.low} : cases[i].entry ? {...candle, close: candle.low} : {...candle, close: candle.high};
        let score = 0;
        for (const indicator of cases[i].indicators) {    // for each indicator within the test case
          const ind_extreme = indicator.ind.computeNext(true, close) 
          switch (indicator.compare) {          
            case cmp.gte:
              if (indicator.ref >= indicator.sell)                           // if there is an active position
                score += (cases[i].entry && ind_extreme < indicator.sell) || (!cases[i].entry && ind_extreme > indicator.ref) ? indicator.weight : 0;     // Implement Dynamic Sub-weight scaling.
              else
                score += (cases[i].entry && ind_extreme > indicator.sell) || (!cases[i].entry && ind_extreme > indicator.ref) ? indicator.weight : 0;     // Implement Dynamic Sub-weight scaling.
              break
            case cmp.lte:
              if (indicator.ref >= indicator.sell)                           // if there is an active position
                score += (cases[i].entry && ind_extreme < indicator.sell) || (!cases[i].entry && ind_extreme < indicator.ref) ? indicator.weight : 0;     // Implement Dynamic Sub-weight scaling.
              else
                score += (cases[i].entry && ind_extreme > indicator.sell) || (!cases[i].entry && ind_extreme < indicator.ref) ? indicator.weight : 0;     // Implement Dynamic Sub-weight scaling.
            break;
          }
        }
        
        if (cases[i].entry) {
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
      }


    }

  } catch (e) {
    console.log(e.desc || e);
  }
}

function validate(close: number, entry: number, leverage: number, tests: TEST[], ) {
  if (!entry) {
    for (const test in tests) {
      if (c(test.compare, ))
    }
    
  }
  if ((close/entry - 1)*leverage <= protection_ratio) return 0;

}