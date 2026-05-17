const socket = io();

function incrementNewMessageCounter() {
	if (!window._isAtBottomMost) {
		const el = document.getElementById("new-msg-counter");
		const current = el.innerText;
		if (current !== "99+") {
			const next = +current + 1;
			el.innerText = next === 100 ? "99+" : next;
			el.classList.remove("hide");
		}
	}
}

socket.on("msg", async message => {
	const {
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

	const currentRoom = window.currentRoom;
	if (currentRoom === roomId || roomId === "$") {
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

		if (!window._isAtBottomMost) {
			incrementNewMessageCounter();
		}
	}
});

socket.on("rooms", (rooms, pins) => {
	const topics = document.getElementById("rooms");
	const pinList = [];

	if (pins?.length) {
		const textPin = document.createElement("p");
		textPin.className = "text-pin";
		textPin.innerText = "pin";
		topics.appendChild(textPin);

		for (const pin of pins) {
			topics.appendChild(_createTopic(pin));
			pinList.push(pin.name);
		}

		const textPin2 = document.createElement("p");
		textPin2.className = "text-pin";
		topics.appendChild(textPin2);
	}

	for (const room of rooms) {
		if (!pinList.includes(room.name))
			topics.appendChild(_createTopic(room));
	}
});

socket.on("room", room => {
	document.getElementById("rooms").appendChild(_createTopic(room));
});

socket.on("delete", msgId => {
	const outerWrap = document.getElementById("outer-wrap");
	const target = document.getElementById(msgId);
	if (target?.parentNode === outerWrap) {
		outerWrap.removeChild(target);
	}
});

socket.on("change-name", (roomId, newName) => {
	const topic = document.getElementById(roomId);
	if (topic?.children[0]) {
		topic.children[0].innerText = newName;
	}
});

socket.on("typing", (username, roomId, timeStart) => {
	const currentRoom = window.currentRoom;
	if (
		roomId === currentRoom &&
		Date.now() - timeStart <= window.timeoutPreference
	) {
		window.usersTyping[username] = timeStart;
		updateTypingUsers();
	}
});

socket.on("typings", _usersTyping => {
	const usersTyping = window.usersTyping;
	for (const username in usersTyping) delete usersTyping[username];
	Object.assign(usersTyping, _usersTyping);
	updateTypingUsers();
});

socket.on("typing-kill", username => {
	delete window.usersTyping[username];
	updateTypingUsers();
});

socket.on("ban", () => {
	location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
});
