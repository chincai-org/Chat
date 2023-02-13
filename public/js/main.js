const choice1 = document.getElementById("choice-1");
const choice2 = document.getElementById("choice-2");
const textbox = document.getElementById("text");

let room = "63ea5075135330ee451c922e"; // id for test

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

textbox.addEventListener("keydown", e => {
    if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        message = textbox.value;
        sendMessage(message);
    }
});

function sendMessage(msg) {
    textbox.value = "";

    socket.emit("msg", getCookie("id"), room, msg, Date.now());
}

choice1.onclick = () => {
    choice1.classList.add("clicked");
    if (choice2.classList.contains("clicked")) {
        choice2.classList.remove("clicked");
    }
};

choice2.onclick = () => {
    choice2.classList.add("clicked");
    if (choice1.classList.contains("clicked")) {
        choice1.classList.remove("clicked");
    }
};

$("#text")
    .each(function () {
        this.setAttribute(
            "style",
            "height:" +
                (this.scrollHeight / window.innerHeight) * 100 +
                "vh;overflow-y:scroll;"
        );
    })
    .on("input", function () {
        this.style.height = "auto";
        if (this.scrollHeight > window.innerHeight / 2) {
            this.style.height = "48.844375963020035vh";
            $(".chat").css("height", "43.29738058551618vh");
        } else {
            this.style.height =
                (this.scrollHeight / window.innerHeight) * 100 + "vh";
            $(".chat").css(
                "height",
                ((window.innerHeight - this.scrollHeight) /
                    window.innerHeight) *
                    100 -
                    (53 / window.innerHeight) * 100 +
                    "vh"
            );
        }
    });
