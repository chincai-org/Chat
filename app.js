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

app.route("/chat")
    .get((req, res) => {
        res.render("main.ejs");
    })
    .post((req, res) => {
        let { username, password, cpassword } = req.body;

        if (cpassword) {
            utils.createUser(username, password);
        }

        res.cookie("username", username);
        res.render("main.ejs");
    });

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

server.listen(port, () => {
    console.log(`Running server at http://localhost:${port}`);
});
