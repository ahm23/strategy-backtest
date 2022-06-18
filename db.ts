const mysql = require('mysql2');

import { KLine, TIMEFRAMES } from "./types";


const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "crypto",
  port: 3307
});

conn.connect(function(err) {
  if (err) throw err;
  console.log("SUCCESS | Connected to Database Server.");
});

export function queryDB(symbol: string, frame: TIMEFRAMES, start: number, end: number, cb?: (r: KLine[]) => void): Promise<KLine[]> {
  const QUERY = `SELECT *
  FROM data_kline 
  INNER JOIN link_pair_timeframe link ON data_kline.pnt = link.id_pnt 
  INNER JOIN root_pairs p ON link.pair = p.id_pair AND p.symbol="`+symbol+`" 
  INNER JOIN root_timeframes tf ON link.timeframe = tf.id_timeframe WHERE tf.time_len = ` + frame as string + ` AND open_time >= ` + start + ` AND open_time <= ` + end + ` ORDER BY open_time`;
  
  return new Promise((resolve, reject) => {
    conn.query(QUERY, function (err, result, fields) {
      if (err) reject(err);
      resolve(result as KLine[]);
      if (cb) cb(result as KLine[]);
    });
  });
}