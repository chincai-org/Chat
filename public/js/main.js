const public = document.getElementById("choice-1");
const private = document.getElementById("choice-2");
const textbox = document.getElementById("text");
const outerWrap = document.getElementById("outer-wrap");
const roomsElement = document.getElementById("rooms");

let currentRoom = "";

textbox.addEventListener("keydown", e => {
    if (e.keyCode === 13 && !e.shiftKey) {
        if (/^\s*/.test(textbox.value)) {
            return
        };
        e.preventDefault();
        message = textbox.value;
        sendMessage(message);
    }
});

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

function sendMessage(msg) {
    textbox.value = "";
    socket.emit("msg", cookieId, currentRoom, msg, Date.now());
}

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

function clearMessage() {
    outerWrap.innerHTML = "";
}

function createMsg(id, authorName, content, time) {
    let date = new Date(time);

    let container = document.createElement("div");
    container.className = "container";

    let name = document.createElement("h5");
    name.innerText = authorName;

    let msg = document.createElement("p");
    msg.innerText = content;

    let clock = document.createElement("span");
    clock.className = "time";
    clock.innerText =
        String(date.getDate()) +
        "/" +
        String(date.getMonth() + 1) +
        "/" +
        String(date.getFullYear()) +
        " " +
        date.toLocaleTimeString().slice(0, -6) +
        (date.getHours() > 11 ? " PM" : " AM");

    container.appendChild(name);
    container.appendChild(msg);
    container.appendChild(clock);
    container.id = id;
    console.log(container.id)

    outerWrap.appendChild(container);

    if (id == "SYSTEM") {
        container.classList.add("system-colour");
        clock.classList.add("system-colour");
        setTimeout(() => {
            outerWrap.removeChild(container)
        }, 2000);
    }
}
