/////////////////////////////////////////////////////
///////////////////////////////////////////////////
//get all global variables
let socket = io();
let screenWidth = screen.width;
let constraints = { audio: true, video: false };
let miconstatus = false;
let micclicked = false;

let browserdata = {};

let display = document.getElementById("messages");
let form = document.getElementById("form");
let htmlroom = document.getElementById("current-roomname-txt");
let input = document.getElementById("input");
let mic = document.getElementById("micbutton");
let audiodiv = document.getElementById("speaker");
let roomsbutton = document.getElementById("roomdiv");
let profilename = document.getElementById("Profilename");
let createroom = document.getElementById("createroom");

let loginform = document.getElementById("userloginform");
let signinform = document.getElementById("usersigninform");

let nextpagelogin = document.getElementById("nextpagelogin");
let nextpagesignin = document.getElementById("nextpagesignup");

let loginclick = document.getElementById("loginButton");
let signinclick = document.getElementById("signinButton");

let loginusername = document.getElementById("loginUsername");
let loginpassword = document.getElementById("loginpassword");

let warning = document.getElementById("warning1");
let warning2 = document.getElementById("warning2");

let container = document.getElementById("containers");

let usernamediv = document.getElementById("signinusername");
let emaildiv = document.getElementById("signinemail");
let passdiv1 = document.getElementById("signin1password");
let passdiv2 = document.getElementById("signin2password");

let searchinput = document.getElementById("inputsearch");
let searchbutton = document.getElementById("searchbutton");
let dropdown = document.getElementById("dropdown");

let item1 = document.getElementById("item1");
let item2 = document.getElementById("item2");
let item3 = document.getElementById("item3");

let hamburger = document.getElementById("ham");
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
//create members for browserdata
browserdata.username;
browserdata.password;
browserdata.recentroom;
browserdata.rooms = [];


//check for bots
if( window.navigator.webdriver != false ){
    alert("We have Detected  a Bot...Try again Please..");
    location.reload();
}

////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
const validateuser = async(usr, pass) => {
    await socket.emit("validateusr", { usr, pass }, (response) => {
        if (response.valid == true) {
            browserdata.username = response.usr;
            browserdata.password = response.pass;

            //the rooms order will be changed according to local chages
            browserdata.rooms = response.rooms;
            browserdata.recentroom = browserdata.rooms[0];
            localStorage.setItem("browserdata", JSON.stringify(browserdata));

            /////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////
            ///now remove the login sign up page
            loginform.style.display = "none";
            container.style.filter = "none";

            //write roomname
            htmlroom.textContent = browserdata.recentroom;
            //write profile name
            profilename.innerHTML = browserdata.username;
            //join a room

            let oldroom = browserdata.recentroom;
            let newroom = browserdata.recentroom;
            let user = browserdata.username;
            let roomsorder = browserdata.rooms;
            socket.emit(
                "joinRoom", { oldroom, newroom, user, roomsorder },
                (response) => {
                    if (response.valid == true) {
                        siderooms();
                    } else {
                        location.reload();
                    }
                }
            );
        } else {
            warning.textContent = response.message;
            loginform.style.display = "flex";
            container.style.filter = "blur(5px)";
        }
    });
};

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
const newuseradd = async(usr, pass, email) => {
    await socket.emit("newuseradd", { usr, pass, email }, (response) => {
        console.log(response, usr, pass, email);
        if (response.valid == true) {
            ///////////////////////////////////
            //remove the sign in page
            signinform.style.display = "none";
            loginform.style.display = "flex";
        } else {
            warning2.textContent = response.message;
        }
    });
};

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///check localstorage for username and password
if (!localStorage.getItem("browserdata")) {
    //////////////////////////////////////////////////////
    /////////////////////////////////////////////////////
    //if no credentials found show the loginpage
    loginform.style.display = "flex";
    container.style.filter = "blur(5px)";
    signinform.style.display = "none";

    ///////////////////////////////////////////////
    ///////////////////////////////////////////////
    ///ask for username and password for login
    loginclick.addEventListener("click", (e) => {
        const username = loginusername.value;
        const password = loginpassword.value;

        if (
            password == null ||
            password == "" ||
            username == null ||
            username == " "
        ) {} else {
            validateuser(username, password);
        }
    });

    ////////////////////////////////////////////////////
    ///////////////////////////////////////////////////
    //get signin details
    signinclick.addEventListener("click", (e) => {
        let signinusrname = usernamediv.value;
        let signinemail = emaildiv.value;
        let pass1 = passdiv1.value;
        let pass2 = passdiv2.value;

        if (pass1 == pass2 && signinusrname != " ") {
            ////////////////////////////////////////////////
            ////////////////////////////////////////////////
            newuseradd(signinusrname, pass1, signinemail);
        } else {
            warning2.textContent = "Please try again!!";
        }
    });

    nextpagesignin.addEventListener("click", (e) => {
        signinform.style.display = "flex";
        loginform.style.display = "none";
    });

    nextpagelogin.addEventListener("click", (e) => {
        loginform.style.display = "flex";
        signinform.style.display = "none";
    });
} else {
    browserdata = JSON.parse(localStorage.getItem("browserdata"));
    validateuser(browserdata.username, browserdata.password);
}

///////////////////////////////////////////////////////////
//the validation part has been completed

//add rooms to the sidebar
const siderooms = () => {
    for (let i = 0; i < browserdata.rooms.length; i++) {
        let buttonid = document.createElement("button");
        buttonid.setAttribute("id", browserdata.rooms[i]);
        buttonid.setAttribute("type", "button");
        buttonid.textContent = browserdata.rooms[i];
        roomsbutton.appendChild(buttonid);
    }
};

//connect to a room for messaging
roomsbutton.addEventListener("click", (e) => {
    const id = e.target.id;
    if (id != "roomdiv") {
        let index = browserdata.rooms.indexOf(id);
        let item = browserdata.rooms.splice(index, 1);
        browserdata.rooms.unshift(item[0]);

        let oldroom = browserdata.recentroom;
        let user = browserdata.username;
        let roomsorder = browserdata.rooms;
        let newroom = id;

        socket.emit(
            "joinRoom", { oldroom, newroom, user, roomsorder },
            (response) => {
                if (response.valid == true) {
                    browserdata.recentroom = id;
                    localStorage.setItem("browserdata", JSON.stringify(browserdata));

                    //now clear all the messages and change room name
                    roomsbutton.innerHTML = "";
                    siderooms();
                    display.innerHTML = "";
                    htmlroom.textContent = id;
                } else {
                    console.log(response.message);
                }
            }
        );
    }
});

//load messges for the room
socket.on("pastmsg", (sender, message) => {
    let item = document.createElement("div");
    if (sender == browserdata.username) {
        sender = " ";
        item.style.marginLeft = "auto";
        item.style.marginRight = "1.5rem";
    } else {
        sender = sender + " : ";
    }

    item.textContent = sender + message;
    display.insertBefore(item, display.firstChild);
    display.scrollTo(0, display.scrollHeight);
});

//create a new room
createroom.addEventListener("click", async() => {
    ///for temporary we will use prompt
    let roomname = prompt("Enter a new room name: ");
    let user = browserdata.username;

    if (roomname != null) {
        await socket.emit("createnewroom", { user, roomname }, (response) => {
            if (response.valid == true) {
                browserdata.rooms.unshift(response.roomname);
                localStorage.setItem("browserdata", JSON.stringify(browserdata));
                roomsbutton.innerHTML = "";
                siderooms();
            } else {
                location.reload();
            }
        });
    }
});

//send messages to a room
form.addEventListener("submit", (data) => {
    data.preventDefault();

    if (input.value) {
        let message = input.value;
        let sender = browserdata.username;
        let room = browserdata.recentroom;
        socket.emit("message", { sender, message, room });
        input.value = "";
    }
});

//listen to messges in a room
socket.on("receivemessage", (data) => {
    let item = document.createElement("div");

    if (data.sender == browserdata.username) {
        data.sender = "";
        item.style.marginLeft = "auto";
        item.style.marginRight = "1.5rem";
    } else {
        data.sender = data.sender + " : ";
    }

    item.textContent = data.sender + data.message;
    display.appendChild(item);
    display.scrollTo(0, display.scrollHeight);
});

//for searching real time somerooms other created
searchinput.addEventListener("keyup", async(e) => {
    dropdown.innerHTML = "";
    if (searchinput.value != null && searchinput.value != "") {
        let user = browserdata.username;
        let searchvalue = searchinput.value;

        await socket.emit("searchrooms", { user, searchvalue }, (response) => {
            for (let i = 0; i < response.length; i++) {
                if (browserdata.rooms.indexOf(response[i]) == -1) {
                    let dropitem = document.createElement("div");
                    dropitem.setAttribute("id", response[i]);
                    dropitem.textContent = response[i];

                    dropdown.appendChild(dropitem);
                }
            }
        });
    }
});

///////////////////joining searched rooms//////
dropdown.addEventListener('click', (e) => {
        let id = e.target.id;
        let result = confirm(`Do you want to join ${id}`);
        if (result == true) {
            let user = browserdata.username;
            let room = id;
            socket.emit('joinotherrooms',
                user,
                room);
            browserdata.rooms.unshift(room);
            localStorage.setItem("browserdata", JSON.stringify(browserdata));
            roomsbutton.innerHTML = '';
            siderooms();
            searchinput.value = '';
            dropdown.innerHTML = "";

        }

    })
    //for mobile devices
hamburger.addEventListener("click", () => {
    if (screenWidth <= 755) {
        item1.style.display = "none";
        item3.style.display = "none";
        item2.style.display = "block";
        item2.style.width = "100%";
    }
});

/////////////////////////////////////////////////////
/////// temporary fix for transmissin of audio /////
/////////////////////////////////////////////////////
const record = () => {
    if (micclicked == true) {
        miconstatus = true;
    } else {
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then((mediaStream) => {
                let mediaRecorder = new MediaRecorder(mediaStream);
                micclicked = true;

                mediaRecorder.onstart = (e) => {
                    this.chunks = [];
                };
                mediaRecorder.ondataavailable = (e) => {
                    this.chunks.push(e.data);
                };

                mediaRecorder.onstop = (e) => {
                    let blob = new Blob(this.chunks, { type: "audio/ogg; codecs=opus" });
                    socket.emit("clientaudio", blob, browserdata.recentroom);
                };

                mediaRecorder.start();

                //run the loop for mic
                interval = setInterval(() => {
                    mediaRecorder.stop();
                    mediaRecorder.start();

                    if (miconstatus == true) {
                        micclicked = false;
                        miconstatus = false;
                        clearInterval(interval);
                    }
                }, 1000);
            })
            .catch((err) => {
                console.log(err);
            });
    }
};

//get aduio from the server
socket.on("serveraudio", (buffer) => {
    let blob = new Blob([buffer], { type: "audio/ogg; codecs=opus" });
    let audiodiv = document.createElement("audio");
    audiodiv.src = window.URL.createObjectURL(blob);
    audiodiv.play();
});

//   // Change room
// socket.on("changeRoom", (room) => {
//     socket.in(defaultRoom).broadcast.emit("leaveRoom", {text: "--BROADCAST-- User left room"});
//     socket.leave(defaultRoom);
//     socket.room = room;
//     socket.join(room);
//     socket.emit("roomChangeNotification", {text: "--ROOM-- You changed room"});
//     socket.in(room).broadcast.emit("OnewUserNotification", {text: "--ROOM_ALL-- New user joined"});
//   });