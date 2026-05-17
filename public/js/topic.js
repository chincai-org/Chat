const _MAX_MESSAGE_LENGTH = 700;
const MOBILE_BREAKPOINT = 700;

const publicBtn = document.getElementById("choice-1");
const privateBtn = document.getElementById("choice-2");
const newTopicName = document.getElementById("new-topic-input-name");
const newTopicDialog = document.getElementById("new-topic");
const createNewTopic = document.getElementById("create-new");
const newTopicCancel = document.getElementById("new-topic-btn-cancel");
const newTopicForm = document.getElementById("new-topic-form");
const check18 = document.getElementById("check18");
const topics = document.getElementById("rooms");
const searchBar = document.getElementById("search-bar");
const roomsElement = document.getElementById("rooms");
const textbox = document.getElementById("text");

let activeRoom = null;
let visible = null;
let topicDblclick = null;
window.currentRoom = "";

createNewTopic.onclick = () => {
	newTopicDialog.showModal();
};

newTopicCancel.onclick = () => {
	newTopicDialog.close();
	newTopicName.value = "";
	check18.checked = false;
};

newTopicForm.onsubmit = e => {
	e.preventDefault();
	if (!/\S/.test(newTopicName.value)) {
		return;
	}

	socket.emit(
		"new-room",
		window.cookieId,
		newTopicName.value,
		visible,
		check18.checked,
	);

	newTopicName.value = "";
	check18.checked = false;
	newTopicDialog.close();
};

newTopicName.onkeydown = e => {
	if (e.keyCode === 13) {
		e.preventDefault();
		newTopicName.blur();
	}
};

publicBtn.onclick = () => {
	publicBtn.classList.add("clicked");

	if (privateBtn.classList.contains("clicked")) {
		privateBtn.classList.remove("clicked");
	}
	switchTo("public");
};

privateBtn.onclick = () => {
	privateBtn.classList.add("clicked");
	if (publicBtn.classList.contains("clicked")) {
		publicBtn.classList.remove("clicked");
	}
	switchTo("private");
};

searchBar.oninput = () => {
	if (searchBar.value === "") {
		clearRoom();
		socket.emit("rooms", window.cookieId, visible);
	} else {
		clearRoom();
		socket.emit("findrooms", window.cookieId, visible, searchBar.value);
	}
};

searchBar.onkeydown = e => {
	if (e.keyCode === 13) {
		e.preventDefault();
		searchBar.blur();
	}
};

function switchTo(visibility) {
	clearRoom();
	visible = visibility;
	socket.emit("rooms", window.cookieId, visible);
}

function clearRoom() {
	const remove = [];
	for (const room of roomsElement.children) {
		if (room.tagName !== "FORM") remove.push(room);
	}
	for (const e of remove) roomsElement.removeChild(e);
}

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
		socket.emit("typing-kill", window.cookieId, window.currentRoom);

	window.clearMessage();
	window.currentRoom = id;

	activeRoom?.classList.remove("topic-bg-colour");
	topic.classList.add("topic-bg-colour");
	activeRoom = topic;

	textbox.classList.remove("hide");
	// contextMenu.classList.remove("active");
	socket.emit("fetch-typing", window.cookieId, id);
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
			socket.emit(
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

	if (visible === "private") {
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

	if (visible === "private") {
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
			socket.emit("pin", window.cookieId, room._id);
			pinTopic(topic);
		} else if (pinText.textContent === "Unpin") {
			pinText.textContent = "Pin";
			socket.emit("unpin", window.cookieId, room._id);
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
		socket.emit("leave", window.cookieId, room._id);
		wrapper.classList.remove("active");
		e.stopPropagation();
	};

	return wrapper;
}
