const socket = io();

socket.on("msg", (authorName, roomId, content, time) => {
    // TODO append msg to html
    // time is unix timestamp convert urself ;)
});

socket.on("rooms", (rooms, pins) => {
    console.table(rooms);
    console.table(pins);
    const topics = document.getElementById("rooms")
    let pinList = []
    for (let pin = 0; pin < pins.length; pins++) {
        let topic = document.createElement("div");
        topic.id = pins[pin]['_id']
        let topicName = document.createElement("h5");
        topicName.title = "Right click for more info";
        topicName.innerText = pins[pin]['name'];
        topic.appendChild(topicName);
        topics.appendChild(topic);
        pinList.push(pins[pin]['name']);
    }
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
    // TODO append room to rooms
    // Object in rooms and pins looks something like this:
    // {
    //     _id: "xxx",
    //     name: "xxx"
    // }
});
