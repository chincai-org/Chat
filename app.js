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
    .post(async (req, res) => {
        let { username, password, cpassword } = req.body;

        
        if (username && password && cpassword && password == cpassword) {
            //create a new token for cookie
            let cookie = "";
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            const charactersLength = characters.length;
            let counter = 0;
            while (counter < 20) {
                cookie += characters.charAt(Math.floor(Math.random() * charactersLength));
                counter += 1;
            } 
            //check if username or cookie exist before (return true if no duplication return false if got duplication)
            if (await utils.checkExist(cookie, username)) {

                //trying to create a user and check if the return is true (no problem) or false (got problem)
                if (await utils.createUser(cookie, username, password)) {
                    //user is created
                    res.cookie("cookies", cookie)
                    res.render("main.ejs")
                    
                }
            } else {
                //username or token existed, need a new one
            }
        } else {
            //username is empty
            //password is empty
            //cpassword is empty
            //password and cpassword is not the same

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
