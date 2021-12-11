//let's test if the server works 
const express = require('express');
const http = require('http');
require("dotenv").config();

//we will use socket.io for two way server client communication
const { Server } = require('socket.io');
//io({transports: ['websocket'], upgrade: false});

//choose suitable port given by environment
const PORT = process.env.PORT || 5555;

//now create each instants
const app = express();
const server = http.createServer(app);
//since socket io works with http modules only

//connect socket with our existing server
const io = new Server(server);

//serve our html
app.use(express.static('static'));

//now check for connection event
//it means find when someone does new get request to the server
io.on('connection', (socket)=>{
    
    //listen when user wants to join a certain room
    socket.on('joinRoom', (userinfo) =>{
        socket.join(userinfo.room);
        socket.broadcast.to(userinfo.room).emit('serverbroadcast', userinfo);
    })

    //let's try sending audio to clients too..
    //the data that comes is a audio blob
    socket.on('clientaudio', (audioblob, room)=>{
        socket.broadcast.to(room).emit('serveraudio', audioblob);
    })

    //now lets listen for message event
    socket.on('message', (userinfo) => {
        
        //send this message to the users connected in their respective rooms
        io.to(userinfo.room).emit('messageServer', userinfo);
    })
    
});


//now listen on port 5555
server.listen(PORT, ()=>{
    console.log(`server has started in port ${PORT}`);
});