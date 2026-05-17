import crypto from "node:crypto";
import { config } from "dotenv";
import type { NextFunction, Request, Response } from "express";
import { MongoClient, ObjectId } from "mongodb";
import type { MessageDoc, RoomDoc, RoomSummary, UserDoc } from "./types.ts";

config();
const uri = process.env.uri;
const client = new MongoClient(uri);
const colors = ["blue", "green", "purple", "red", "yellow"];

export const MSG_PREFIX = "Message failed to send: ";
export const NO_USER = "User not found";
export const NO_ROOM = "Topic not found";
export const NO_MESESAGE = "Message not found";
export const NOT_IN_ROOM = "You are not a member of this topic";
export const MUTED = "You are muted";
export const NO_SELECT_VISIBILITY = "Please select a PUBLIC | PRIVATE";
export const NO_PERM = "You don't have the permission";
export const MESSAGE_COOLDOWN = 200;

function randint(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function sha256(plain: string) {
	return crypto.createHash("sha256").update(plain).digest("hex");
}

export async function checkLogin(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const user = await findUserByCookie(req.cookies.id);
	if (!user) return res.redirect("/login");
	next();
}

export async function checkBan(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const user = await findUserByCookie(req.cookies.id);
	if (!user) return res.redirect("/login");
	if (user.banned) return res.send(`You are banned for ${user.banned}`);
	next();
}

export function generateWarningMessage(msg: string) {
	return {
		id: "SYSTEM0",
		authorName: "System",
		authorUsername: "system",
		avatar: "/assets/system.png",
		roomId: "$",
		content: msg,
		time: Date.now(),
	};
}

export async function findPings(msg: string) {
	const pings = [];
	for (const username of new Set(msg.match(/(?<=@)[A-Za-z\d_]+/g) || [])) {
		if (await findUserByUsername(username)) pings.push(username);
	}
	return pings;
}

export async function findHashtagTopic(msg: string) {
	const topicIds = [];
	for (const topicId of new Set(msg.match(/(?<=#)[a-z\d]+/g) || [])) {
		const topic = await findRoom(topicId);
		if (topic && topic.visibility === "public")
			topicIds.push({ id: topicId, name: topic.name });
	}
	return topicIds;
}

export async function findDevice(ipAddress: string) {
	const ip = client.db("db").collection("ip");
	return await ip.findOne({ ipAddress: await sha256(ipAddress) });
}

async function addDeviceToIp(ipAddress: string, amount = 1) {
	const ip = client.db("db").collection("ip");
	await ip.updateOne(
		{ ipAddress: await sha256(ipAddress) },
		{ $inc: { amount } },
		{ upsert: true },
	);
}

export async function isValidApiKey(apiKey: string) {
	const apiKeys = client.db("db").collection("apiKeys");
	return await apiKeys.findOne({ apiKey });
}

export async function createUser(
	displayName: string,
	username: string,
	password: string,
	birthday: Date,
	cookieId: string,
	ipAddress: string,
) {
	const users = client.db("db").collection("users");
	await addDeviceToIp(ipAddress);
	return await users.insertOne({
		displayName,
		username,
		avatar: `assets/default_${colors[randint(0, colors.length - 1)]}.png`,
		password: await sha256(password),
		birthday,
		cookieId,
		rooms: {},
		pins: { public: [], private: [] },
	});
}

export async function createRoom(
	name: string,
	visibility: string,
	creater: string,
	nsfw: boolean,
) {
	const users = client.db("db").collection("users");
	const rooms = client.db("db").collection("rooms");
	const result = await rooms.insertOne({
		name,
		visibility,
		msgId: 0,
		messages: [],
		members: visibility === "public" ? [] : [creater],
		nsfw,
		weeklyMessageAmount: 0,
		lastWeekMessageAmount: 0,
		muted: [],
	});
	await users.updateOne({ username: creater }, { $inc: { topicCreated: 1 } });
	if (visibility === "private")
		await assignRole(creater, result.insertedId.toString(), "admin");
	return result;
}

export async function findUserById(userId: string): Promise<UserDoc | null> {
	try {
		const users = client.db("db").collection("users");
		return (await users.findOne({
			_id: new ObjectId(userId),
		})) as UserDoc | null;
	} catch {
		return null;
	}
}

export async function findUserByUsername(
	username: string,
): Promise<UserDoc | null> {
	const users = client.db("db").collection("users");
	return (await users.findOne({ username })) as UserDoc | null;
}

export async function findUserByUsernameQuery(
	roomId: string,
	username: string,
): Promise<UserDoc | null> {
	try {
		const users = client.db("db").collection("users");
		const room = await findRoom(roomId);
		if (!room) return null;
		const query = {
			username: {
				$regex: new RegExp(`^${escapeRegExp(username)}`),
				$options: "i",
			},
		};
		if (room.visibility === "private")
			query[`rooms.${roomId}`] = { $exists: true };
		return (await users.findOne(query)) as UserDoc | null;
	} catch (e) {
		console.error(e);
		return null;
	}
}

export async function findUserByCookie(
	cookieId: string,
): Promise<UserDoc | null> {
	const users = client.db("db").collection("users");
	return (await users.findOne({ cookieId })) as UserDoc | null;
}

export async function findRoom(roomId: string): Promise<RoomDoc | null> {
	try {
		const rooms = client.db("db").collection("rooms");
		return (await rooms.findOne({
			_id: new ObjectId(roomId),
		})) as RoomDoc | null;
	} catch {
		return null;
	}
}

export async function findRoomByName(name: string): Promise<RoomDoc | null> {
	const rooms = client.db("db").collection("rooms");
	return (await rooms.findOne({
		name,
		visibility: "public",
	})) as RoomDoc | null;
}

export async function findRoomWithUser(
	username: string,
	visibility: string,
	limit = 20,
): Promise<RoomSummary[]> {
	const rooms = client.db("db").collection("rooms");
	return (await rooms
		.find(
			{
				$or: [
					{ visibility: "public" },
					{ "members.username": username },
				],
				visibility,
			},
			{ projection: { _id: 1, name: 1, members: 1 } },
		)
		.sort({ lastWeekMessageAmount: -1, weeklyMessageAmount: -1 })
		.limit(limit)
		.toArray()) as unknown as RoomSummary[];
}

export async function findRoomWithUserAndQuery(
	username: string,
	visibility: string,
	query: string,
): Promise<RoomSummary[]> {
	const rooms = client.db("db").collection("rooms");
	const safeQuery = escapeRegExp(query || "");
	return (await rooms
		.find(
			{
				$or: [
					{ visibility: "public" },
					{ "members.username": username },
				],
				name: { $regex: safeQuery, $options: "i" },
				visibility,
			},
			{ projection: { _id: 1, name: 1, members: 1 } },
		)
		.toArray()) as unknown as RoomSummary[];
}

export async function addUser(
	userId: string,
	roomId: string,
): Promise<undefined | null> {
	const rooms = client.db("db").collection("rooms");
	const user = (await findUserById(userId)) as UserDoc | null;
	if (!user) return null;
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $push: { members: user.username } },
	);
	await assignRole(user.username, roomId, "member");
}

export async function removeUser(
	userId: string,
	roomId: string,
): Promise<undefined | null> {
	const users = client.db("db").collection("users");
	const rooms = client.db("db").collection("rooms");
	const user = (await findUserById(userId)) as UserDoc | null;
	const room = (await findRoom(roomId)) as RoomDoc | null;
	if (!user || !room) return null;
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $pull: { members: { $eq: user.username } } },
	);
	await users.updateOne(
		{ _id: new ObjectId(userId) },
		{
			$pull: { [`pins.${room.visibility}`]: { _id: roomId } },
			$unset: { [`rooms.${roomId}`]: "" },
		},
	);
}

export async function insertMessage(
	roomId: string,
	username: string,
	content: string,
	time: number,
	isHuman: number | string,
	id = "",
): Promise<string | null> {
	const rooms = client.db("db").collection("rooms");
	const users = client.db("db").collection("users");
	const room = (await findRoom(roomId)) as RoomDoc | null;
	if (!room) return null;
	id += room._id.toString() + (room.msgId + 1);
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{
			$push: {
				messages: { id, author: username, content, createdAt: time },
			},
			$inc: { msgId: 1, weeklyMessageAmount: isHuman },
		},
	);
	await users.updateOne(
		{ username },
		{ $set: { lastMessageTimestamp: time } },
	);
	return id;
}

export async function deleteMessage(
	roomId: string,
	msgId: string,
): Promise<unknown> {
	const rooms = client.db("db").collection("rooms");
	return await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $pull: { messages: { id: msgId } } },
	);
}

export async function deleteLastMessages(
	roomId: string,
	amount: number,
): Promise<MessageDoc[]> {
	const rooms = client.db("db").collection("rooms");
	const room = await findRoom(roomId);
	const messages = room.messages;
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $set: { messages: messages.slice(0, messages.length - amount) } },
	);
	return messages.slice(messages.length - amount, messages.length);
}

export async function assignRole(
	username: string,
	roomId: string,
	role: string,
): Promise<void> {
	const users = client.db("db").collection("users");
	await users.updateOne(
		{ username },
		{ $set: { [`rooms.${roomId}`]: role } },
	);
}

export async function pinRoom(
	userId: string,
	roomId: string,
): Promise<undefined | null> {
	const users = client.db("db").collection("users");
	const room = await findRoom(roomId);
	if (!room) return null;
	await users.updateOne(
		{ _id: new ObjectId(userId) },
		{
			$push: {
				[`pins.${room.visibility}`]: { _id: roomId, name: room.name },
			},
		},
	);
}

export async function unpinRoom(
	userId: string,
	roomId: string,
): Promise<undefined | null> {
	const users = client.db("db").collection("users");
	const room = await findRoom(roomId);
	if (!room) return null;
	await users.updateOne(
		{ _id: new ObjectId(userId) },
		{ $pull: { [`pins.${room.visibility}`]: { _id: roomId } } },
	);
}

export async function changeRoomName(
	roomId: string,
	newName: string,
): Promise<void> {
	const rooms = client.db("db").collection("rooms");
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $set: { name: newName } },
	);
}

export async function mute(
	roomId: string,
	username: string,
	reason = "",
): Promise<void> {
	const rooms = client.db("db").collection("rooms");
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $push: { muted: { username, reason } } },
	);
}

export async function unmute(roomId: string, username: string): Promise<void> {
	const rooms = client.db("db").collection("rooms");
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $pull: { muted: { username } } },
	);
}

export async function ban(userId: string, reason: string): Promise<void> {
	const users = client.db("db").collection("users");
	await users.updateOne(
		{ _id: new ObjectId(userId) },
		{ $set: { banned: reason } },
	);
}

export async function unban(userId: string): Promise<void> {
	const users = client.db("db").collection("users");
	await users.updateOne(
		{ _id: new ObjectId(userId) },
		{ $set: { banned: false } },
	);
}

export async function lock(roomId: string): Promise<void> {
	const rooms = client.db("db").collection("rooms");
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $set: { locked: true } },
	);
}

export async function unlock(roomId: string): Promise<void> {
	const rooms = client.db("db").collection("rooms");
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $set: { locked: false } },
	);
}

export async function defineWord(
	roomId: string,
	word: string,
	definition: string,
): Promise<void> {
	const rooms = client.db("db").collection("rooms");
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $set: { [`dictionary.${word}`]: definition } },
	);
}

export async function undefineWord(
	roomId: string,
	word: string,
): Promise<void> {
	const rooms = client.db("db").collection("rooms");
	await rooms.updateOne(
		{ _id: new ObjectId(roomId) },
		{ $unset: { [`dictionary.${word}`]: 1 } },
	);
}

export async function getWordDefinition(
	roomId: string,
	word: string,
): Promise<string | undefined> {
	const rooms = client.db("db").collection("rooms");
	const room = await rooms.findOne({ _id: new ObjectId(roomId) });
	return room?.dictionary?.[word];
}
