const socket = io();

socket.on("msg", (authorName, roomId, content, time) => {
    const chat = document.getElementById("chatting");
    if (currentRoom === roomId) {
        console.log(authorName, content, time);
        let container = document.createElement("div");
        container.className = "container";
        let name = document.createElement("h5");
        name.innerText = authorName;
        let msg = document.createElement("p");
        msg.innerHTML = content;
        container.appendChild(name);
        container.appendChild(msg);
        chat.appendChild(container);
    }
    //        <div class="container">
    //<h5>Joe</h5>
    //<p>Hello</p>
    //<span class="time">31/12/2022 11:01</span>
    //</div>
    // TODO append msg to html
    // time is unix timestamp convert urself ;)
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
            topic.id = pin._id;

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
            topic.id = room._id;

            let topicName = document.createElement("h5");
            topicName.title = "Right click for more info";
            topicName.innerText = room.name;

            topic.appendChild(topicName);
            topics.appendChild(topic);
        }
    }
});
