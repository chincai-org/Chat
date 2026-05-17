import cookieParser from "cookie-parser";
import type { Request, Response } from "express";
import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import { command, getRole } from "./command.ts";
import { canAccessRoom } from "./room-access.ts";
import type {
	ClientToServerEvents,
	InterServerEvents,
	RoomDoc,
	RoomSummary,
	ServerToClientEvents,
	SocketData,
	UserDoc,
} from "./types.ts";
import * as utils from "./utils.ts";

const app = express();
const server = http.createServer(app);
const io = new Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>(server, {
	cors: {
		origin: process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : true,
		methods: ["GET", "POST"],
	},
});
const port = process.env.PORT || 3000;
const usersTyping: Record<string, Record<string, number>> = {};

const enum LOGIN_ERROR {
	EMPTY = 1 << 0,
	WRONG = 1 << 1,
}

const enum SIGNUP_ERROR {
	EMPTY = 1 << 0,
	INVALID_CHARS = 1 << 1,
	USER_TAKEN = 1 << 2,
	USER_TOO_SHORT = 1 << 3,
	USER_TOO_LONG = 1 << 4,
	NAME_TOO_LONG = 1 << 5,
	PASS_MISMATCH = 1 << 6,
	PASS_TOO_SHORT = 1 << 7,
	PASS_TOO_LONG = 1 << 8,
	TOO_OLD = 1 << 9,
	TOO_YOUNG = 1 << 10,
}

const MAX_ROOMS_FETCH = 50;
const MAX_TOPIC_CREATE = 3;
const MESSAGE_COOLDOWN_MS = 200;

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: "Too many attempts. Please try again in 15 minutes.",
	standardHeaders: true,
	legacyHeaders: false,
});

const errors: {
	login: Record<number, string>;
	signup: Record<number, string>;
} = {
	login: {
		[LOGIN_ERROR.EMPTY]: "Please don't leave this empty. ",
		[LOGIN_ERROR.WRONG]: "Username or password is not correct. ",
	},
	signup: {
		// ALL
		[SIGNUP_ERROR.EMPTY]: "Please don't leave this empty. ",
		// ===USERNAME===
		[SIGNUP_ERROR.INVALID_CHARS]:
			"Please use character between A to Z and 0 to 9 and _ only. ",
		[SIGNUP_ERROR.USER_TAKEN]: "This username cannot be used. ",
		[SIGNUP_ERROR.USER_TOO_SHORT]:
			"Username must be at least 3 characters. ",
		[SIGNUP_ERROR.USER_TOO_LONG]:
			"Username must be at most 15 characters. ",
		// ===NAME===
		[SIGNUP_ERROR.NAME_TOO_LONG]:
			"Display name must be at most 15 characters. ",
		// ===CONFIRM PASSWORD===
		[SIGNUP_ERROR.PASS_MISMATCH]: "This is not the same with password. ",
		// ===PASSWORD===
		[SIGNUP_ERROR.PASS_TOO_SHORT]:
			"Password must be at least 6 characters. ",
		[SIGNUP_ERROR.PASS_TOO_LONG]:
			"Password must be at most 30 characters. ",
		// ===BIRTHDAY===
		[SIGNUP_ERROR.TOO_OLD]:
			"Go register for Guinness World Records before signing up an account",
		[SIGNUP_ERROR.TOO_YOUNG]: "Too young to have a chat account",
	},
};

type AuthContext = {
	user: UserDoc;
	room: RoomDoc;
	socket: import("socket.io").Socket;
};

function isLetter(char: string) {
	const code = char.charCodeAt(0);
	return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isDigit(char: string) {
	return char >= "0" && char <= "9";
}

function isValidUsername(username: string) {
	for (const char of username) {
		if (!isLetter(char) && !isDigit(char) && char !== "_") return false;
	}
	return true;
}

function getCookieFromHeader(cookieHeader: string | undefined, name: string) {
	const cookies = cookieHeader?.split(";") ?? [];
	for (const cookie of cookies) {
		const [key, ...valParts] = cookie.split("=");
		if (key?.trim() === name) return decodeURIComponent(valParts.join("="));
	}
	return "";
}

function getLoginError(code: number) {
	if (code <= 0) return { username: "", password: "" };
	const get = (...bits: number[]) =>
		bits.reduce((msg, b) => msg + (code & b ? errors.login[b] : ""), "");
	const msg = get(LOGIN_ERROR.EMPTY, LOGIN_ERROR.WRONG);
	return { username: msg, password: msg };
}

function getSignupErrors(code: number) {
	if (code <= 0)
		return {
			name: "",
			username: "",
			password: "",
			confirmpassword: "",
			birthday: "",
		};
	const get = (...bits: number[]) =>
		bits.reduce((msg, b) => msg + (code & b ? errors.signup[b] : ""), "");
	const empty = get(SIGNUP_ERROR.EMPTY);
	return {
		name: empty + get(SIGNUP_ERROR.NAME_TOO_LONG),
		username:
			empty +
			get(
				SIGNUP_ERROR.INVALID_CHARS,
				SIGNUP_ERROR.USER_TAKEN,
				SIGNUP_ERROR.USER_TOO_SHORT,
				SIGNUP_ERROR.USER_TOO_LONG,
			),
		password:
			empty +
			get(SIGNUP_ERROR.PASS_TOO_SHORT, SIGNUP_ERROR.PASS_TOO_LONG),
		confirmpassword: empty + get(SIGNUP_ERROR.PASS_MISMATCH),
		birthday: empty + get(SIGNUP_ERROR.TOO_OLD, SIGNUP_ERROR.TOO_YOUNG),
	};
}

function sendLoginError(res: Response, code: number) {
	res.cookie("e", String(code));
	res.redirect("/login");
}

function sendSignupError(res: Response, code: number) {
	res.cookie("e", String(code));
	res.redirect("/signup");
}

async function generateUserId() {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let id = "";
	do {
		id = Array.from(
			{ length: 20 },
			() => chars[Math.floor(Math.random() * chars.length)],
		).join("");
	} while (await utils.findUserByCookie(id));
	return id;
}

function setAuthCookie(res: Response, cookieId: string) {
	res.cookie("id", cookieId, {
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});
}

function emitError(socket: import("socket.io").Socket, message: string) {
	socket.emit("msg", utils.generateWarningMessage(message));
}

async function getUserByCookie(cookieId: string): Promise<UserDoc | null> {
	return (await utils.findUserByCookie(cookieId)) as UserDoc | null;
}

async function getRoom(roomId: string): Promise<RoomDoc | null> {
	return (await utils.findRoom(roomId)) as RoomDoc | null;
}

async function authUser(
	socket: import("socket.io").Socket,
	cookieId: string,
): Promise<UserDoc | null> {
	const user = await getUserByCookie(cookieId);
	if (!user) {
		emitError(socket, utils.MSG_PREFIX + utils.NO_USER);
		return null;
	}
	return user;
}

async function authRoom(
	socket: import("socket.io").Socket,
	roomId: string,
): Promise<RoomDoc | null> {
	const room = await getRoom(roomId);
	if (!room) {
		emitError(socket, utils.MSG_PREFIX + utils.NO_ROOM);
		return null;
	}
	return room;
}

async function authUserRoom(
	socket: import("socket.io").Socket,
	cookieId: string,
	roomId: string,
): Promise<AuthContext | null> {
	const user = await authUser(socket, cookieId);
	if (!user) return null;
	const room = await authRoom(socket, roomId);
	if (!room) return null;
	if (!canAccessRoom(user, room)) {
		emitError(socket, utils.MSG_PREFIX + utils.NOT_IN_ROOM);
		return null;
	}
	return { user, room, socket };
}

function typingKill(
	username: string,
	roomId: string,
	socket: import("socket.io").Socket<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>,
) {
	try {
		delete usersTyping[roomId][username];
		socket.broadcast.emit("typing-kill", username);
	} catch {}
}

app.use(express.static("public"));
app.use(compression());

if (process.env.NODE_ENV === "production") {
	app.use("/dist", express.static("dist"));
}

app.use("/vendor/linkifyjs", express.static("node_modules/linkifyjs/dist"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

io.use(async (socket, next) => {
	const cookieId = getCookieFromHeader(socket.handshake.headers.cookie, "id");
	if (cookieId && (await utils.findUserByCookie(cookieId))) return next();
	const apiKey = socket.handshake.auth?.apiKey;
	if (apiKey && (await utils.isValidApiKey(apiKey))) return next();
	next(new Error("Unauthorized"));
});

app.set("view engine", "ejs");

app.get("/", (_req: Request, res: Response) => res.redirect("/home"));
app.get("/home", (_req: Request, res: Response) => res.render("home.ejs", { env: process.env.NODE_ENV || "development" }));
app.get("/tac", (_req: Request, res: Response) => res.render("tac.ejs"));
app.get("/about", (_req: Request, res: Response) => res.render("about.ejs"));

app.get(
	"/chat",
	utils.checkLogin,
	utils.checkBan,
	async (req: Request, res: Response) => {
		const user = await utils.findUserByCookie(req.cookies.id);
		if (!user) return res.redirect("/login");
		res.render("main.ejs", {
			displayName: user.displayName,
			username: user.username,
			env: process.env.NODE_ENV || "development",
		});
	},
);

app.get("/login", (req: Request, res: Response) => {
	const errorCode = req.cookies.e ? +req.cookies.e : -1;
	res.clearCookie("e");
	res.render("login.ejs", { ...getLoginError(errorCode), env: process.env.NODE_ENV || "development" });
});

app.get("/signup", (req: Request, res: Response) => {
	const errorCode = req.cookies.e ? +req.cookies.e : -1;
	res.clearCookie("e");
	res.render("signup.ejs", { ...getSignupErrors(errorCode), env: process.env.NODE_ENV || "development" });
});

app.post("/login_validator", authLimiter, async (req: Request, res: Response) => {
	const { username, password } = req.body;
	const user = await utils.findUserByUsername(username);
	let errorCode = 0;
	if (!username) errorCode |= LOGIN_ERROR.EMPTY;
	if (!password) errorCode |= LOGIN_ERROR.EMPTY;
	if (!user || user.password !== (await utils.sha256(password)))
		errorCode |= LOGIN_ERROR.WRONG;
	if (errorCode > 0) return sendLoginError(res, errorCode);
	setAuthCookie(res, user.cookieId);
	res.redirect("/chat");
});

app.post("/signup_validator", authLimiter, async (req: Request, res: Response) => {
	const ipAddress = req.ip;
	const device = await utils.findDevice(ipAddress);
	if (device && device.amount >= 2)
		return res.send("You created to many account");
	const { name, username, password, confirmpassword, birthday } = req.body;
	const bday = new Date(birthday);
	let errorCode = 0;
	if (!name) errorCode |= SIGNUP_ERROR.EMPTY;
	else if (name.length > 15) errorCode |= SIGNUP_ERROR.NAME_TOO_LONG;
	if (!username) errorCode |= SIGNUP_ERROR.EMPTY;
	if (username.length < 3) errorCode |= SIGNUP_ERROR.USER_TOO_SHORT;
	if (username.length > 15) errorCode |= SIGNUP_ERROR.USER_TOO_LONG;
	if (!password) errorCode |= SIGNUP_ERROR.EMPTY;
	if (password.length < 6) errorCode |= SIGNUP_ERROR.PASS_TOO_SHORT;
	if (password.length > 30) errorCode |= SIGNUP_ERROR.PASS_TOO_LONG;
	if (!confirmpassword) errorCode |= SIGNUP_ERROR.EMPTY;
	if (!birthday) errorCode |= SIGNUP_ERROR.EMPTY;
	if (!isValidUsername(username)) errorCode |= SIGNUP_ERROR.INVALID_CHARS;
	if (await utils.findUserByUsername(username))
		errorCode |= SIGNUP_ERROR.USER_TAKEN;
	if (password !== confirmpassword) errorCode |= SIGNUP_ERROR.PASS_MISMATCH;
	const ageYears =
		new Date(Date.now() - bday.getTime()).getUTCFullYear() - 1970;
	if (ageYears > 120) errorCode |= SIGNUP_ERROR.TOO_OLD;
	if (ageYears < 1) errorCode |= SIGNUP_ERROR.TOO_YOUNG;
	if (errorCode > 0) return sendSignupError(res, errorCode);
	const id = await generateUserId();
	await utils.createUser(name, username, password, bday, id, ipAddress);
	setAuthCookie(res, id);
	res.redirect("/chat");
});

app.post("/get_user_by_cookie_id", async (req: Request, res: Response) => {
	const { id } = req.body;
	const user = await utils.findUserByCookie(id);
	if (!user) return res.status(404).json({ error: utils.NO_USER });
	return res.json({
		displayName: user.displayName,
		username: user.username,
		avatar: user.avatar,
	});
});

app.post("/get_message", async (req: Request, res: Response) => {
	const { cookieId, roomId, start } = req.body;
	const user = await utils.findUserByCookie(cookieId);
	const room = await utils.findRoom(roomId);
	if (!user) return res.status(401).json({ error: utils.NO_USER });
	if (!room) return res.status(404).json({ error: utils.NO_ROOM });
	if (!canAccessRoom(user, room))
		return res.status(403).json({ error: utils.NOT_IN_ROOM });
	const fetchAmt = 30;
	const end =
		start === "last"
			? room.messages.length
			: room.messages.findIndex(e => e.id === start);
	if (end < 0) return res.json([]);
	const messages = [];
	for (let i = Math.max(0, end - fetchAmt); i < end; i++) {
		const msg = room.messages[i];
		const author = (await utils.findUserByUsername(msg.author)) || {
			displayName: "DELETED_USER",
			username: "deleted_user",
			avatar: "/assets/dead.png",
		};
		messages.push({
			id: msg.id,
			authorName: author.displayName,
			authorUsername: author.username,
			avatar: author.avatar,
			content: msg.content,
			time: msg.createdAt,
			pings: await utils.findPings(msg.content),
			topicIds: await utils.findHashtagTopic(msg.content),
		});
	}
	return res.json(messages);
});

app.post("/is_username_valid", async (req: Request, res: Response) => {
	const { username } = req.body;
	return res.json({ res: !!(await utils.findUserByUsername(username)) });
});

app.post("/auto_complete", async (req: Request, res: Response) => {
	const { roomId, nameQuery } = req.body;
	const user = await utils.findUserByUsernameQuery(roomId, nameQuery);
	return res.json({ res: user ? user.username : null });
});

app.get("*", (_req: Request, res: Response) =>
	res.status(404).render("error.ejs", { error: 404, env: process.env.NODE_ENV || "development" }),
);

io.on("connection", socket => {
	socket.on("msg", async (cookieId, roomId, msg) => {
		const ctx = await authUserRoom(socket, cookieId, roomId);
		if (!ctx) return;
		const { user, room } = ctx;
		const muteObject = room?.muted?.find(m => m.username === user.username);
		if (room.locked && getRole(user, room) === "member") {
			emitError(socket, `${utils.MSG_PREFIX}Topic locked`);
			return;
		}
		if (muteObject) {
			emitError(
				socket,
				`${utils.MSG_PREFIX + utils.MUTED} for ${muteObject.reason}`,
			);
			return;
		}
		const now = Date.now();
		if (now - user.lastMessageTimestamp < MESSAGE_COOLDOWN_MS) {
			emitError(socket, "Bro chill you sending message too fast");
			return;
		}
		msg = msg.trim();
		const id = await utils.insertMessage(
			roomId,
			user.username,
			msg,
			now,
			1,
		);
		io.emit("msg", {
			id,
			authorName: user.displayName,
			authorUsername: user.username,
			avatar: user.avatar,
			roomId,
			content: msg,
			time: now,
			pings: await utils.findPings(msg),
			topicIds: await utils.findHashtagTopic(msg),
		});
		typingKill(user.username, roomId, socket);
		const [del, response] = await command.parse(
			{ io, socket, user, room },
			msg,
		);
		if (response !== null) {
			const responseStr = String(response);
			let systemMsgId = `SYSTEM${String(del)}$`;
			if (!del)
				systemMsgId = await utils.insertMessage(
					roomId,
					"system",
					responseStr,
					now,
					0,
					systemMsgId,
				);
			io.emit("msg", {
				id: systemMsgId,
				authorName: "System",
				authorUsername: "system",
				avatar: "/assets/system.png",
				roomId,
				content: responseStr,
				time: now,
				pings: await utils.findPings(responseStr),
				topicIds: [],
			});
		}
	});

	socket.on("rooms", async (cookieId, visibility) => {
		const user = await authUser(socket, cookieId);
		if (!user) return;
		if (!visibility) {
			emitError(socket, utils.NO_SELECT_VISIBILITY);
			return;
		}
		const pins = user.pins?.[visibility] || [];
		for (const pin of pins) {
			const pinRoom = await utils.findRoom(String(pin._id));
			pin.members = pinRoom?.members || [];
		}
		const rooms = (await utils.findRoomWithUser(
			user.username,
			visibility,
			pins.length + MAX_ROOMS_FETCH,
		)) as RoomSummary[];
		socket.emit("rooms", rooms, pins);
	});

	socket.on("findrooms", async (cookieId, visibility, query) => {
		const user = await authUser(socket, cookieId);
		if (!user) return;
		if (!visibility) {
			emitError(socket, utils.NO_SELECT_VISIBILITY);
			return;
		}
		const rooms = (await utils.findRoomWithUserAndQuery(
			user.username,
			visibility,
			query || "",
		)) as RoomSummary[];
		const pins = (user.pins?.[visibility] || []).filter(
			(e: { name: string }) =>
				e.name.toLowerCase().includes((query || "").toLowerCase()),
		);
		socket.emit("rooms", rooms, pins);
	});

	socket.on("new-room", async (cookieId, name, visibility, nsfw = false) => {
		const user = await authUser(socket, cookieId);
		if (!user) return;
		if (!name?.trim()) {
			emitError(socket, "Please type room name");
			return;
		}
		if (visibility === "public" && (await utils.findRoomByName(name))) {
			emitError(socket, "Room name already exist");
			return;
		}
		if ((user.topicCreated || 0) >= MAX_TOPIC_CREATE) {
			emitError(socket, "Max limit for topic creation reached");
			return;
		}
		const result = await utils.createRoom(
			name,
			visibility,
			user.username,
			nsfw,
		);
		const roomData = { _id: result.insertedId.toString(), name };
		if (visibility === "public") io.emit("room", roomData);
		else socket.emit("room", roomData);
	});

	socket.on("change-name", async (cookieId, roomId, newName) => {
		const ctx = await authUserRoom(socket, cookieId, roomId);
		if (!ctx) return;
		const { user, room } = ctx;
		if (!newName) {
			emitError(socket, "Missing arg: newName");
			return;
		}
		if (getRole(user, room) === "member") {
			emitError(socket, utils.NO_PERM);
			return;
		}
		await utils.changeRoomName(roomId, newName);
		socket.broadcast.emit("change-name", roomId, newName);
	});

	socket.on("typing", async (cookieId, roomId, timeStart) => {
		const ctx = await authUserRoom(socket, cookieId, roomId);
		if (!ctx) return;
		const { user } = ctx;
		usersTyping[roomId] ||= {};
		usersTyping[roomId][user.username] = timeStart;
		socket.broadcast.emit("typing", user.username, roomId, timeStart);
	});

	socket.on("fetch-typing", async (cookieId, roomId) => {
		const ctx = await authUserRoom(socket, cookieId, roomId);
		if (!ctx) return;
		const { user } = ctx;
		const result = Object.assign({}, usersTyping[roomId] || {});
		delete result[user.username];
		socket.emit("typings", result);
	});

	socket.on("typing-kill", async (id, roomId) => {
		const ctx = await authUserRoom(socket, id, roomId);
		if (!ctx) return;
		const { user } = ctx;
		typingKill(user.username, roomId, socket);
	});

	socket.on("leave", async (cookieId, roomId) => {
		const ctx = await authUserRoom(socket, cookieId, roomId);
		if (!ctx) return;
		const { room } = ctx;
		if (room.visibility === "public") {
			emitError(socket, "Can't leave public room!");
			return;
		}
		await utils.removeUser(cookieId, roomId);
	});

	socket.on("delete-msg", async (cookieId, roomId, messageId) => {
		const ctx = await authUserRoom(socket, cookieId, roomId);
		if (!ctx) return;
		const { user, room } = ctx;
		const role = getRole(user, room);
		const message = room.messages.find(msg => msg.id === messageId);
		if (!message) {
			emitError(socket, utils.NO_MESESAGE);
			return;
		}
		if (role === "member" && message.author !== user.username) {
			emitError(socket, utils.NO_PERM);
			return;
		}
		await utils.deleteMessage(roomId, messageId);
		io.emit("delete", messageId);
	});

	socket.on("pin", async (cookieId, roomId) => {
		const ctx = await authUserRoom(socket, cookieId, roomId);
		if (!ctx) return;
		const { user } = ctx;
		await utils.pinRoom(user._id.toString(), roomId);
	});

	socket.on("unpin", async (cookieId, roomId) => {
		const ctx = await authUserRoom(socket, cookieId, roomId);
		if (!ctx) return;
		const { user } = ctx;
		await utils.unpinRoom(user._id.toString(), roomId);
	});
});

server.listen(port);
console.log(`Server running at http://localhost:${port}`);
