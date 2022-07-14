import { ERROR } from './commons';

export enum ops {
  nil,
  add,
  sub,
  mul,
  div
}
export enum arithmetic {
  nil = ops.nil,
  add = ops.add,
  sub = ops.sub
}
export enum scaling {
  mul = ops.add,
  div = ops.div
}
export enum cmp {
  eq,
  gte,
  lte
}
export const avg = (vals: number[]) => vals.reduce((acc,v,i,a)=>(acc+v/a.length),0);
export const o = (t: ops, ref: number, val: number): number => {
  switch (t) {
    case ops.add: return ref + val;
    case ops.sub: return ref - val;
    case ops.mul: return ref * val;
    case ops.div: return ref * val;
    case ops.nil: return ref;
    default: throw {code: 0, severity: 0, desc: "Invalid Operation"} as ERROR;
  }
}
export const c = (t: cmp, ref: number, val: number): boolean => {
  switch (t) {
    case cmp.eq: return val == ref;
    case cmp.gte: return val >= ref;
    case cmp.lte: return val <= ref;
    default: throw {code: 0, severity: 0, desc: "Invalid Comparison"} as ERROR;
  }
}