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
        
    });
app.post("/doingthings", (req, res) => {
    let { name, username, password, confirmpassword } = req.body;
    if (name) {
        if (username) {
            if (password) {
                if (confirmpassword) {
                    if (!username.match[/[^A-z0-9]/g]) {
                        if (utils.UsernameExists(username)) {
                            if (password == confirmpassword) {
                                let id = "id"
                                while (id == "id") {
                                    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                                    const charactersLength = characters.length;
                                    let counter = 0;
                                    while (counter < 20) {
                                        id = characters.charAt(Math.floor(Math.random() * charactersLength));
                                        counter += 1;
                                    } 
                                    if (utils.IdExists(id)) {
                                        id = id
                                    } else {
                                        id = "id"
                                    }
                                  
                                }
                                if (utils.CreateAccount(username, password, id)) {
                                    res.cookie("id", id);
                                    res.redirect("/chat");
                                }
                            } else {
                                res.cookie("e", "7")
                                res.redirect("/signup")
                            }
                        } else {
                            res.cookie("e", "6")
                            res.redirect("/signup")
                        } 
                    } else {
                        res.cookie("e", "5")
                        res.redirect("/signup")
                    }
                } else {
                    res.cookie("e", "4")
                    res.redirect("/signup")
                }
            } else {
                res.cookie("e", "3")
                res.redirect("/signup")
            }
        } else {
            res.cookie("e", "2")
            res.redirect("/signup")
        }
    } else {
        res.cookie("e", "1")
        res.redirect("/signup")
    }
})
app.post("/doinganotherthings", (req, res) => {
    let { username, password } = req.body;
})

app.get("/login", (req, res) => {
    res.render("login.ejs", {username: "", password: ""});
});

app.get("/signup", (req, res) => {
    res.cookie("e", "")
    if (req.cookies.e == "1") {
        res.render("signup.ejs", {name: "<p> Please don't leave this empty. ", username: "", password: "", confirmpassword: ""})
    } else if (req.cookies.e == "2") {
        res.render("signup.ejs", {name: "", username: "<p> Please don't leave this empty. ", password: "", confirmpassword: ""})
    } else if (req.cookies.e == "3") {
        res.render("signup.ejs", {name: "", username: "", password: "<p> Please don't leave this empty. </p>", confirmpassword: ""})
    } else if (req.cookies.e == "4") {
        res.render("signup.ejs", {name: "", username: "", password: "", confirmpassword: "<p> Please don't leave this empty. </p>"})
    } else if (req.cookies.e == "5") {
        res.render("signup.ejs", {name: "", username: "<p> Please use character between A to Z and 0 to 9 only. </p>", password: "", confirmpassword: ""})
    } else if (req.cookies.e == "6") {
        res.render("signup.ejs", {name: "", username: "<p> This username cannot be used. </p>", password: "", confirmpassword: "nonono"})
    } else if (req.cookies.e == "7") {
        res.render("signup.ejs", {name: "", username: "", password: "", confirmpassword: "<p> This is not the same with password. </p>"} )
    } else {
        res.render("signup.ejs", {name: "", username: "", password: "", confirmpassword: ""});
    }
});

server.listen(port, () => {
    console.log(`Running server at http://localhost:${port}`);
});
