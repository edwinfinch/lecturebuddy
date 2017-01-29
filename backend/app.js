var mongojs = require("mongojs");
var database = mongojs("hypetrain:RubsArm@localhost/angel?authSource=angel", [ "users", "events" ]);

var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('/etc/nginx/ssl/rsakey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/nginx/ssl/rsa_chain.pem', 'utf8');

var credentials = {
    key: privateKey,
    cert: certificate
};
var express = require('express');
var app = express();

require('express-ws')(app);

var currentSession = {
    name: "fuck",
    sessionID: "SQZZY6",
    description: "fuck you",
    dataset: [ 0, 0, 0 ]
};

var connections = [];

function addConnection(data) {
    var index = -1;

    console.log("Add connection");

    for(var i = 0; i < connections.length; i++) {
        if (connections[i].userID == data.userID) {
            Object.assign(connections[i], data);
            index = i;
            break;
        }
    }
    if (index === -1) {
        connections.push(data);
        index = connections.length-1;
    }
    return connections[index];
}

//Set up the HTTPS connection
// var httpsServer = https.createServer(credentials, app);
// httpsServer.listen(777);

app.listen(777);

app.use(function (req, res, next) {
    //var allowedOrigins = ['https://web.lignite.me:8443/check_account/', 'https://web.lignite.me:8443/create_new/', 'https://web.lignite.me:8443', 'web.lignite.me:8443'];
    var origin = req.headers.origin ? req.headers.origin : req.headers.host;

    //console.log("req " + JSON.stringify(req.headers));
    //if(allowedOrigins.indexOf(origin) > -1){
    res.setHeader('Access-Control-Allow-Origin', origin);
    //}
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    return next();
});

function generateID() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i = 0; i < 6; i++){
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text.toUpperCase();
}

app.param('userID', function (req, res, next, userID) {
    req.userID = userID || null;
    return next();
});

function refreshConnectionStatus(){
    for(var i = 0; i < connections.length; i++){
        var connection = connections[i];
        console.log("Sending message to connection " + connection.userID + "(" + i + ")");
        connection.websocket.send(JSON.stringify({
            requestType: 0,
            connectionCount: connections.length
        }));
    }
}

function teacherConnection(){
    for(var i = 0; i < connections.length; i++){
        var connection = connections[i];
        if(connection.teacher === true){
            return connection;
        }
    }
    return undefined;
}

function sendMessageToEveryoneFromUserIDWithName(message, userID, name){
    for(var i = 0; i < connections.length; i++){
        var connection = connections[i];
        console.log("Sending message '" + message + "' to connection " + connection.userID + "(" + i + ")");
        connection.websocket.send(JSON.stringify({
            requestType: (connection.userID !== userID) ? 2 : 1,
            message: {
                from: name,
                text: message
            }
        }));

        currentSession.messages += message + " ";
    }
}

app.ws('/elonmusk/:userID', function (ws, req, next) {
    console.log("mate!");

    console.log("Bitch");

    if (req.params.userID == null) {
        ws.close();
        return;
    }

    if(req.params.userID === "TEACHER"){
        console.log("Teacher connected");
    }

    console.log("Config has connected! userID: " + req.params.userID);

    for(var i = 0; i < connections.length; i++){
        var connection = connections[i];
        if(connection.userID === req.params.userID){
            console.log("Rejecting duplicate");
            ws.close();
            return;
        }
    }

    addConnection({
        userID: req.params.userID,
        websocket: ws,
        queue: [],
        teacher: req.params.userID === "TEACHER"
    });

    refreshConnectionStatus();

    ws.on('message', function (msg) {
        connections.forEach(function(item) {
            if (item.userID == req.params.userID) {
                if (item.websocket) {
                    var jsonData = JSON.parse(msg);
                    console.log("Got message with request type " + jsonData.requestType);
                    switch(jsonData.requestType){
                        case 0:
                            console.log("Sending initial data request");
                            item.websocket.send(JSON.stringify({
                                requestType: jsonData.requestType,
                                connectionCount: connections.length
                            }));
                            break;
                        case 1:
                        case 2:
                            sendMessageToEveryoneFromUserIDWithName(jsonData.message, item.userID, jsonData.name);
                            break;
                        case 3:
                            currentSession.dataset[jsonData.improvementNumber]++;

                            teacherConnection().websocket.send(JSON.stringify({
                                requestType: jsonData.requestType,
                                dataset: currentSession.dataset
                            }));
                            break;
                        case 10:
                            item.websocket.send(JSON.stringify({
                                requestType: jsonData.requestType,
                                dataset: currentSession.dataset
                            }));
                            break;
                        case 666:
                            for(var i = 0; i < connections.length; i++){
                                var connection = connections[i];
                                connection.websocket.send(JSON.stringify({
                                    requestType:666
                                }));
                            }
                            currentSession.dataset = [0, 0, 0];
                            break;
                        default:
                            console.log("Got some bullshit message from user id " + item.userID + " with contents: " + msg);
                            break;
                    }
                } else {
                    console.log('Queuing message for userID: ' + item.userID);
                    item.queue.push(msg);
                }
            }
        });
    });

    ws.on('close', function () {
        console.log("Closing a web connection");
        connections.forEach(function(item, index) {
            if (item.userID == req.params.userID) {
                var websocket = item.websocket;
                connections.splice(index, 1);
                if (websocket) {
                    console.log("Closing connection to user id " + item.userID);
                    websocket.close();

                    refreshConnectionStatus();
                }
            }
        });
    });
});

app.post("/session/create", function (req, res) {
    console.log("Hey\n");

    var data = '';
    req.on('data', function(chunk) {
        data += chunk + "";
    }).on('end', function() {
        //Parse the data sent in the request
        var jsonData = undefined;
        try{
            jsonData = JSON.parse(data);
        }
        catch(error){
            return;
        }

        currentSession = {};

        currentSession.sessionID = generateID();
        currentSession.name = jsonData.name;
        currentSession.description = jsonData.description;
        currentSession.messages = "";
        currentSession.improvements = {
            slower: 0,
            louder: 0,
            faster: 0
        };

        res.writeHead(200);
        res.end(JSON.stringify({
            "result": 200,
            "message": "Event created!",
            "id": currentSession.sessionID
        }));
    });
});

app.post("/session/join", function (req, res) {
    var data = '';
    req.on('data', function(chunk) {
        data += chunk + "";
    }).on('end', function() {
        //Parse the data sent in the request
        var jsonData = undefined;
        try{
            jsonData = JSON.parse(data);
        }
        catch(error){
            return;
        }

        res.writeHead(200);
        res.end(JSON.stringify({
            "result": 200,
            "message": "Session not found."
        }));
    });
});

app.post("/image/write", function (req, res) {
    var data = '';
    req.on('data', function(chunk) {
        data += chunk + "";
    }).on('end', function() {
        //Parse the data sent in the request
        var jsonData = undefined;
        try{
            jsonData = JSON.parse(data);
        }
        catch(error){
            return;
        }

        var base64Data = jsonData.imageData.replace(/^data:image\/png;base64,/, "");

        var imageID = generateID();

        require("fs").writeFile("/var/www/lecturebuddy_frontend/images/" + imageID + ".png", base64Data, 'base64', function(err) {
            if(err){
                res.writeHead(200);
                res.end(JSON.stringify({
                    "result": 500,
                    "message": err
                }));
                return console.log(err);
            }

            console.log("Success writing image!");

            teacherConnection().websocket.send(JSON.stringify({
                requestType: 777,
                imageID: imageID
            }))

            res.writeHead(200);
            res.end(JSON.stringify({
                "result": 200,
                "message": "Good to go",
                "imageID": imageID
            }));
        });
    });
});


console.log("The LectureBuddy API is live!!");