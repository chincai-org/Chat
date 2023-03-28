const textbox = document.getElementById("text");
const outerWrap = document.getElementById("outer-wrap");
const roomsElement = document.getElementById("rooms");
const searchBar = document.getElementById("search-bar");
const down = document.getElementById("scroll-down");
const downbtn = document.getElementById("down-btn");
const newMsgCounter = document.getElementById("new-msg-counter");
const chat = document.querySelector(".chat");
const typing = document.getElementById("typing");

const options = { className: "links", target: { url: "_blank" } };
const timeoutPreference = 5000;
const usersTyping = {};

let openedContextMenu = null;
let isAtBottomMost = true;
let allowFetch = true;

chat.onscroll = () => {
    if (chat.scrollHeight - chat.scrollTop >= chat.scrollHeight + 1) {
        // Not at bottom most
        down.classList.remove("hide");
        isAtBottomMost = false;
    } else {
        // At bottom most
        down.classList.add("hide");
        newMsgCounter.innerText = "0";
        newMsgCounter.classList.add("hide");
        isAtBottomMost = true;
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

textbox.onkeydown = e => {
    if (e.keyCode === 13 && !e.shiftKey) {
        if (!/\S/.test(textbox.innerText)) {
            return;
        }
        e.preventDefault();
        sendMessage(textbox.innerText)
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
    if (textbox.innerHTML === "<br>") textbox.innerHTML = "";

    requestAnimationFrame(updateHeight);
    socket.emit("typing", cookieId, currentRoom, Date.now());
};

// Convert image paste to link, doesnt work
// textbox.onpaste = event => {
//     let items = (event.clipboardData || event.originalEvent.clipboardData)
//         .items;
//     for (let item of items) {
//         if (item.kind === "file" && item.type?.indexOf("image/") === 0) {
//             event.preventDefault();
//             let file = item.getAsFile();
//             console.log("Image pasted:", file);
//             // Do something with the image file, such as upload it to a server or display it on the page

//             let formData = new FormData();
//             formData.append("file", file);
//             formData.append("key", "32c4dcb1bb5d6134cf83044dea7a3838");

//             fetch("https://postimages.org/api.php", {
//                 method: "POST",
//                 body: formData
//             })
//                 .then(response => {
//                     return response.text();
//                 })
//                 .then(result => {
//                     let imageUrl = result.trim();
//                     console.log("Image uploaded to Postimages:", imageUrl);
//                     textbox.innerText += imageUrl;
//                 })
//                 .catch(error => {
//                     console.error(error);
//                 });
//         }
//     }
// };

document.onclick = e => {
    openedContextMenu?.classList.remove("active");
    openedContextMenu = null;
    if (topicDblclick && !topicDblclick.contains(e.target)) {
        topicDblclick.contentEditable = "false";
        socket.emit(
            "change-name",
            cookieId,
            topicDblclick.id,
            topicDblclick.children[0].innerText
        );
        topicDblclick = null;
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

function updateTypingUsers() {
    let users = Object.keys(usersTyping);
    console.log("🚀 ~ file: main.js:195 ~ updateTypingUsers ~ users:", users);
    if (users.length == 0) {
        typing.innerText = "";
    } else {
        let toBe = users.length == 1 ? "is" : "are";
        let firstTwo = users.slice(
            0,
            Math.max(1, Math.min(2, users.length - 1))
        );
        let lastFew = users.slice(firstTwo.length, users.length);
        let lastFewLength = lastFew.length;

        let beforeAnd = firstTwo.join(", ");
        let afterAnd = // The most insane ternary operator usage
            (lastFewLength ? "and " : "") +
            (lastFewLength > 1
                ? (lastFewLength > 99 ? "99+" : lastFewLength) + " more"
                : lastFew.join());

        typing.innerText = `${beforeAnd} ${afterAnd} ${toBe} typing...`;
    }
}

function updateHeight() {
    textbox.style.height = `auto`;

    const windowHeight = window.innerHeight;
    const textHeight = textbox.scrollHeight;
    const textHeightPercentage = (textHeight / windowHeight) * 100;
    const chatHeightPercentage =
        ((windowHeight - textHeight) / windowHeight) * 100 -
        (53 / windowHeight) * 100;
    if (textHeightPercentage > 50) {
        textbox.style.height = "50svh";
        chat.style.height = "43svh";
        textbox.style.overflowY = "scroll";
    } else {
        textbox.style.height = `${textHeightPercentage}svh`;
        chat.style.height = `${chatHeightPercentage}svh`;
        textbox.style.overflowY = "hidden";
    }
}

function sendMessage(msg) {
    textbox.innerText = "";
    updateHeight();
    socket.emit("msg", cookieId, currentRoom, msg, Date.now());
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
    topicIds,
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
            `<span class="hashtag" onclick=redirectTopic("${topicId.id}")>#${topicId.name}</span>`
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

    itemCopyId.onclick = e => {
        wrapper.classList.remove("active");
        navigator.clipboard.writeText(id);
        e.stopPropagation()
    };

    itemTrash.onclick = e => {
        socket.emit("delete-msg", cookieId, currentRoom, id)
        wrapper.classList.remove("active");
        e.stopPropagation()
    };

    return wrapper;
}

// Remove typing users that reached the timeoutPreference
setInterval(() => {
    try {
        let now = Date.now();
        let change = false;
        for (let [username, startTime] of Object.entries(usersTyping)) {
            if (now - startTime > timeoutPreference) {
                delete usersTyping[username];
                change = true;
                socket.emit("typing-kill", username, currentRoom);
            }
        }
        if (change) updateTypingUsers();
    } catch (e) {
        console.log(e);
    }
}, 2000);
