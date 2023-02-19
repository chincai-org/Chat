const public = document.getElementById("choice-1");
const private = document.getElementById("choice-2");
const textbox = document.getElementById("text");
const outerWrap = document.getElementById("outer-wrap");
const roomsElement = document.getElementById("rooms");

let openedContextMenu = null;
let currentRoom = "";

textbox.addEventListener("keydown", e => {
    if (e.keyCode === 13 && !e.shiftKey) {
        if (!/\S/.test(textbox.value)) {
            return;
        }
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

document.onclick = () => {
    openedContextMenu.classList.remove("active");
    openedContextMenu = null;
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

function createTopic(room) {
    let topic = document.createElement("div");
    let contextMenu = createContextMenu(room);
    topic.id = room._id;

    topic.onclick = () => {
        clearMessage();
        textbox.classList.remove("hide");
        currentRoom = room._id;
        socket.emit("fetchmsg", cookieId, room._id);
        contextMenu.classList.remove("active");
    };

    topic.oncontextmenu = e => {
        e.preventDefault();

        openedContextMenu?.classList.remove("active");
        contextMenu.classList.add("active");

        openedContextMenu = contextMenu;

        let x = Math.min(
            e.clientX,
            window.innerWidth - contextMenu.offsetWidth
        );
        let y = Math.min(
            e.clientY,
            window.innerHeight - contextMenu.offsetHeight
        );

        contextMenu.style.left = `${(x / window.innerWidth) * 100}vw`;
        contextMenu.style.top = `${(y / window.innerHeight) * 100}vh`;
    };

    let topicName = document.createElement("h5");
    topicName.title = "Right click for more info";
    topicName.innerText = room.name;

    topic.appendChild(topicName);
    topic.appendChild(contextMenu);

    return topic;
}

function createContextMenu(room) {
    let wrapper = document.createElement("div");
    wrapper.className = "wrapper";

    let menuContent = document.createElement("div");
    menuContent.className = "menu-content";

    let menu = document.createElement("ul");
    menu.className = "menu";

    let itemTrash = document.createElement("li");
    itemTrash.className = "item";

    let iTrash = document.createElement("i");
    iTrash.className = "fa-solid fa-trash";
    let spanTrash = document.createElement("span");
    spanTrash.innerText = "Delete";

    let copyId = document.createElement("div");
    copyId.className = "copy-id";

    let itemCopyId = document.createElement("li");
    itemCopyId.className = "item";

    let ICopyId = document.createElement("i");
    ICopyId.className = "fa-solid fa-id-card-clip";
    let spanCopyId = document.createElement("span");
    spanCopyId.innerText = "Copy ID";

    itemTrash.appendChild(iTrash);
    itemTrash.appendChild(spanTrash);
    menu.appendChild(itemTrash);
    itemCopyId.appendChild(ICopyId);
    itemCopyId.appendChild(spanCopyId);
    copyId.appendChild(itemCopyId);
    menuContent.appendChild(menu);
    menuContent.appendChild(copyId);
    wrapper.appendChild(menuContent);

    return wrapper;
}

function createMsg(id, authorName, content, time) {
    let date = new Date(time);

    let container = document.createElement("div");
    container.className = "container";

    let name = document.createElement("h5");
    name.innerText = authorName;

    let msg = document.createElement("p");
    // if (content.contains(`@${authorName}`)) {
    //     content.style.color = 'blue';
    // }
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

    outerWrap.appendChild(container);

    if (id == "SYSTEM") {
        container.classList.add("system-colour");
        clock.classList.add("system-colour");
        setTimeout(() => {
            outerWrap.removeChild(container);
        }, 2000);
    }
}
