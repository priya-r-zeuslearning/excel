"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var grid_1 = require("./core/grid");
window.addEventListener("DOMContentLoaded", function () {
    var canvas = document.getElementById("excelCanvas");
    new grid_1.Grid(canvas);
});
