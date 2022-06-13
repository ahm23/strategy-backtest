"use strict";
exports.__esModule = true;
exports.queryDB = void 0;
var mysql = require('mysql2');
var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "crypto",
    port: 3307
});
conn.connect(function (err) {
    if (err)
        throw err;
    console.log("SUCCESS | Connected to Database Server.");
});
function queryDB(symbol, frame, start, end, cb) {
    var QUERY = "SELECT open_time, open, close\n  FROM data_kline \n  INNER JOIN link_pair_timeframe link ON data_kline.pnt = link.id_pnt \n  INNER JOIN root_pairs p ON link.pair = p.id_pair AND p.symbol=\"" + symbol + "\" \n  INNER JOIN root_timeframes tf ON link.timeframe = tf.id_timeframe WHERE tf.time_len = " + frame + " AND open_time >= " + start + " AND open_time <= " + end + " ORDER BY open_time";
    return new Promise(function (resolve, reject) {
        conn.query(QUERY, function (err, result, fields) {
            if (err)
                reject(err);
            resolve(result);
            if (cb)
                cb(result);
        });
    });
}
exports.queryDB = queryDB;
