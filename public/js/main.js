const public = document.getElementById("choice-1");
const private = document.getElementById("choice-2");
const textbox = document.getElementById("text");
const outerWrap = document.getElementById("outer-wrap");
const roomsElement = document.getElementById("rooms");
const searchBar = document.getElementById("search-bar");
const down = document.getElementById("scroll-down");
const downbtn = document.getElementById("down-btn");
const newMsgCounter = document.getElementById("new-msg-counter");
const newTopicName = document.getElementById("new-topic-input-name");
const newTopic = document.getElementById("new-topic");
const createNewTopic = document.getElementById("create-new");
const newTopicCancel = document.getElementById("new-topic-btn-cancel");
const newTopicConfirm = document.getElementById("new-topic-btn-create");
const chat = document.querySelector(".chat");
const check18 = document.getElementById("check18");

const options = { className: "links", target: { url: "_blank" } };

let openedContextMenu = null;
let openedMsgContextMenu = null;
let activeRoom = null;
let visible = null;
let currentRoom = "";
let isAtBottomMost = true;
let allowFetch = true;

createNewTopic.onclick = () => {
    newTopic.classList.remove("hide");
};

newTopicCancel.onclick = () => {
    newTopic.classList.add("hide");
    newTopicName.innerHTML = "";
    check18.checked = false;
};

newTopicConfirm.onclick = () => {
    if (!/\S/.test(textbox.innerText)) {
        return;
    }
    socket.emit("new-room", newTopicName.innerText, visible, cookieId);
    newTopic.classList.add("hide");
    newTopicName.innerHTML = "";
    check18.checked = false;
};

chat.onscroll = () => {
    if (chat.scrollHeight - chat.scrollTop >= chat.scrollHeight + 1) {
        // Not at bottom most
        down.classList.remove("hide");
        isAtBottomMost = false;
        console.log("not btm");
    } else {
        // At bottom most
        down.classList.add("hide");
        newMsgCounter.innerText = "0";
        newMsgCounter.classList.add("hide");
        isAtBottomMost = true;
        console.log("btm");
    }

    if (
        allowFetch &&
        chat.scrollTop - chat.clientHeight + chat.scrollHeight < 2
    ) {
        fetchMsg(cookieId, currentRoom, outerWrap.firstChild.id);
        allowFetch = false;
    }
    setTimeout(() => {
        allowFetch = true;
    }, 500);
};

downbtn.onclick = () => {
    chat.scrollTop = chat.scrollHeight;
};

newTopicName.onkeydown = e => {
    if (e.keyCode === 13) {
        e.preventDefault();
        newTopicName.blur();
    }
};

textbox.onpaste = e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData(
        "text/plain"
    );
    document.execCommand("insertHTML", false, text);
};

textbox.onkeydown = e => {
    if (e.keyCode === 13 && !e.shiftKey) {
        if (!/\S/.test(textbox.innerText)) {
            return;
        }
        e.preventDefault();
        sendMessage(textbox.innerText);
    }

    if (e.keyCode == 9) {
        e.preventDefault();
        console.log(textbox.innerText);
        let foundResult = textbox.innerText
            .replace()
            .match(/(?<=@)[a-zA-Z0-9_]+$/);

        if (foundResult) {
            let nameQuery = foundResult[0];
            autoComplete(nameQuery)
                .then(res => {
                    let result = res.res;
                    if (result) {
                        textbox.innerText = textbox.innerText.replace(
                            new RegExp(nameQuery + "$"),
                            result
                        );
                        let range = document.createRange();
                        let selection = window.getSelection();
                        range.selectNodeContents(textbox);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                })
                .catch(console.error);
        }
    }

    // for (let username of new Set(textbox.innerHTML.match(/(?<=@)[A-Za-z\d_]+/g) || [])) {
    //     console.log(username)
    //     if (isValid(username)) {
    //             textbox.innerHTML = textbox.innerHTML.replaceAll(
    //                 `@${username}`,
    //                 `<span class="mention">@${username}</span>`
    //             );
    //     }
    // }
};

textbox.setAttribute(
    "style",
    `height:auto;
    overflow-y:hidden;`
);

textbox.oninput = () => {
    if (textbox.innerHTML === "<br>") {
        textbox.innerHTML = "";
    }
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
        clearRoom();
        socket.emit("rooms", cookieId, visible);
    } else {
        clearRoom();
        socket.emit("findrooms", cookieId, visible, searchBar.value);
    }
};

searchBar.onkeydown = e => {
    if (e.keyCode === 13) {
        e.preventDefault();
        searchBar.blur();
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

async function autoComplete(nameQuery) {
    return (
        await postData("/auto_complete", "POST", {
            roomId: currentRoom,
            nameQuery: nameQuery
        })
    ).json();
}

function updateHeight() {
    textbox.style.height = "auto";

    const windowHeight = window.innerHeight;
    const textHeight = textbox.scrollHeight;
    const textHeightPercentage = (textHeight / windowHeight) * 100;
    const chatHeightPercentage =
        ((windowHeight - textHeight) / windowHeight) * 100 -
        (63  / windowHeight) * 100;
    if (textHeightPercentage > 50) {
        textbox.style.height = "50svh";
        chat.style.height = "43svh";
        textbox.style.overflowY = "scroll";
    } else {
        textbox.style.height = `auto`;
        chat.style.height = `${chatHeightPercentage}svh`;
        textbox.style.overflowY = "hidden";
    }
}

function sendMessage(msg) {
    textbox.innerText = "";
    socket.emit("msg", cookieId, currentRoom, msg, Date.now());
    updateHeight();
}

function switchTo(visibility) {
    clearRoom();
    visible = visibility;
    socket.emit("rooms", cookieId, visible);
}

function clearRoom() {
    let remove = [];
    for (let room of roomsElement.children) {
        if (room.tagName != "FORM") remove.push(room);
    }
    remove.forEach(e => roomsElement.removeChild(e));
}

function fetchMsg(cookieId, roomId, messageId) {
    $.ajax({
        url: "/get_message",
        type: "POST",
        data: {
            cookieId: cookieId,
            roomId: roomId,
            start: messageId == 0 ? "last" : messageId
        },
        success: response => {
            console.log(response);

            if (messageId != 0) {
                response.reverse();
            }

            for (let msg of response) {
                createMsg(
                    msg.id,
                    msg.authorName,
                    msg.authorUsername,
                    msg.avatar,
                    msg.content,
                    msg.time,
                    msg.pings,
                    msg.topicIds,
                    messageId != 0
                );
            }
        },
        error: (xhr, status, error) => {
            console.log("Error: " + error);
        }
    });
}

function clearMessage() {
    outerWrap.innerHTML = "";
}

async function createMsg(
    id,
    authorName,
    authorUsername,
    avatar,
    content,
    time,
    pings,
    topicIds, // TODO: do something with topicIds, topicIds = list of ids that have # infront
    isOld
) {
    let msgContextMenu = createMsgContextMenu(id);
    let date = new Date(time);

    let containers = document.createElement("div");
    containers.className = "container";
    containers.id = id;

    containers.oncontextmenu = e => {
        e.preventDefault();

        openedContextMenu?.classList.remove("active");
        msgContextMenu.classList.add("active");

        openedContextMenu = msgContextMenu;

        let x = Math.min(
            e.clientX,
            window.innerWidth - msgContextMenu.offsetWidth
        );
        let y = Math.min(
            e.clientY,
            window.innerHeight - msgContextMenu.offsetHeight
        );

        msgContextMenu.style.left = `${(x / window.innerWidth) * 100}vw`;
        msgContextMenu.style.top = `${(y / window.innerHeight) * 100}vh`;
    };

    let textContainer = document.createElement("div");
    textContainer.className = "text-container";

    let name = document.createElement("h5");
    name.innerText = authorName;

    let username = document.createElement("span");
    username.innerText = `@${authorUsername}`;
    username.className = "username";
    username.onclick = () => {
        textbox.innerText += `@${authorUsername}`;
    };
    // username.onclick = () => {textbox.innerHTML += `<span class="mention">@${username}</span>`};

    let msg = document.createElement("p");
    msg.innerText = content;
    msg.className = "msg";

    for (let ping of pings) {
        msg.innerHTML = msg.innerHTML.replaceAll(
            `@${ping}`,
            `<span class="mention">@${ping}</span>`
        );
        if (ping === authorUsername) {
            containers.classList.add("mention-container");
        }
    }

    for (let topicId of topicIds) {
        msg.innerHTML = msg.innerHTML.replaceAll(
            `#${topicId.id}`,
            `<span class="hashtag" id="hashtag">#${topicId.name}</span>`
        );
    }

    msg.innerHTML = linkifyHtml(msg.innerHTML, options);

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

    textContainer.appendChild(name);
    textContainer.appendChild(msg);
    textContainer.appendChild(clock);

    containers.appendChild(image);
    containers.appendChild(textContainer);
    containers.appendChild(msgContextMenu);

    isOld
        ? outerWrap.insertBefore(containers, outerWrap.firstChild)
        : outerWrap.appendChild(containers);

    if (id.startsWith("SYSTEM")) {
        containers.classList.add("system-colour");
        clock.classList.add("system-colour");

        let deleteAfter = +id.split("$")[0].slice(6, id.length);

        if (deleteAfter)
            setTimeout(() => {
                outerWrap.removeChild(containers);
            }, deleteAfter);
    }
}

function createTopic(room) {
    let topic = document.createElement("div");
    let contextMenu = createTopicContextMenu(room);
    topic.id = room._id;

    // topic.ondblclick = e => {
    //     e.preventDefault();
    //     topic.contentEditable = "true"
    //     topic.focus();
    //     window.onclick = e => {
    //         topic.contentEditable = "false"
    //     }
    // }

    topic.onclick = () => {
        clearMessage();
        currentRoom = room._id;

        activeRoom?.classList.remove("topic-bg-colour");
        topic.classList.add("topic-bg-colour");
        activeRoom = topic;

        textbox.classList.remove("hide");
        contextMenu.classList.remove("active");
        // socket.emit("fetchmsg", cookieId, room._id);
        fetchMsg(cookieId, room._id, 0);
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

function createMsgContextMenu(id) {
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

function createTopicContextMenu(room) {
    let wrapper = document.createElement("div");
    wrapper.className = "wrapper";

    let menuContent = document.createElement("div");
    menuContent.classList.add("menu-content");

    let menu = document.createElement("ul");
    menu.classList.add("menu");

    let settingsItem = document.createElement("li");
    settingsItem.classList.add("item");

    let settingsIcon = document.createElement("i");
    settingsIcon.classList.add("fa-solid", "fa-gear");
    settingsItem.appendChild(settingsIcon);

    let settingsText = document.createElement("span");
    settingsText.textContent = "Settings";
    settingsItem.appendChild(settingsText);

    menu.appendChild(settingsItem);

    let pinItem = document.createElement("li");
    pinItem.classList.add("item");

    let pinIcon = document.createElement("i");
    pinIcon.classList.add("fa-sharp", "fa-solid", "fa-map-pin");
    pinItem.appendChild(pinIcon);

    let pinText = document.createElement("span");
    pinText.textContent = "Pin";
    pinItem.appendChild(pinText);

    menu.appendChild(pinItem);

    menuContent.appendChild(menu);

    let copyId = document.createElement("div");
    copyId.classList.add("copy-id");

    let copyIdItem = document.createElement("li");
    copyIdItem.classList.add("item");

    let copyIdIcon = document.createElement("i");
    copyIdIcon.classList.add("fa-solid", "fa-id-card-clip");
    copyIdItem.appendChild(copyIdIcon);

    let copyIdText = document.createElement("span");
    copyIdText.textContent = "Copy ID";
    copyIdItem.appendChild(copyIdText);

    copyId.appendChild(copyIdItem);

    let leaveItem = document.createElement("li");
    leaveItem.classList.add("item");

    let leaveIcon = document.createElement("i");
    leaveIcon.classList.add("fa-solid", "fa-door-open");
    leaveItem.appendChild(leaveIcon);

    let leaveText = document.createElement("span");
    leaveText.textContent = "Leave";
    leaveItem.appendChild(leaveText);

    copyId.appendChild(leaveItem);

    menuContent.appendChild(copyId);
    wrapper.appendChild(menuContent);

    return wrapper;
}
