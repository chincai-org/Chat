const socket = io();

socket.on(
    "msg",
    async (
        id,
        authorName,
        authorUsername,
        avatar,
        roomId,
        content,
        time,
        pings
    ) => {
        if (currentRoom === roomId || roomId == "$") {
            await createMsg(
                id,
                authorName,
                authorUsername,
                avatar,
                content,
                time,
                pings
            );

            let counter = newMsgCounter.innerText;
            if (counter != "99+") {
                let newCounter = +newMsgCounter.innerText + 1;
                newMsgCounter.innerText =
                    newCounter == 100 ? "99+" : newCounter;
            }
            newMsgCounter.classList.remove("hide");
        }
    }
);

socket.on("rooms", (rooms, pins) => {
    console.table(rooms);
    console.table(pins);

    const topics = document.getElementById("rooms");
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
    outerWrap.removeChild(document.getElementById(msgId));
});
