function getCookie(cname) {
	const name = `${cname}=`;
	const decodedCookie = decodeURIComponent(document.cookie);
	const ca = decodedCookie.split(";");
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === " ") {
			c = c.substring(1);
		}
		if (c.startsWith(name)) {
			return c.substring(name.length);
		}
	}
	return "";
}

window.textbox = document.getElementById("text");
const outerWrap = document.getElementById("outer-wrap");
const down = document.getElementById("scroll-down");
const newMsgCounter = document.getElementById("new-msg-counter");
const chat = document.getElementById("outer-wrap");
const typing = document.getElementById("typing");

window.timeoutPreference = 5000;
window.usersTyping = {};
window._isAtBottomMost = true;

let openedContextMenu = null;
let allowFetch = true;

window.cookieId = getCookie("id");
window.topicDblclick = null;

window.clearMessage = () => {
	outerWrap.innerHTML = "";
};

window.topicMaker = () => ({
	search: "",
	visible: "public",
	init() {
		this.visible = window._visible;
		if (window.socket) {
			window.socket.emit("rooms", window.cookieId, this.visible);
		}
	},
	onSearch() {
		window.clearRoom();
		this.visible = window._visible;
		if (window.socket) {
			if (this.search) {
				window.socket.emit(
					"findrooms",
					window.cookieId,
					this.visible,
					this.search,
				);
			} else {
				window.socket.emit("rooms", window.cookieId, this.visible);
			}
		}
	},
	switchTo(v) {
		this.search = "";
		this.visible = v;
		window._visible = v;
		window.clearRoom();
		if (window.socket) {
			window.socket.emit("rooms", window.cookieId, v);
		}
	},
});
window._visible = "public";

window.onSearch = value => {
	if (!window.socket) return;
	const visible = window._visible;
	window.clearRoom();
	if (value) {
		window.socket.emit("findrooms", window.cookieId, visible, value);
	} else {
		window.socket.emit("rooms", window.cookieId, visible);
	}
};

window.clearRoom = () => {
	const roomsElement = document.getElementById("rooms");
	const remove = [];
	for (const room of roomsElement.children) {
		if (room.tagName !== "FORM") remove.push(room);
	}
	for (const e of remove) roomsElement.removeChild(e);
};

function isLetter(char) {
	const code = char.charCodeAt(0);
	return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isDigit(char) {
	return char >= "0" && char <= "9";
}

function isUrlChar(char) {
	return !/\s/.test(char);
}

function isMentionChar(char) {
	return isLetter(char) || isDigit(char) || char === "_";
}

function isHashtagChar(char) {
	return isLetter(char) || isDigit(char);
}

function isUrlStart(text, index) {
	return (
		text[index] === "h" &&
		text[index + 1] === "t" &&
		(text[index + 2] === "t"
			? text[index + 3] === "p"
			: text[index + 2] === ":")
	);
}

function parseContent(text) {
	const tokens = [];
	let i = 0;
	while (i < text.length) {
		if (isUrlStart(text, i) || (text[i] === "h" && text[i + 1] === ":")) {
			const start = i;
			while (i < text.length && isUrlChar(text[i])) i++;
			tokens.push({ type: "url", value: text.slice(start, i) });
		} else if (text[i] === "@") {
			const start = i++;
			while (i < text.length && isMentionChar(text[i])) i++;
			tokens.push({ type: "mention", value: text.slice(start, i) });
		} else if (text[i] === "#") {
			const start = i++;
			while (i < text.length && isHashtagChar(text[i])) i++;
			tokens.push({ type: "hashtag", value: text.slice(start, i) });
		} else {
			const start = i;
			while (
				i < text.length &&
				text[i] !== "@" &&
				text[i] !== "#" &&
				!(
					isUrlStart(text, i) ||
					(text[i] === "h" && text[i + 1] === ":")
				)
			) {
				i++;
			}
			tokens.push({ type: "text", value: text.slice(start, i) });
		}
	}
	return tokens;
}

function appendMessageContent(node, content, pings, topicIds) {
	const topicMap = new Map(topicIds.map(topic => [topic.id, topic.name]));
	const pingSet = new Set(pings);
	const tokens = parseContent(content);
	for (const token of tokens) {
		if (token.type === "url") {
			const link = document.createElement("a");
			link.className = "links";
			link.target = "_blank";
			link.rel = "noreferrer";
			link.href = token.value;
			link.textContent = token.value;
			node.append(link);
		} else if (token.type === "mention") {
			const username = token.value.slice(1);
			if (pingSet.has(username)) {
				const span = document.createElement("span");
				span.className = "mention";
				span.textContent = token.value;
				node.append(span);
			} else {
				node.append(document.createTextNode(token.value));
			}
		} else if (token.type === "hashtag") {
			const topicId = token.value.slice(1);
			const topicName = topicMap.get(topicId);
			if (topicName) {
				const span = document.createElement("span");
				span.className = "hashtag";
				span.textContent = `#${topicName}`;
				span.onclick = () => redirectTopic(topicId);
				node.append(span);
			} else {
				node.append(document.createTextNode(token.value));
			}
		} else {
			node.append(document.createTextNode(token.value));
		}
	}
}

function setScrollState(isBottom) {
	window._isAtBottomMost = isBottom;
	down.classList.toggle("hide", isBottom);
	if (isBottom) {
		newMsgCounter.innerText = "0";
		newMsgCounter.classList.add("hide");
	}
}

chat.onscroll = () => {
	if (Math.ceil(chat.scrollHeight - chat.scrollTop) === chat.clientHeight) {
		setScrollState(true);
	} else {
		setScrollState(false);
	}

	if (
		allowFetch &&
		chat.scrollTop - chat.clientHeight + chat.scrollHeight < 2
	) {
		if (outerWrap.firstChild) {
			fetchMsg(
				window.cookieId,
				window.currentRoom,
				outerWrap.firstChild.id,
			);
		}
		allowFetch = false;
	}
	setTimeout(() => {
		allowFetch = true;
	}, 500);
};

down.onclick = () => {
	chat.scrollTop = chat.scrollHeight;
};

textbox.onkeydown = e => {
	if (e.keyCode === 13 && !e.shiftKey) {
		if (!/\S/.test(textbox.innerText)) {
			return;
		}
		e.preventDefault();
		sendMessage(textbox.innerText);
	}

	if (e.keyCode === 9) {
		e.preventDefault();
		const foundResult = textbox.innerText.match(/(?<=@)[a-zA-Z0-9_]+$/);

		if (foundResult) {
			const nameQuery = foundResult[0];
			autoComplete(nameQuery)
				.then(res => {
					const result = res.res;
					if (result) {
						textbox.innerText = textbox.innerText.replace(
							new RegExp(`${nameQuery}$`),
							result,
						);
						const range = document.createRange();
						const selection = window.getSelection();
						range.selectNodeContents(textbox);
						range.collapse(false);
						selection.removeAllRanges();
						selection.addRange(range);
					}
				})
				.catch(console.error);
		}
	}
};

textbox.oninput = () => {
	window.socket?.emit(
		"typing",
		window.cookieId,
		window.currentRoom,
		Date.now(),
	);

	document.onclick = e => {
		openedContextMenu?.classList.remove("active");
		openedContextMenu = null;
		if (window.topicDblclick && !window.topicDblclick.contains(e.target)) {
			window.topicDblclick.contentEditable = "false";
			window.socket?.emit(
				"change-name",
				window.cookieId,
				window.topicDblclick.id,
				window.topicDblclick.children[0].innerText,
			);
			window.topicDblclick = null;
		}
	};
};

document.onclick = e => {
	openedContextMenu?.classList.remove("active");
	openedContextMenu = null;
	if (window.topicDblclick && !window.topicDblclick.contains(e.target)) {
		window.topicDblclick.contentEditable = "false";
		socket.emit(
			"change-name",
			window.cookieId,
			window.topicDblclick.id,
			window.topicDblclick.children[0].innerText,
		);
		window.topicDblclick = null;
	}
};

async function postData(url, method, data) {
	return await fetch(url, {
		method: method,
		mode: "cors",
		cache: "no-cache",
		credentials: "same-origin",
		headers: {
			"Content-Type": "application/json",
		},
		redirect: "follow",
		referrerPolicy: "no-referrer",
		body: JSON.stringify(data),
	});
}

function _sizeOfChat(d) {
	document.getElementById("chatting").style.width = d;
}
window.sizeOfChat = _sizeOfChat;

function _lengthOfText(d) {
	document.getElementById("text").style.width = d;
}
window.lengthOfText = _lengthOfText;

async function autoComplete(nameQuery) {
	return (
		await postData("/auto_complete", "POST", {
			roomId: currentRoom,
			nameQuery: nameQuery,
		})
	).json();
}

function updateTypingUsers() {
	const users = Object.keys(window.usersTyping);
	if (users.length === 0) {
		typing.innerText = " ";
	} else {
		const toBe = users.length === 1 ? "is" : "are";
		const firstTwo = users.slice(
			0,
			Math.max(1, Math.min(2, users.length - 1)),
		);
		const lastFew = users.slice(firstTwo.length, users.length);
		const lastFewLength = lastFew.length;

		const beforeAnd = firstTwo.join(", ");
		const afterAnd = // The most insane ternary operator usage
			(lastFewLength ? "and " : "") +
			(lastFewLength > 1
				? `${lastFewLength > 99 ? "99+" : lastFewLength} more`
				: lastFew.join());

		typing.innerText = `${beforeAnd} ${afterAnd} ${toBe} typing...`;
	}
}

function sendMessage(msg) {
	if (msg.length > 700) {
		return;
	}
	textbox.innerText = "";
	window.socket?.emit("msg", window.cookieId, window.currentRoom, msg);
	chat.scrollTop = chat.scrollHeight;
}

function fetchMsg(cookieId, roomId, messageId) {
	fetch("/get_message", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			cookieId,
			roomId,
			start: messageId === 0 ? "last" : messageId,
		}),
	})
		.then(res => res.json())
		.then(response => {
			if (messageId !== 0) {
				response.reverse();
			}
			for (const msg of response) {
				createMsg(
					msg.id,
					msg.authorName,
					msg.authorUsername,
					msg.avatar,
					msg.content,
					msg.time,
					msg.pings,
					msg.topicIds,
					messageId !== 0,
				);
			}
		})
		.catch(error => {
			console.error(`Error: ${error}`);
		});
}

async function createMsg(
	id,
	authorName,
	authorUsername,
	avatar,
	content,
	time,
	pings,
	topicIds,
	isOld,
) {
	const msgContextMenu = createMsgContextMenu(id);
	const date = new Date(time);

	const containers = document.createElement("div");
	containers.className = "container";
	containers.id = id;

	containers.oncontextmenu = e => {
		e.preventDefault();

		openedContextMenu?.classList.remove("active");
		msgContextMenu.classList.add("active");

		openedContextMenu = msgContextMenu;

		const x = Math.min(
			e.clientX,
			window.innerWidth - msgContextMenu.offsetWidth,
		);
		const y = Math.min(
			e.clientY,
			window.innerHeight - msgContextMenu.offsetHeight,
		);

		msgContextMenu.style.left = `${(x / window.innerWidth) * 100}vw`;
		msgContextMenu.style.top = `${(y / window.innerHeight) * 100}vh`;
	};

	const textContainer = document.createElement("div");
	textContainer.className = "text-container";

	const name = document.createElement("h5");
	name.innerText = authorName;

	const username = document.createElement("span");
	username.innerText = `@${authorUsername}`;
	username.className = "username";
	username.onclick = () => {
		textbox.innerText += `@${authorUsername}`;
	};
	// username.onclick = () => {textbox.innerHTML += `<span class="mention">@${username}</span>`};

	const msg = document.createElement("p");
	msg.className = "msg";
	appendMessageContent(msg, content, pings, topicIds);

	for (const ping of pings) {
		if (ping === authorUsername) {
			containers.classList.add("mention-container");
		}
	}

	const clock = document.createElement("span");
	clock.className = "time";
	clock.innerText =
		String(date.getDate()) +
		"/" +
		String(date.getMonth() + 1) +
		"/" +
		String(date.getFullYear()) +
		" " +
		date.toLocaleTimeString().slice(0, -6) +
		(date.getHours() > 11 ? " PM" : " AM");

	const image = document.createElement("img");
	image.alt = "default";
	image.src = avatar;
	image.className = "image";

	name.appendChild(username);

	textContainer.appendChild(name);
	textContainer.appendChild(msg);
	textContainer.appendChild(clock);

	containers.appendChild(image);
	containers.appendChild(textContainer);
	containers.appendChild(msgContextMenu);

	isOld
		? outerWrap.insertBefore(containers, outerWrap.firstChild)
		: outerWrap.appendChild(containers);

	if (id.startsWith("SYSTEM")) {
		containers.classList.add("system-colour");
		clock.classList.add("system-colour");

		const deleteAfter = +id.split("$")[0].slice(6, id.length);

		if (deleteAfter)
			setTimeout(() => {
				if (containers.parentNode === outerWrap) {
					outerWrap.removeChild(containers);
				}
			}, deleteAfter);
	}
}

function createMsgContextMenu(id) {
	const wrapper = document.createElement("div");
	wrapper.className = "wrapper";

	const menuContent = document.createElement("div");
	menuContent.className = "menu-content";

	const menu = document.createElement("ul");
	menu.className = "menu";

	const itemTrash = document.createElement("li");
	itemTrash.className = "item";

	const iTrash = document.createElement("i");
	iTrash.className = "fa-solid fa-trash";
	const spanTrash = document.createElement("span");
	spanTrash.innerText = "Delete";

	const copyId = document.createElement("div");
	copyId.className = "copy-id";

	const itemCopyId = document.createElement("li");
	itemCopyId.className = "item";

	const ICopyId = document.createElement("i");
	ICopyId.className = "fa-solid fa-id-card-clip";
	const spanCopyId = document.createElement("span");
	spanCopyId.innerText = "Copy ID";

	itemTrash.appendChild(iTrash);
	itemTrash.appendChild(spanTrash);
	menu.appendChild(itemTrash);
	itemCopyId.appendChild(ICopyId);
	itemCopyId.appendChild(spanCopyId);
	copyId.appendChild(itemCopyId);
	menuContent.appendChild(menu);
	menuContent.appendChild(copyId);
	wrapper.appendChild(menuContent);

	itemCopyId.onclick = e => {
		wrapper.classList.remove("active");
		navigator.clipboard.writeText(id);
		e.stopPropagation();
	};

	itemTrash.onclick = e => {
		window.socket?.emit(
			"delete-msg",
			window.cookieId,
			window.currentRoom,
			id,
		);
		wrapper.classList.remove("active");
		e.stopPropagation();
	};

	return wrapper;
}

// Remove typing users that reached the timeoutPreference
setInterval(() => {
	try {
		const now = Date.now();
		let change = false;
		for (const [username, startTime] of Object.entries(
			window.usersTyping,
		)) {
			if (now - startTime > window.timeoutPreference) {
				delete window.usersTyping[username];
				change = true;
				window.socket?.emit(
					"typing-kill",
					username,
					window.currentRoom,
				);
			}
		}
		if (change) updateTypingUsers();
	} catch (e) {
		console.error(e);
	}
}, 2000);

window.fetchMsg = fetchMsg;
window.updateTypingUsers = updateTypingUsers;
window.createMsg = createMsg;
