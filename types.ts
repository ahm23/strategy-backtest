

export enum TIMEFRAMES {
  "1M" = 2629800000,
  "1W" = 604800000,
  "1D" = 86400000,
  "4h" = 14400000,
  "1h" = 3600000,
  "15m" = 900000,
  "5m" = 300000,
  "1m" = 60000
}

export interface KLine {
  open_time: number,
  close_time: number,
  open: number,
  close: number,
  high: number,
  low: number
}

export interface KLineCollection {
  [k: number]: KLine
}

export enum _T_ARGS {
  num,
  num_p,
  num_n,
  num_p_nz,
  num_n_nz,
  dec,
  dec_p,
  dec_n
}

export enum _T_COMPARE {
  value,
  kline
}

export enum _T_POSITION {
  LONG,
  SHORT
}

export enum _T_BOUND {
  unbound,
  bound,
  floor
}

export interface ARG {
  type: _T_ARGS,
  b_l: number,
  b_u: number
}

export interface RESULT {
  mean: number,
  std: number
  accuracy: number
}