import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import * as utils from "./utils.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

function createCookie(l) {
    let cookie = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < l) {
        cookie += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return cookie
}

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
        //signup
        if (cpassword) {
                
            if (username && password && cpassword && password == cpassword) {
                //check if username or cookie exist before (return true if no duplication return false if got duplication)
                let cookie = createCookie(20);
                var checkExist = await utils.checkExist(cookie, username); //if cookie exists return 1, username exists return 1
                var checkExist_num = 0
                while (checkExist == 0) {
                    if (checkExist_num < 10) {
                        cookie = createCookie(20)
                    } else {
                        console.log("Your system got problem. ")
                        exit()
                    }
                }            
                if (checkExist == 1) {
                    res.render("signup.ejs", {username: "<p> Username exists. </p>", password: ""});
                } else {

                    //trying to create a user and check if the return is true (no problem) or false (got problem)
                    if (await utils.createUser(cookie, username, password)) {
                        //user is created

                        res.cookie("cookies", cookie)
                        res.render("main.ejs")
                        
                    } else {
                        
                    }
                }
            } else {
                //username is empty
                //password is empty
                //cpassword is empty
                //password and cpassword is not the same
                res.render("signup.ejs")

            }
        } else {
            //login

        }
    });

app.get("/login", (req, res) => {
    res.render("login.ejs", {username: "", password: ""});
});

app.get("/signup", (req, res) => {
    res.render("signup.ejs", {username: "", password: ""});
});

server.listen(port, () => {
    console.log(`Running server at http://localhost:${port}`);
});
