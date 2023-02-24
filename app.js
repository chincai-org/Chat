import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import * as utils from "./utils.js";
import { command } from "./command.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

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

app.get("/chat", async (req, res) => {
    let user = await utils.findUserByCookie(req.cookies.id);
    if (user) {
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
        "<p> Please don't leave this empty. ",
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
        "This is not the same with password. "
    ];

    res.render("signup.ejs", {
        name: nameError[e],
        username: usernameError[e],
        password: passwordError[e],
        confirmpassword: confirmPasswordError[e]
    });
});

app.post("/login_validator", async (req, res) => {
    let { username, password } = req.body;
    var user = await utils.findUserByUsername(username);
    if (!username) {
        res.cookie("e", "1");
        res.redirect("/login");
    } else if (!password) {
        res.cookie("e", "2");
        res.redirect("/login");
    } else if (!user) {
        res.cookie("e", "3");
        res.redirect("/login");
    } else if (!(user.password == password)) {
        res.cookie("e", "3");
        res.redirect("/login");
    } else {
        res.cookie("id", user.cookieId);
        res.redirect("/chat");
    }
});

app.post("/signup_validator", async (req, res) => {
    let { name, username, password, confirmpassword } = req.body;

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
    } else if (username.match(/[^A-Za-z0-9_]/g)) {
        console.log("else if");
        res.cookie("e", "5");
        res.redirect("/signup");
    } else if (await utils.findUserByUsername(username)) {
        res.cookie("e", "6");
        res.redirect("/signup");
        console.log("e9");
    } else if (password != confirmpassword) {
        res.cookie("e", "7");
        res.redirect("/signup");
        console.log("e10");
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
        await utils.createUser(name, username, password, id);
        res.cookie("id", id);
        res.redirect("/chat");
    }
});

app.post("/get_user_by_cookie_id", async (req, res) => {
    let { id } = req.body;
    console.log(id);
    return res.json(await utils.findUserByCookie(id));
});

app.post("/get_message", async (req, res) => {
    let {cookieId, roomId} = req.body;
    let user = await utils.findUserByCookie(cookieId);
    let room = await utils.findRoom(roomId);

    if (!user) {

    } else if (!room) {
        
    } else if (room.visibility == "private" && !room.members.includes(user.username)) {
        
    } else {
        let jsonmessage = [];
        for (let msg of   room.messages) {
            
            let username = await utils.findUserByUsername(msg.author);
            
            jsonmessage.push({"id": msg.id, "authorName": username.displayName, "authorUsername": username.username, "avatar": username.avatar, "content": msg.content, "time": msg.createdAt, "pings": await utils.findPings(msg.content)});

            

        }
        return res.json(jsonmessage);
    }
})

app.post("/is_username_valid", async (req, res) => {
    let { username } = req.body;

    if (await utils.findUserByUsername(username)) {
        return res.json({ res: true });
    }

    res.json({ res: false });
});

app.get("*", (req, res) => {
    res.status(404).render("error.ejs", { error: 404 });
});

io.on("connection", socket => {
    console.log("A socket connected");

    socket.on("msg", async (cookieId, roomId, msg, time) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            // TODO handle user simply change cookie
        } else if (!room) {
            // TODO handle user simply change room id
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.username)
        ) {
            // TODO user not at room
        } else {
            msg = msg.trim();
            console.log(`${user.displayName}: ${msg}`);
            let id = await utils.insertMessage(
                roomId,
                user.username,
                msg,
                time
            );

            io.emit(
                "msg",
                id,
                user.displayName,
                user.username,
                user.avatar,
                roomId,
                msg,
                time,
                await utils.findPings(msg)
            );

            let response = await command.parse(io, user, room, msg);

            console.log(response);

            if (response)
                io.emit(
                    "msg",
                    "SYSTEM",
                    "System",
                    "system",
                    "/assets/system.png",
                    roomId,
                    response,
                    time,
                    []
                );
        }
    });
    
    socket.on("rooms", async (cookieId, visibility) => {
        let user = await utils.findUserByCookie(cookieId);

        if (user) {
            let rooms = await utils.findRoomWithUser(user.username, visibility);
            let pins = user.pins[visibility];
            socket.emit("rooms", rooms, pins);
        } else {
            // TODO handle user simply change cookie
        }
    });

    socket.on("findrooms", async (cookieId, visibility, query) => {
        let user = await utils.findUserByCookie(cookieId);

        if (user) {
            let rooms = await utils.findRoomWithUserAndQuery(
                user.username,
                visibility,
                query
            );
            let pins = user.pins[visibility].filter(e =>
                e.name.toLowerCase().contains(query.toLowerCase())
            );
            socket.emit("rooms", rooms, pins);
        } else {
            // TODO handle user simply change cookie
        }
    });
});

server.listen(port, () => {
    console.log(`Running server at http://localhost:${port}`);
});
