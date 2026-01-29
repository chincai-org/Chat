const socket = io();

socket.on("msg", async message => {
    let {
        id,
        authorName,
        authorUsername,
        avatar,
        roomId,
        content,
        time,
        pings = [],
        topicIds = [],
    } = message;

    if (currentRoom === roomId || roomId == "$") {
        await createMsg(
            id,
            authorName,
            authorUsername,
            avatar,
            content,
            time,
            pings,
            topicIds,
            false,
        );

        if (!isAtBottomMost) {
            let counter = newMsgCounter.innerText;
            if (counter != "99+") {
                let newCounter = +newMsgCounter.innerText + 1;
                newMsgCounter.innerText =
                    newCounter == 100 ? "99+" : newCounter;
            }
            newMsgCounter.classList.remove("hide");
        }
    }
});

socket.on("rooms", (rooms, pins) => {
    console.table(rooms);
    console.table(pins);

    let pinList = [];

    if (pins.length) {
        let textPin = document.createElement("p");
        textPin.className = "text-pin";
        textPin.innerText = "pin";
        topics.appendChild(textPin);

        for (let pin of pins) {
            topics.appendChild(createTopic(pin));
            pinList.push(pin.name);
        }

        let textPin2 = document.createElement("p");
        textPin2.className = "text-pin";
        topics.appendChild(textPin2);
    }

    for (let room of rooms) {
        if (!pinList.includes(room.name)) topics.appendChild(createTopic(room));
    }
});

socket.on("room", room => {
    console.log("🚀 ~ file: socket.js:69 ~ room:", room);
    document.getElementById("rooms").appendChild(createTopic(room));
});

socket.on("delete", msgId => {
    console.log("hi");
    outerWrap.removeChild(document.getElementById(msgId));
});

socket.on("change-name", (roomId, newName) => {
    const roomElement = document.getElementById(roomId);
    if (roomElement) {
        const roomNameElement = roomElement.querySelector("h5");
        if (roomNameElement) {
            roomNameElement.innerText = newName;
            console.log(`Room name updated: ${roomId} -> ${newName}`);
        } else {
            console.warn(`Room name element not found for room: ${roomId}`);
        }
    } else {
        console.warn(`Room element not found: ${roomId}`);
    }
});

socket.on("typing", (username, roomId, timeStart) => {
    if (roomId === currentRoom && Date.now() - timeStart <= timeoutPreference) {
        usersTyping[username] = timeStart;
        updateTypingUsers();
    }
});

socket.on("typings", _usersTyping => {
    for (let username in usersTyping) delete usersTyping[username];
    Object.assign(usersTyping, _usersTyping);
    updateTypingUsers();
});

socket.on("typing-kill", username => {
    delete usersTyping[username];
    updateTypingUsers();
});

socket.on("ban", () => {
    location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    // TODO actual ban
});
