// Constant global variables
const public = document.getElementById("choice-1");
const private = document.getElementById("choice-2");
const newTopicName = document.getElementById("new-topic-input-name");
const newTopic = document.getElementById("new-topic");
const createNewTopic = document.getElementById("create-new");
const newTopicCancel = document.getElementById("new-topic-btn-cancel");
const newTopicConfirm = document.getElementById("new-topic-btn-create");
const check18 = document.getElementById("check18");
const topics = document.getElementById("rooms");

// Changable global variable
let activeRoom = null;
let visible = null;
let topicDblclick = null;
let currentRoom = "";

// Create new topic button
createNewTopic.onclick = () => {
    newTopic.classList.remove("hide");
};

// Cancel create new topic
newTopicCancel.onclick = () => {
    newTopic.classList.add("hide");
    newTopicName.innerHTML = "";
    check18.checked = false;
};

// Confirm create new topic
newTopicConfirm.onclick = () => {
    if (!/\S/.test(newTopicName.innerText)) {
        return;
    }

    socket.emit(
        "new-room",
        cookieId,
        newTopicName.innerText,
        visible,
        check18.checked
    );

    newTopic.classList.add("hide");
    newTopicName.innerHTML = "";
    check18.checked = false;
};

// Detect keydown on new topic name textbox
newTopicName.onkeydown = e => {
    if (e.keyCode === 13) {
        e.preventDefault();
        newTopicName.blur();
    }
};

// Detect click on Public button
public.onclick = () => {
    public.classList.add("clicked");

    if (private.classList.contains("clicked")) {
        private.classList.remove("clicked");
    }
    switchTo("public");
};

// Detect click on Private Button
private.onclick = () => {
    private.classList.add("clicked");
    if (public.classList.contains("clicked")) {
        public.classList.remove("clicked");
    }
    switchTo("private");
};

// Detect input on search topic
searchBar.oninput = () => {
    if (searchBar.value == "") {
        clearRoom();
        socket.emit("rooms", cookieId, visible);
    } else {
        clearRoom();
        socket.emit("findrooms", cookieId, visible, searchBar.value);
    }
};

// Detect keydown on search topic
searchBar.onkeydown = e => {
    if (e.keyCode === 13) {
        e.preventDefault();
        searchBar.blur();
    }
};

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

window.onresize = () => {
    ilvtopic(null);
};

function ilvtopic(d) {
    if (window.innerWidth > 700) {
        document.getElementById("topics").style.width = "auto";
        document.getElementById("topics").style.backgroundColor = "transparent";
        document.getElementById("topics").style.display = "block";
        sizeOfChat("69.7%");
        lengthOfText("67.4vw");
    } else {
        document.getElementById("topics").style.width = "100vw";
        document.getElementById("topics").style.backgroundColor = "gray";
        if (d == 1) {
            document.getElementById("topics").style.display = "block";
        } else {
            document.getElementById("topics").style.display = "none";
        }
        sizeOfChat("100%");
        lengthOfText("90%");
    }
}

function redirectTopic(id) {
    let topic = document.getElementById(id);
    if (currentRoom) socket.emit("typing-kill", cookieId, currentRoom);

    clearMessage();
    currentRoom = id;

    activeRoom?.classList.remove("topic-bg-colour");
    topic.classList.add("topic-bg-colour");
    activeRoom = topic;

    textbox.classList.remove("hide");
    // contextMenu.classList.remove("active");
    socket.emit("fetch-typing", cookieId, id);
    fetchMsg(cookieId, id, 0);
    if (window.innerWidth < 701) {
        topicStatus(0);
        sizeOfChat("100%");
        lengthOfText("90%");
    }
}

function createTopic(room) {
    console.log("bruh");
    console.table(room);
    let topic = document.createElement("div");
    let contextMenu = createTopicContextMenu(room);
    topic.id = room._id;

    topic.ondblclick = e => {
        e.preventDefault();
        topic.contentEditable = "true";
        topic.focus();
        topicDblclick = topic;
    };

    topic.onkeydown = e => {
        if (topicDblclick && e.keyCode === 13) {
            topicDblclick.contentEditable = "false";
            topicDblclick = null;
            socket.emit(
                "change-name",
                cookieId,
                topic.id,
                topic.children[0].innerText
            );
        }
    };

    topic.onclick = () => redirectTopic(room._id);

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

function createTopicContextMenu(room) {
    //#region createtopic
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

    if (visible == "private") {
        menu.appendChild(settingsItem);
    }

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

    if (visible == "private") {
        copyId.appendChild(leaveItem);
    }

    menuContent.appendChild(copyId);
    wrapper.appendChild(menuContent);
    //#endregion

    settingsItem.onclick = e => {
        //TODO open settings
        wrapper.classList.remove("active");
        e.stopPropagation();
    };

    pinItem.onclick = e => {
        let topic = document.getElementById(room._id);
        let textPin = document.getElementsByClassName("text-pin");

        if (pinText.textContent == "Pin") {
            pinText.textContent = "Unpin";
            socket.emit("pin", cookieId, room._id);

            if (textPin.length) {
                for (let i = 0; i < textPin.length; i++) {
                    let textPinElement = textPin[i];

                    if (!textPinElement.innerText) {
                        topics.removeChild(topic);
                        topics.insertBefore(topic, textPinElement);
                        break;
                    }
                }
            } else {
                topics.removeChild(topic);

                let textPin2 = document.createElement("p");
                textPin2.className = "text-pin";
                topics.insertBefore(textPin2, topics.firstChild);

                topics.insertBefore(topic, topics.firstChild);

                let textPin = document.createElement("p");
                textPin.className = "text-pin";
                textPin.innerText = "pin";
                topics.insertBefore(textPin, topics.firstChild);
            }
        } else if (pinText.textContent == "Unpin") {
            pinText.textContent = "Pin";
            let textPin = document.getElementsByClassName("text-pin");
            let topic = document.getElementById(room._id);
            if (textPin) {
                topics.removeChild(topic);
                topics.appendChild(topic);
            }
            socket.emit("unpin", cookieId, room._id);
            if (
                topics.children[0].className == "text-pin" &&
                topics.children[1].className == "text-pin"
            ) {
                topics.removeChild(textPin[0]);
                topics.removeChild(textPin[0]);
            }
        }

        wrapper.classList.remove("active");
        e.stopPropagation();
    };

    copyIdItem.onclick = e => {
        navigator.clipboard.writeText(room._id);
        wrapper.classList.remove("active");
        e.stopPropagation();
    };

    leaveItem.onclick = () => {
        socket.emit("leave", cookieId, room._id);
        wrapper.classList.remove("active");
        e.stopPropagation();
    };

    return wrapper;
}
