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
  pass: number,
  fail: number,
  indicators: item<_C_indicator>[],
  entry: number,
  pnl: number
}

/*
export function prepare(analysis: ANALYSIS): TEST[] {
  let tests: TEST[] = [];
  for (const op of Object.keys(arithmetic)) 
    for (const cm of Object.keys(cmp))
      tests.push({pass: 0, fail: 0, indicators: [{sell: analysis.s_mean, ref: o(ops[op], analysis.b_mean, analysis.std), compare: cmp[cm], weight: 1}], entry: 0});
  return tests;
}*/

export function backtest<T extends _C_indicator>(cdls: KLine[], analysis: ANALYSIS, leverage: number, position: _T_POSITION, cases: TEST[]) {
  try {
    for (const candle of cdls) {
      for (var i = 0; i < cases.length; i++) {            // for each test case
        const candle_inter = position == _T_POSITION.LONG ? cases[i].entry ? {...candle, close: candle.high} : {...candle, close: candle.low} : cases[i].entry ? {...candle, close: candle.low} : {...candle, close: candle.high};
        let score = 0;
        for (const indicator of cases[i].indicators) {    // for each indicator within the test case
          const ind_extreme = indicator.ind.computeNext(true, candle_inter)
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
              break
          }
          indicator.ind.computeNext(false, candle);
        }

        if (cases[i].entry && position == _T_POSITION.LONG) {
          if ((candle_inter.close/cases[i].entry - 1)*leverage <= protection_ratio) {
            cases[i].entry = 0;
            cases[i].fail++;
          }
        } else if (cases[i].entry && position == _T_POSITION.SHORT) {
          if ((1-candle_inter.close/cases[i].entry)*leverage <= protection_ratio) {
            cases[i].entry = 0;
            cases[i].fail++;
          }
        }

        if (score > 80) {
          if (cases[i].entry) {
            const pnl = position == _T_POSITION.LONG ? (candle_inter.close/cases[i].entry - 1)*leverage : (1-candle_inter.close/cases[i].entry)*leverage;
            cases[i].pnl *= pnl;
            cases[i].entry = 0;
            cases[i].pass += pnl > 0 ? 1 : -1;
          }
          else cases[i].entry = candle_inter.close;
        }
      }


    }

  } catch (e) {
    console.log(e.desc || e);
  }
}