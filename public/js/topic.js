const MOBILE_BREAKPOINT = 700;

const topics = document.getElementById("rooms");

let activeRoom = null;
window.topicDblclick = null;
window.currentRoom = "";
window.openedContextMenu = null;

// Alpine.js handles: createNewTopic, newTopicCancel, newTopicForm, publicBtn, privateBtn

// Alpine.js handles: visibility, search, new topic dialog
// clearRoom is defined in main.js and exposed on window

function createMenuItem(tag = "li") {
	const item = document.createElement(tag);
	item.className = "item";
	return item;
}

function appendMenuIconLabel(parent, iconClasses, label) {
	const icon = document.createElement("i");
	icon.classList.add(...iconClasses);
	parent.appendChild(icon);

	const labelNode = document.createElement("span");
	labelNode.textContent = label;
	parent.appendChild(labelNode);

	return labelNode;
}

function getTopicsPanel() {
	return document.querySelector(".topics");
}

function getPinMarkers() {
	return [...topics.getElementsByClassName("text-pin")];
}

function getPinHeader() {
	return getPinMarkers().find(marker => marker.innerText.trim() === "pin");
}

function getPinDivider() {
	return getPinMarkers().find(marker => !marker.innerText.trim());
}

function hasPinnedTopics() {
	const header = getPinHeader();
	const divider = getPinDivider();
	if (!header || !divider) return false;

	let node = header.nextSibling;
	while (node && node !== divider) {
		if (node.id) return true;
		node = node.nextSibling;
	}

	return false;
}

function ensurePinMarkers(topic) {
	let header = getPinHeader();
	let divider = getPinDivider();

	if (!header || !divider) {
		header = document.createElement("p");
		header.className = "text-pin";
		header.innerText = "pin";

		divider = document.createElement("p");
		divider.className = "text-pin";

		topics.insertBefore(divider, topics.firstChild);
		topics.insertBefore(topic, topics.firstChild);
		topics.insertBefore(header, topics.firstChild);
		return { header, divider };
	}

	return { header, divider };
}

function pinTopic(topic) {
	const { divider } = ensurePinMarkers(topic);
	if (topic.parentNode === topics) {
		topics.removeChild(topic);
	}
	topics.insertBefore(topic, divider);
}

function unpinTopic(topic) {
	const divider = getPinDivider();
	if (topic.parentNode === topics) {
		topics.removeChild(topic);
	}

	if (divider?.parentNode === topics) {
		topics.insertBefore(topic, divider.nextSibling);
	} else {
		topics.appendChild(topic);
	}

	if (!hasPinnedTopics()) {
		for (const marker of getPinMarkers()) {
			marker.remove();
		}
	}
}

window.onresize = () => {
	ilvtopic(null);
};

function ilvtopic(d) {
	const topicsPanel = getTopicsPanel();
	if (!topicsPanel) return;

	if (window.innerWidth > MOBILE_BREAKPOINT) {
		topicsPanel.style.width = "auto";
		topicsPanel.style.backgroundColor = "transparent";
		topicsPanel.style.display = "block";
		sizeOfChat("69.7%");
		lengthOfText("67.4vw");
	} else {
		topicsPanel.style.width = "100vw";
		topicsPanel.style.backgroundColor = "gray";
		if (d === 1) {
			topicsPanel.style.display = "block";
		} else {
			topicsPanel.style.display = "none";
		}
		sizeOfChat("100%");
		lengthOfText("90%");
	}
}

function redirectTopic(id) {
	const topic = document.getElementById(id);
	if (!topic) return;
	if (window.currentRoom)
		window.socket?.emit("typing-kill", window.cookieId, window.currentRoom);

	window.clearMessage();
	window.currentRoom = id;

	activeRoom?.classList.remove("topic-bg-colour");
	topic.classList.add("topic-bg-colour");
	activeRoom = topic;

	window.textbox.classList.remove("hide");
	// contextMenu.classList.remove("active");
	window.socket?.emit("fetch-typing", window.cookieId, id);
	fetchMsg(window.cookieId, id, 0);

	if (window.innerWidth <= MOBILE_BREAKPOINT) {
		ilvtopic(0);
		sizeOfChat("100%");
		lengthOfText("90%");
	}
}

function _createTopic(room) {
	const topic = document.createElement("div");
	const contextMenu = createTopicContextMenu(room);
	if (!room?._id) return topic;
	topic.id = room._id;

	topic.ondblclick = e => {
		e.preventDefault();
		topic.contentEditable = "true";
		topic.focus();
		topicDblclick = topic;
	};

	topic.onkeydown = e => {
		if (topicDblclick && e.key === "Enter") {
			topicDblclick.contentEditable = "false";
			topicDblclick = null;
			window.socket?.emit(
				"change-name",
				window.cookieId,
				topic.id,
				topic.children[0].innerText,
			);
		}
	};

	topic.onclick = () => redirectTopic(room._id);

	topic.oncontextmenu = e => {
		e.preventDefault();

		openedContextMenu?.classList.remove("active");
		contextMenu.classList.add("active");

		openedContextMenu = contextMenu;

		const x = Math.min(
			e.clientX,
			window.innerWidth - contextMenu.offsetWidth,
		);
		const y = Math.min(
			e.clientY,
			window.innerHeight - contextMenu.offsetHeight,
		);

		contextMenu.style.left = `${(x / window.innerWidth) * 100}vw`;
		contextMenu.style.top = `${(y / window.innerHeight) * 100}vh`;
	};

	const topicName = document.createElement("h5");
	topicName.title = "Right click for more info";
	topicName.innerText = room.name;

	topic.appendChild(topicName);
	topic.appendChild(contextMenu);

	return topic;
}

function createTopicContextMenu(room) {
	const wrapper = document.createElement("div");
	wrapper.className = "wrapper";

	const menuContent = document.createElement("div");
	menuContent.className = "menu-content";

	const menu = document.createElement("ul");
	menu.className = "menu";

	const settingsItem = createMenuItem();
	appendMenuIconLabel(settingsItem, ["fa-solid", "fa-gear"], "Settings");

	if (window._visible === "private") {
		menu.appendChild(settingsItem);
	}

	const pinItem = createMenuItem();
	const pinText = appendMenuIconLabel(
		pinItem,
		["fa-sharp", "fa-solid", "fa-map-pin"],
		"Pin",
	);

	menu.appendChild(pinItem);

	menuContent.appendChild(menu);

	const copyId = document.createElement("div");
	copyId.className = "copy-id";

	const copyIdItem = createMenuItem();
	appendMenuIconLabel(copyIdItem, ["fa-solid", "fa-id-card-clip"], "Copy ID");

	copyId.appendChild(copyIdItem);

	const leaveItem = createMenuItem();
	appendMenuIconLabel(leaveItem, ["fa-solid", "fa-door-open"], "Leave");

	if (window._visible === "private") {
		copyId.appendChild(leaveItem);
	}

	menuContent.appendChild(copyId);
	wrapper.appendChild(menuContent);
	settingsItem.onclick = e => {
		wrapper.classList.remove("active");
		e.stopPropagation();
	};

	pinItem.onclick = e => {
		const topic = document.getElementById(room._id);
		if (!topic) return;

		if (pinText.textContent === "Pin") {
			pinText.textContent = "Unpin";
			window.socket?.emit("pin", window.cookieId, room._id);
			pinTopic(topic);
		} else if (pinText.textContent === "Unpin") {
			pinText.textContent = "Pin";
			window.socket?.emit("unpin", window.cookieId, room._id);
			unpinTopic(topic);
		}

		wrapper.classList.remove("active");
		e.stopPropagation();
	};

	copyIdItem.onclick = e => {
		navigator.clipboard.writeText(room._id);
		wrapper.classList.remove("active");
		e.stopPropagation();
	};

	leaveItem.onclick = e => {
		window.socket?.emit("leave", window.cookieId, room._id);
		wrapper.classList.remove("active");
		e.stopPropagation();
	};

	return wrapper;
}

window._createTopic = _createTopic;
