const socket = io();

socket.on("msg", (id, authorName, roomId, content, time) => {
    if (currentRoom === roomId) createMsg(id, authorName, content, time);
});

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
            let topic = document.createElement("div");
            // topic.id = pin._id;

            topic.onclick = () => {
                clearMessage();
                textbox.classList.remove("hide");
                currentRoom = pin._id;
                socket.emit("fetchmsg", cookieId, pin._id);
            };

            let topicName = document.createElement("h5");
            topicName.title = "Right click for more info";
            topicName.innerText = pin.name;

            topic.appendChild(topicName);
            topics.appendChild(topic);
            pinList.push(pin.name);
        }

        let textPin2 = document.createElement("p");
        textPin2.className = "text-pin";
        topics.appendChild(textPin2);
    }

    for (let room of rooms) {
        if (!pinList.includes(room.name)) {
            let topic = document.createElement("div");
            // topic.id = room._id;

            topic.onclick = () => {
                clearMessage();
                textbox.classList.remove("hide");
                currentRoom = room._id;
                socket.emit("fetchmsg", cookieId, room._id);
            };

            let topicName = document.createElement("h5");
            topicName.title = "Right click for more info";
            topicName.innerText = room.name;

            topic.appendChild(topicName);
            topics.appendChild(topic);
        }
    }
});
