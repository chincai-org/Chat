import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import * as utils from "./utils.js";
import { command, getRole } from "./command.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
const usersTyping = {};

function typingKill(username, roomId, socket) {
    try {
        delete usersTyping[roomId][username];
        socket.broadcast.emit("typing-kill", username);
    } catch {}
}

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.redirect("/home");
});

app.get("/home", (req, res) => {
    res.render("home.ejs");
});

app.get("/about", (req, res) => {
    res.render("about.ejs");
});

app.get("/chat", utils.checkBan, async (req, res) => {
    let user = await utils.findUserByCookie(req.cookies.id);
    if (user) {
        console.log(`User @${user.username} logged in`);
        res.render("main.ejs", {
            displayName: user.displayName,
            username: user.username
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/login", (req, res) => {
    res.cookie("e", "");
    let e = req.cookies.e ? +req.cookies.e : 0;

    const usernameErrors = [
        "",
        "Please don't make this field empty. ",
        "Please don't make this field empty. ",
        "Username or password is not correct. "
    ];

    const passwordErrors = ["", "", "Please don't make this field empty. ", ""];

    res.render("login.ejs", {
        username: usernameErrors[e],
        password: passwordErrors[e]
    });
});

app.get("/signup", (req, res) => {
    res.cookie("e", "");
    let e = req.cookies.e ? +req.cookies.e : 0;

    const nameError = [
        "",
        "Please don't leave this empty. ",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ];

    const usernameError = [
        "",
        "",
        "Please don't leave this empty. ",
        "",
        "",
        "Please use character between A to Z and 0 to 9 only. ",
        "This username cannot be used. ",
        "",
        "",
        "",
        ""
    ];

    const passwordError = [
        "",
        "",
        "",
        "Please don't leave this empty. ",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ];

    const confirmPasswordError = [
        "",
        "",
        "",
        "",
        "Please don't leave this empty. ",
        "",
        "",
        "This is not the same with password. ",
        "",
        "",
        ""
    ];

    const birthdayError = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Please do not leave this empty",
        "Go register for Guinness World Records before signing up an account",
        "Too young to have a chat account"
    ];

    res.render("signup.ejs", {
        name: nameError[e],
        username: usernameError[e],
        password: passwordError[e],
        confirmpassword: confirmPasswordError[e],
        birthday: birthdayError[e]
    });
});

app.post("/login_validator", async (req, res) => {
    let { username, password } = req.body;
    let user = await utils.findUserByUsername(username);

    if (!username) {
        res.cookie("e", "1");
        res.redirect("/login");
    } else if (!password) {
        res.cookie("e", "2");
        res.redirect("/login");
    } else if (!user) {
        res.cookie("e", "3");
        res.redirect("/login");
    } else if (user.password != (await utils.sha256(password))) {
        res.cookie("e", "3");
        res.redirect("/login");
    } else {
        res.cookie("id", user.cookieId);
        res.redirect("/chat");
    }
});

app.post("/signup_validator", async (req, res) => {
    let ipAddress = req.ip;
    let device = await utils.findDevice(ipAddress);
    if (device && device.amount >= 2) {
        return res.send("You created to many account"); // TODO better display
    }

    let { name, username, password, confirmpassword, birthday } = req.body;
    let bday = new Date(birthday);

    // return res.send("Signup disabled until exploit fixed");

    if (!name) {
        res.cookie("e", "1");
        res.redirect("/signup");
    } else if (!username) {
        res.cookie("e", "2");
        res.redirect("/signup");
    } else if (!password) {
        res.cookie("e", "3");
        res.redirect("/signup");
    } else if (!confirmpassword) {
        res.cookie("e", "4");
        res.redirect("/signup");
    } else if (!birthday) {
        res.cookie("e", "8");
        res.redirect("/signup");
    } else if (username.match(/[^A-Za-z0-9_]/g)) {
        res.cookie("e", "5");
        res.redirect("/signup");
    } else if (await utils.findUserByUsername(username)) {
        res.cookie("e", "6");
        res.redirect("/signup");
    } else if (password != confirmpassword) {
        res.cookie("e", "7");
        res.redirect("/signup");
    } else if (new Date(Date.now() - bday).getUTCFullYear() - 1970 > 120) {
        res.cookie("e", "9");
        res.redirect("/signup");
    } else if (new Date(Date.now() - bday).getUTCFullYear() - 1970 < 1) {
        res.cookie("e", "10");
        res.redirect("/signup");
    } else {
        let id = "id";
        while (id == "id") {
            const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            const charactersLength = characters.length;
            for (let i = 0; i < 20; i++) {
                id += characters.charAt(
                    Math.floor(Math.random() * charactersLength)
                );
            }
            if (await utils.findUserByCookie(id)) {
                id = "id";
            } else {
                id = id;
            }
        }
        await utils.createUser(name, username, password, bday, id, ipAddress);
        res.cookie("id", id);
        res.redirect("/chat");
    }
});

app.post("/get_user_by_cookie_id", async (req, res) => {
    let { id } = req.body;
    return res.json(await utils.findUserByCookie(id));
});

app.post("/get_message", async (req, res) => {
    let { cookieId, roomId, start } = req.body;
    let user = await utils.findUserByCookie(cookieId);
    let room = await utils.findRoom(roomId);

    if (!user) {
        socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
    } else if (!room) {
        socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
    } else if (
        room.visibility == "private" &&
        !room.members.includes(user.username)
    ) {
        socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
    } else {
        const fetchAmt = 30;
        let end =
            start == "last"
                ? room.messages.length
                : room.messages.findIndex(e => e.id == start);

        let messages = [];

        for (let i = Math.max(0, end - fetchAmt); i < end; i++) {
            let msg = room.messages[i];
            let author = (await utils.findUserByUsername(msg.author)) || {
                displayName: "DELETED_USER",
                username: "deleted_user",
                avatar: "/assets/dead.png"
            };

            messages.push({
                id: msg.id,
                authorName: author.displayName,
                authorUsername: author.username,
                avatar: author.avatar,
                content: msg.content,
                time: msg.createdAt,
                pings: await utils.findPings(msg.content),
                topicIds: await utils.findHashtagTopic(msg.content)
            });
        }
        return res.json(messages);
    }
});

app.post("/is_username_valid", async (req, res) => {
    let { username } = req.body;

    if (await utils.findUserByUsername(username)) {
        return res.json({ res: true });
    }

    res.json({ res: false });
});

app.post("/auto_complete", async (req, res) => {
    let { roomId, nameQuery } = req.body;
    let user = await utils.findUserByUsernameQuery(roomId, nameQuery);

    if (user) {
        return res.json({ res: user.username });
    } else {
        return res.json({ res: null });
    }
});

app.get("*", (req, res) => {
    res.status(404).render("error.ejs", { error: 404 });
});

io.on("connection", socket => {
    console.log("A socket connected");

    socket.on("msg", async (cookieId, roomId, msg, time) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);
        let muteObject = room.muted.find(
            mute => mute.username === user.username
        );

        if (!user) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(utils.MSG_PREFIX + utils.NO_USER)
            );
        } else if (!room) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(utils.MSG_PREFIX + utils.NO_ROOM)
            );
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(
                    utils.MSG_PREFIX + utils.NOT_IN_ROOM
                )
            );
        } else if (muteObject) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(
                    utils.MSG_PREFIX + utils.MUTED + " for " + muteObject.reason
                )
            );
        } else if (time - user.lastMessageTimestamp < utils.MESSAGE_COOLDOWN) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(
                    "Bro chill you sending message too fast"
                )
            );
        } else {
            msg = msg.trim();
            console.log(`${user.displayName}: ${msg}`);
            let id = await utils.insertMessage(
                roomId,
                user.username,
                msg,
                time,
                1
            );

            io.emit("msg", {
                id: id,
                authorName: user.displayName,
                authorUsername: user.username,
                avatar: user.avatar,
                roomId: roomId,
                content: msg,
                time: time,
                pings: await utils.findPings(msg),
                topicIds: await utils.findHashtagTopic(msg)
            });
            typingKill(user.username, roomId, socket);

            // Handle system reponse
            let [del, response] = await command.parse(io, user, room, msg);

            if (response) {
                let now = Date.now();
                let systemMsgId = "SYSTEM" + del + "$";
                if (!del)
                    systemMsgId = await utils.insertMessage(
                        roomId,
                        "system",
                        response,
                        now,
                        0,
                        systemMsgId
                    );
                io.emit("msg", {
                    id: systemMsgId,
                    authorName: "System",
                    authorUsername: "system",
                    avatar: "/assets/system.png",
                    roomId: roomId,
                    content: response,
                    time: now,
                    pings: await utils.findPings(response),
                    topicIds: []
                });
            }
        }
    });

    socket.on("rooms", async (cookieId, visibility) => {
        let user = await utils.findUserByCookie(cookieId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!visibility) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(utils.NO_SELECT_VISIBILITY)
            );
        } else {
            let pins = user.pins[visibility];
            let rooms = await utils.findRoomWithUser(
                user.username,
                visibility,
                pins.length + 50
            );
            socket.emit("rooms", rooms, pins);
        }
    });

    socket.on("findrooms", async (cookieId, visibility, query) => {
        let user = await utils.findUserByCookie(cookieId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!visibility) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(utils.NO_SELECT_VISIBILITY)
            );
        } else {
            let rooms = await utils.findRoomWithUserAndQuery(
                user.username,
                visibility,
                query
            );
            let pins = user.pins[visibility].filter(e =>
                e.name.toLowerCase().contains(query.toLowerCase())
            );
            socket.emit("rooms", rooms, pins);
        }
    });

    socket.on("new-room", async (cookieId, name, visibility, nsfw = false) => {
        let user = await utils.findUserByCookie(cookieId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!visibility) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(utils.NO_SELECT_VISIBILITY)
            );
        } else if (!name) {
            socket.emit(
                "msg",
                utils.generateWarningMessage("Please type room name")
            );
        } else if (!name.match(/\S/)) {
            socket.emit(
                "msg",
                utils.generateWarningMessage("No empty room name")
            );
        } else if (
            visibility == "public" &&
            (await utils.findRoomByName(name))
        ) {
            socket.emit(
                "msg",
                utils.generateWarningMessage("Room name already exist")
            );
        } else if (user.topicCreated >= 3) {
            socket.emit(
                "msg",
                utils.generateWarningMessage(
                    "Max limit for topic creation reached"
                )
            );
        } else {
            let result = await utils.createRoom(
                name,
                visibility,
                user.username,
                nsfw
            );

            if (visibility == "public")
                io.emit("room", { _id: result.insertedId, name: name });
            else socket.emit("room", { _id: result.insertedId, name: name });
        }
    });

    socket.on("change-name", async (cookieId, roomId, newName) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!room) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
        } else if (!newName) {
            socket.emit(
                "msg",
                utils.generateWarningMessage("Missing arg: newName")
            );
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
        } else if (getRole(user, room) == "member") {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_PERM));
        } else {
            await utils.changeRoomName(roomId, newName);
            socket.broadcast.emit("change-name", roomId, newName);
        }
    });

    socket.on("typing", async (cookieId, roomId, timeStart) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!room) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
        } else {
            usersTyping[roomId] ||= {};
            usersTyping[roomId][user.username] = timeStart;
            socket.broadcast.emit("typing", user.username, roomId, timeStart);
        }
    });

    socket.on("fetch-typing", async (cookieId, roomId) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!room) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
        } else {
            let result = Object.assign({}, usersTyping[roomId] || {});
            delete result[user.username];
            socket.emit("typings", result);
        }
    });

    socket.on("typing-kill", async (id, roomId) => {
        let user =
            (await utils.findUserByCookie(id)) ||
            (await utils.findUserByUsername(id));
        let room = await utils.findRoom(roomId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!room) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
        } else {
            typingKill(user.username, roomId, socket);
        }
    });

    socket.on("leave", async (cookieId, roomId) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!room) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
        } else if (room.visibility == "public") {
            socket.emit(
                "msg",
                utils.generateWarningMessage("Can't leave public room!")
            );
        } else if (!room.members.includes(user.username)) {
            socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
        } else {
            await utils.removeUser(cookieId, roomId);
        }
    });

    socket.on("delete-msg", async (cookieId, roomId, messageId) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!room) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
        } else {
            let role = getRole(user, room);
            let message = room.messages.find(msg => msg.id == messageId);

            if (!message) {
                socket.emit(
                    "msg",
                    utils.generateWarningMessage(utils.NO_MESESAGE)
                );
            } else if (role == "member" && message.author != user.username) {
                socket.emit("msg", utils.generateWarningMessage(utils.NO_PERM));
            } else {
                await utils.deleteMessage(roomId, messageId);
                io.emit("delete", messageId);
            }
        }
    });

    socket.on("pin", async (cookieId, roomId) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!room) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
        } else {
            await utils.pinRoom(user._id.toString(), roomId);
        }
    });

    socket.on("unpin", async (cookieId, roomId) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_USER));
        } else if (!room) {
            socket.emit("msg", utils.generateWarningMessage(utils.NO_ROOM));
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            socket.emit("msg", utils.generateWarningMessage(utils.NOT_IN_ROOM));
        } else {
            await utils.unpinRoom(user._id.toString(), roomId);
        }
    });
});

server.listen(port, () => {
    console.log(`Running server at http://localhost:${port}`);
});
