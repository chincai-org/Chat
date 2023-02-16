import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import * as utils from "./utils.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");

app.get("/home", (req, res) => {
    res.render("home.ejs");
});

app.get("/about", (req, res) => {
    res.render("about.ejs");
});

app.get(
    "/chat",
    async (req, res, next) => {
        if (!(await utils.findUserByCookie(req.cookies.id))) {
            return res.redirect("/login");
        }
        next();
    },
    (req, res) => {
        res.render("main.ejs");
    }
);

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
        "<p> Please don't leave this empty. ",
        "",
        "",
        "<p> Please use character between A to Z and 0 to 9 only. </p>",
        "<p> This username cannot be used. </p>",
        ""
    ];

    const passwordError = [
        "",
        "",
        "",
        "<p> Please don't leave this empty. </p>",
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
        "<p> Please don't leave this empty. </p>",
        "",
        "",
        "<p> This is not the same with password. </p>"
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
    } else if (username.match(/[^A-z0-9_]/g)) {
        console.log("else if")
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
            !room.members.includes(user.cookieId)
        ) {
            // TODO user not at room
        } else {
            console.log(`${user.displayName}: ${msg}`);
            utils.insertMessage(room._id, user.username, msg, time);
            io.emit("msg", user.displayName, roomId, msg, time);
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

    socket.on("fetchmsg", async (cookieId, roomId) => {
        let user = await utils.findUserByCookie(cookieId);
        let room = await utils.findRoom(roomId);

        if (!user) {
            // TODO handle user simply change cookie
        } else if (!room) {
            // TODO handle user simply change room id
        } else if (
            room.visibility == "private" &&
            !room.members.includes(user.cookieId)
        ) {
            // TODO user not at room
        } else {
            for (let msg of room.messages) {
                socket.emit(
                    "msg",
                    msg.author,
                    room._id,
                    msg.content,
                    msg.createdAt
                );
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Running server at http://localhost:${port}`);
});
