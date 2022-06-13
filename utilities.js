"use strict";
exports.__esModule = true;
exports.floor_tf = void 0;
var floor_tf = function (frame, timestamp) { return timestamp - timestamp % frame; };
exports.floor_tf = floor_tf;
