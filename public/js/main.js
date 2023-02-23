const public = document.getElementById("choice-1");
const private = document.getElementById("choice-2");
const textbox = document.getElementById("text");
const outerWrap = document.getElementById("outer-wrap");
const roomsElement = document.getElementById("rooms");
const searchBar = document.getElementById("search-bar");
const chat = document.querySelector(".chat");

let openedContextMenu = null;
let activeRoom = null;
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

textbox.setAttribute(
    "style",
    `height:${
        (textbox.scrollHeight / window.innerHeight) * 100
    }vh;overflow-y:scroll;`
);

textbox.oninput = () => {
    requestAnimationFrame(updateHeight);
};

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
    openedContextMenu?.classList.remove("active");
    openedContextMenu = null;
};

searchBar.oninput = () => {
    if (searchBar.value == "") {
        console.log("empty");
        clearRoom();
        socket.emit("rooms", cookieId, visibility);
    } else {
        console.log("no");
        clearRoom();
        socket.emit("findrooms", cookieId, visibility, searchBar.value);
    }
};

function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function postData(url, method, data) {
    return await fetch(url, {
        method: method,
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json"
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data)
    });
}

async function isValid(username) {
    return (
        await postData("/is_username_valid", "POST", { username: username })
    ).json();
}

function updateHeight() {
    textbox.style.height = "auto";

    const windowHeight = window.innerHeight;
    const textHeight = textbox.scrollHeight;
    const textHeightPercentage = (textHeight / windowHeight) * 100;
    const chatHeightPercentage =
        ((windowHeight - textHeight) / windowHeight) * 100 -
        (53 / windowHeight) * 100;
    if (textHeightPercentage > 50) {
        textbox.style.height = "50vh";
        chat.style.height = "43.29738058551618vh";
        textbox.style.overflowY = "scroll";
    } else {
        textbox.style.height = `${textHeightPercentage}vh`;
        chat.style.height = `${chatHeightPercentage}vh`;
        textbox.style.overflowY = "hidden";
    }
}

function sendMessage(msg) {
    textbox.value = "";
    socket.emit("msg", cookieId, currentRoom, msg, Date.now());
    updateHeight();
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
        currentRoom = room._id;

        activeRoom?.classList.remove("topic-bg-colour");
        topic.classList.add("topic-bg-colour");
        activeRoom = topic;

        textbox.classList.remove("hide");
        contextMenu.classList.remove("active");
        socket.emit("fetchmsg", cookieId, room._id);
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

async function createMsg(
    id,
    authorName,
    authorUsername,
    avatar,
    content,
    time,
    pings
) {
    console.time(id);
    let date = new Date(time);

    let containers = document.createElement("div");
    containers.className = "container";

    let textContainer = document.createElement("div");
    textContainer.className = "text-container";

    let name = document.createElement("h5");
    name.innerText = authorName;

    let username = document.createElement("span");
    username.innerText = `@${authorUsername}`;
    username.className = "username";

    let msg = document.createElement("p");
    msg.innerText = content;
    msg.className = "msg";

    for (let ping of pings) {
        msg.innerHTML = msg.innerHTML.replaceAll(
            `@${ping}`,
            `<span class="mention">@${ping}</span>`
        );
    }

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

    let image = document.createElement("img");
    image.alt = "default";
    image.src = avatar;
    image.className = "image";

    name.appendChild(username);
    containers.appendChild(image);
    textContainer.appendChild(name);
    textContainer.appendChild(msg);
    textContainer.appendChild(clock);
    containers.appendChild(textContainer);
    containers.id = id;

    outerWrap.appendChild(containers);

    if (id == "SYSTEM") {
        containers.classList.add("system-colour");
        clock.classList.add("system-colour");
        setTimeout(() => {
            outerWrap.removeChild(containers);
        }, 2000);
    }
    console.timeEnd(id);
}
