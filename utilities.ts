import { TIMEFRAMES } from "./types";


export const floor_tf = (frame: TIMEFRAMES, timestamp: number): number => timestamp - timestamp%frame;