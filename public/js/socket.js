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
            spanCopyId.innerText = "Copy ID"
            
            itemTrash.appendChild(iTrash);
            itemTrash.appendChild(spanTrash);
            menu.appendChild(itemTrash);
            itemCopyId.appendChild(ICopyId);
            itemCopyId.appendChild(spanCopyId);
            copyId.appendChild(itemCopyId);
            menuContent.appendChild(menu);
            menuContent.appendChild(copyId);
            wrapper.appendChild(menuContent);

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
            spanCopyId.innerText = "Copy ID"
            
            itemTrash.appendChild(iTrash);
            itemTrash.appendChild(spanTrash);
            menu.appendChild(itemTrash);
            itemCopyId.appendChild(ICopyId);
            itemCopyId.appendChild(spanCopyId);
            copyId.appendChild(itemCopyId);
            menuContent.appendChild(menu);
            menuContent.appendChild(copyId);
            wrapper.appendChild(menuContent);

            topic.appendChild(wrapper);
            topic.appendChild(topicName);
            topics.appendChild(topic);
        }
    }
});

socket.on("delete", msgId => {
    outerWrap.removeChild(document.getElementById(msgId));
});