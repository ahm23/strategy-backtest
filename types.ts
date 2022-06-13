

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