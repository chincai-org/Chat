const public = document.getElementById("choice-1");
const private = document.getElementById("choice-2");
const textbox = document.getElementById("text");
const roomsElement = document.getElementById("rooms");

let currentRoom = "63ea5075135330ee451c922e"; // id for test

textbox.addEventListener("keydown", e => {
    if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        message = textbox.value;
        sendMessage(message);
    }
});

function sendMessage(msg) {
    textbox.value = "";
    socket.emit("msg", cookieId, currentRoom, msg, Date.now());
}

public.onclick = () => {
    public.classList.add("clicked");
    if (private.classList.contains("clicked")) {
        private.classList.remove("clicked");
    }
    switchTo("public");
};

private.onclick = () => {
    private.classList.add("clicked");
    if (public.classList.contains("clicked")) {
        public.classList.remove("clicked");
    }
    switchTo("private");
};

function switchTo(visibility) {
    clearRoom();
    socket.emit("rooms", cookieId, visibility);
}

function clearRoom() {
    let remove = [];
    for (let room of roomsElement.children) {
        if (room.tagName != "FORM") remove.push(room);
    }
    remove.forEach(e => roomsElement.removeChild(e));
}

$("#text")
    .each(() => {
        this.setAttribute(
            "style",
            "height:" +
                (this.scrollHeight / window.innerHeight) * 100 +
                "vh;overflow-y:scroll;"
        );
    })
    .on("input", () => {
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
