"use strict";

var http = require('http'),
        express = require('express'),
        path = require('path');

var app = express();

//configure the express app
app.configure(function () {
    app.use(express.static(__dirname));
    app.use(app.router);
});


//Start the server:
var port = 5000;
var server = http.createServer(app).listen(port, function () {
    console.log("express server listening on port " + port);
});
