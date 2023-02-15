const socket = io();

socket.on("msg", (authorName, roomId, content, time) => {
    const chat = document.getElementById("chatting")
    if (currentRoom === roomId) {
        console.log(authorName,content,time)
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

    const topics = document.getElementById("rooms")
    let pinList = [];

    if (!(pins.length === 0)) {

        let textPin = document.createElement("p");
        textPin.className = "text-pin";
        textPin.innerText = "pin";
        topics.appendChild(textPin);

        for (let pin = 0; pin < pins.length; pins++) {

            let topic = document.createElement("div");
            topic.id = pins[pin]['_id'];

            let topicName = document.createElement("h5");
            topicName.title = "Right click for more info";
            topicName.innerText = pins[pin]['name'];

            topic.appendChild(topicName);
            topics.appendChild(topic);
            pinList.push(pins[pin]['name']);
        };
        textPin.innerText = "";
        topics.appendChild(textPin);
    };
    for (let room = 0; room < rooms.length - pins.length; room++) {

        if (!(rooms[room]['name'] in pinList)) {

            let topic = document.createElement("div");
            topic.id = rooms[room]['_id']

            let topicName = document.createElement("h5");
            topicName.title = "Right click for more info";
            topicName.innerText = rooms[room]['name'];
            
            topic.appendChild(topicName);
            topics.appendChild(topic);
        }

    }
});
