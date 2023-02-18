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
            topic.id = pin._id;

            topic.onclick = () => {
                clearMessage();
                textbox.classList.remove("hide");
                currentRoom = pin._id;
                socket.emit("fetchmsg", cookieId, pin._id);
                contextMenu.classList.remove('active');
            };

            topic.oncontextmenu = () => {
                let contextMenu = document.getElementById(pin._id);
                document.addEventListener('contextmenu', event => {
                    event.preventDefault()
                    let x = event.clientX, y = event.clientY;
                });
                contextMenu.classList.add('active');
                let x = evt.clientX, y = evt.clientY;
                x = x > window.innerWidth - contextMenu.offsetWidth ? window.innerWidth - contextMenu.offsetWidth : x;
                y = y > window.innerHeight - contextMenu.offsetHeight ? window.innerHeight - contextMenu.offsetHeight : y;
                contextMenu.style.left = `${x/window.innerHeight*100}vh`;
                contextMenu.style.top = `${y/window.innerHeight*100 - 0.3}vh`;
                contextMenu.classList.add('active');
            }

            let topicName = document.createElement("h5");
            topicName.title = "Right click for more info";
            topicName.innerText = pin.name;

            createRightClickContextMenu();

            topic.appendChild(topicName);
            topic.appendChild(wrapper);
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

            topic.onclick = () => {
                clearMessage();
                textbox.classList.remove("hide");
                currentRoom = room._id;
                socket.emit("fetchmsg", cookieId, room._id);
                contextMenu.classList.remove('active');
            };

            topic.oncontextmenu = () => {
                let contextMenu = document.getElementById(room._id);
                document.addEventListener('contextmenu', event => event.preventDefault());
                contextMenu.classList.add('active');
                evt = evt || window.event;
                let x = evt.clientX, y = evt.clientY;
                x = x > window.innerWidth - contextMenu.offsetWidth ? window.innerWidth - contextMenu.offsetWidth : x;
                y = y > window.innerHeight - contextMenu.offsetHeight ? window.innerHeight - contextMenu.offsetHeight : y;
                contextMenu.style.left = `${x/window.innerHeight*100}vh`;
                contextMenu.style.top = `${y/window.innerHeight*100 - 0.3}vh`;
                contextMenu.classList.add('active');
            }

            let topicName = document.createElement("h5");
            topicName.title = "Right click for more info";
            topicName.innerText = room.name;

            createRightClickContextMenu()

            topic.appendChild(wrapper);
            topic.appendChild(topicName);
            topics.appendChild(topic);
        }
    }
});

socket.on("delete", msgId => {
    outerWrap.removeChild(document.getElementById(msgId));
});