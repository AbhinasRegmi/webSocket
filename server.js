const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const emailCheck = require('email-check');
const { Server } = require('socket.io');


require("dotenv").config();
const PORT = process.env.PORT || 3333;
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const Schema = mongoose.Schema;
app.use(express.static('static'));

/////////////////////////////////////////////////////////////////////
//connect to the database
const messagedatabase = mongoose.createConnection(process.env.URI1, { useNewUrlParser: true }, () => {
    console.log('connected to messagedatabase');
});
const userdatabase = mongoose.createConnection(process.env.URI2, { useNewUrlParser: true }, () => {
    console.log('connected to userdatabase');
});


/////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//schema

const userSchema = new Schema({
    name: { type: String },
    text: { type: String }
});

//schema for userdetails
const userdetails = new Schema({
        name: { type: String },
        pass: { type: String },
        email: { type: String },
        rooms: { type: Array },
        created: { type: Array },
    })
    ///////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////


io.on('connection', (socket) => {

    ////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////
    //sending rooms details to that user
    socket.on('validateusr', (data, response) => {
        let responsedata = {};
        responsedata.valid = false;

        const schema = userdatabase.model('Userdetails', userdetails);
        schema.findOne({ name: data.usr }).then(item => {

            if (item != null) {

                const validPassword = (data.pass == item.pass);
                if (validPassword) {
                    responsedata.valid = true;
                    responsedata.usr = data.usr;
                    responsedata.pass = data.pass;
                    responsedata.rooms = item.rooms;

                    //if there are no rooms then send with a default room
                    let len = item.rooms.length;
                    if (len == 0) {
                        let uniqueroom = "*" + data.usr;
                        responsedata.rooms.push(uniqueroom);
                        messagedatabase.db.createCollection(uniqueroom)
                            .then(() => {
                                responsedata.roomname = data.roomname;

                                //update the list of joined room
                                schema.updateOne({ name: data.user }, {
                                        $addToSet: { rooms: [uniqueroom] }
                                    },
                                    (err, res) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                    }
                                )

                                //update the list of created room
                                schema.updateOne({ name: data.user }, {
                                        $addToSet: { created: [uniqueroom] }
                                    },
                                    (err, res) => {
                                        if (err) {
                                            console.log(err);
                                        }
                                    }
                                )
                                response(responsedata);
                            }).catch(err => {
                                if (err) {
                                    responsedata.message = "Cannot validate this account. Try with new account";
                                    response(responsedata);
                                }
                            })
                    } else {

                        response(responsedata);

                    }
                } else {
                    responsedata.message = "Invalid Credentials";
                    response(responsedata);
                }
            } else {
                responsedata.message = "No such username present!";
                response(responsedata);
            }
        })
    })


    ///////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////
    //when signin form is clicked
    socket.on('newuseradd', (data, response) => {
        let responsedata = {};

        responsedata.valid = false;
        const schema = userdatabase.model('Userdetails', userdetails);
        schema.findOne({ name: data.usr }).then(
            item => {
                if (item == null) {
                    schema.findOne({ email: data.email }).then(
                        item2 => {

                            if (item2 == null) {

                                //check if the email is valid with external module email-check
                                emailCheck(data.email).
                                then((valid) => {
                                    if (valid == true) {

                                        responsedata.valid = true;
                                        let savethisdata = {
                                            name: data.usr,
                                            pass: data.pass,
                                            email: data.email,
                                            rooms: [],
                                            created: []
                                        };

                                        const save = new schema(savethisdata);
                                        save.save().then(
                                            result => {
                                                response(responsedata);
                                            }
                                        ).catch(
                                            err => {
                                                console.log(err);
                                            }
                                        )
                                    } else {
                                        responsedata.message = "Cannot verify this email.";
                                        response(responsedata);

                                    }
                                }).catch(err => {
                                    responsedata.message = 'This email cannot be accessed now..';
                                    response(responsedata);

                                })

                            } else {
                                responsedata.message = "Email already in use...";
                                response(responsedata);
                            }
                        }
                    )
                } else {
                    responsedata.message = "Username already exists..";
                    response(responsedata);

                }
            }
        )
    })

    //when the user wants to join certain room
    socket.on('joinRoom', (rooms, response) => {

        let responsedata = {};
        responsedata.valid = false;

        //check if the room exists for the user
        const schema1 = userdatabase.model('Userdetails', userdetails);
        schema1.findOne({ name: rooms.user }).then(
            item => {
                let validroom = item.rooms.indexOf(rooms.newroom);

                //change the order of rooms in database check if all the rooms are there
                for (let i = 0; i < item.rooms.length; i++) {
                    if (item.rooms.indexOf(rooms.roomsorder[i]) == -1) {
                        validroom = -1;
                        break;
                    }
                    if (item.rooms.length != rooms.roomsorder.length) {
                        validroom = -1;
                        break;
                    }
                }


                if (validroom != -1) {
                    responsedata.valid = true;

                    socket.leave(rooms.oldroom);
                    socket.join(rooms.newroom);

                    schema1.findOneAndUpdate({ name: rooms.user }, { rooms: rooms.roomsorder })
                        .then()
                        .catch(err => { console.log(err) });

                    const schema = messagedatabase.model(rooms.newroom, userSchema);
                    schema.find().limit(30).sort({ $natural: -1 }).then(
                        items => {
                            items.forEach(e => {
                                io.to(socket.id).emit('pastmsg', e.name, e.text);
                            })
                        }
                    )

                } else {
                    responsedata.message = "This room cannot be joined..";
                }

                response(responsedata);
            }
        )

        ///get messages of that room


    })


    //when the user wants to create new room
    socket.on('createnewroom', (data, response) => {
        let responsedata = {};
        responsedata.valid = false;

        if (data.roomname.indexOf('*') == 0) {
            responsedata.message = "Cannot create a room with '*' at the beginning..";
            response(responsedata);
        } else {
            messagedatabase.db.listCollections({ name: data.roomname }).toArray((err, collectionnames) => {
                if (err) {
                    console.log(err);
                }
                if (collectionnames.length == 0) {
                    responsedata.valid = true;
                    messagedatabase.db.createCollection(data.roomname)
                        .then(() => {
                            responsedata.roomname = data.roomname;
                            const schema = userdatabase.model('Userdetails', userdetails);

                            //update the list of joined room
                            schema.updateOne({ name: data.user }, {
                                    $addToSet: { rooms: [data.roomname] }
                                },
                                (err, res) => {
                                    if (err) {
                                        console.log(err);
                                    }
                                }
                            )

                            //update the list of created room
                            schema.updateOne({ name: data.user }, {
                                    $addToSet: { created: [data.roomname] }
                                },
                                (err, res) => {
                                    if (err) {
                                        console.log(err);
                                    }
                                }
                            )

                            response(responsedata);
                        }).catch(
                            err => { console.log(err); }
                        )
                } else {
                    responsedata.message = "room already exists";
                    response(responsedata);
                }

            })
        }

    })


    /////////////////////////////////////////////////////
    //searching for rooms
    socket.on('searchrooms', (data, response) => {
            messagedatabase.db.listCollections({ name: { $regex: data.searchvalue, $options: 'i' } }).toArray((err, items) => {
                if (err) {
                    console.log(err);
                }

                let result = [];
                if (items != undefined) {
                    for (let i = 0; i < items.length; i++) {
                        result.push(items[i].name);
                    }
                    response(result);
                } else {
                    response([]);
                }
            })

        })
        /////////////////////////////////////////////////////////////////////


    socket.on('joinotherrooms', (data1, data2) => {
        const schema = userdatabase.model('Userdetails', userdetails);
        schema.updateOne({ name: data1 }, {
                $addToSet: { rooms: [data2] }
            },
            (err, res) => {
                if (err) {
                    console.log(err);
                }

            }
        )


    })









    ////////////////////////////////////////////////////////////////////
    //when a user sends message in a room
    socket.on('message', (data) => {

        io.to(data.room).emit('receivemessage', data);

        /////////////////////////////////////////////////////////////
        //send message to database as room as collection name
        const schema = messagedatabase.model(data.room, userSchema);
        const dataschema = { name: data.sender, text: data.message };
        const todatabase = new schema(dataschema);
        todatabase.save()
            .then(e => {})
            .catch(err => console.log(err));
    })


    //////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////
    //when a user wants to send audio
    socket.on('clientaudio', (audioblob, room) => {
        socket.broadcast.to(room).emit('serveraudio', audioblob);
    })


});


///////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
//finally start the server
server.listen(PORT, () => {
    console.log(`server has started in port ${PORT}`);
});