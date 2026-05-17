import type { RoomDoc, SocketContext, UserDoc } from "./types.ts";
import * as utils from "./utils.ts";

const prefix = ">";
const superUsers = ["Mortis_666", "ddddddddrrdd3"];
const roleValue = ["member", "co-admin", "admin"];

class Command {
	commands: Array<
		[
			string,
			(
				ctx: SocketContext,
				...args: string[]
			) => Promise<[number, string | null]> | [number, string | null],
		]
	> = [];

	async parse(ctx: SocketContext, msg: string) {
		for (const [command, func] of this.commands) {
			if (msg.match(new RegExp(`^${prefix}${command}(\\s+)?`))) {
				return await func(
					ctx,
					...msg.split(/\s+/).slice(1, msg.length),
				);
			}
		}
		return [0, null];
	}

	on(
		command: string,
		callbackFn: (
			ctx: SocketContext,
			...args: string[]
		) => Promise<[number, string | null]> | [number, string | null],
	) {
		this.commands.push([command, callbackFn]);
	}
}

export function getRole(
	user: Pick<UserDoc, "username" | "rooms"> | null | undefined,
	room: Pick<RoomDoc, "visibility" | "_id"> | null | undefined,
) {
	if (!user || !room) return "member";
	if (superUsers.includes(user.username)) return "admin";
	return room.visibility === "public"
		? "member"
		: user.rooms[room._id.toString()];
}

export const command = new Command();

command.on("delete", async (ctx, msgId) => {
	if (!msgId) return [2000, `Syntax: ${prefix}delete <message_id>`];
	if (!ctx.room?.messages) return [2000, utils.NO_ROOM];
	const role = getRole(ctx.user, ctx.room);
	const message = ctx.room.messages.find(msg => msg.id === msgId);
	if (!message) return [2000, `Message id ${msgId} doesn't exist`];
	if (role === "member" && message.author !== ctx.user.username)
		return [2000, utils.NO_PERM];
	await utils.deleteMessage(ctx.room._id.toString(), msgId);
	ctx.io.emit("delete", msgId);
	return [2000, `Deleted message ${msgId}`];
});

command.on("purge", async (ctx, amt) => {
	const role = getRole(ctx.user, ctx.room);
	if (role === "member") return [2000, utils.NO_PERM];
	if (!amt || (!/^\d+$/.test(amt) && amt.toLowerCase() !== "all"))
		return [2000, `Syntax: ${prefix}purge <amount>`];
	if (amt.toLowerCase() === "all") amt = String(ctx.room.messages.length + 1);
	const deletedMessages = await utils.deleteLastMessages(
		ctx.room._id.toString(),
		Number(amt),
	);
	for (const deletedMessage of deletedMessages)
		ctx.io.emit("delete", deletedMessage.id);
	return [2000, `Deleted ${amt} messages`];
});

command.on("kick", async (ctx, username) => {
	if (!username) return [2000, `Syntax: ${prefix}kick <username>`];
	if (ctx.room.visibility === "public")
		return [2000, "You can't kick anyone out of a public ctx.room!"];
	username = username.replace(/^@/, "");
	const target = await utils.findUserByUsername(username);
	if (!target) return [2000, `User ${username} doesn't exist`];
	const authorRole = getRole(ctx.user, ctx.room);
	const targetRole = getRole(target, ctx.room);
	if (roleValue.indexOf(authorRole) <= roleValue.indexOf(targetRole))
		return [2000, utils.NO_PERM];
	await utils.removeUser(target._id.toString(), ctx.room._id.toString());
	return [2000, `Kicked ctx.user ${username}`];
});

command.on("mute", async (ctx, username, ...reason) => {
	if (!username)
		return [2000, `Syntax: ${prefix}mute <username> [reason="no reason"]`];
	username = username.replace(/^@/, "");
	const target = await utils.findUserByUsername(username);
	if (!target) return [2000, `User ${username} doesn't exist`];
	const authorRole = getRole(ctx.user, ctx.room);
	const targetRole = getRole(target, ctx.room);
	if (roleValue.indexOf(authorRole) <= roleValue.indexOf(targetRole))
		return [2000, utils.NO_PERM];
	await utils.mute(
		ctx.room._id.toString(),
		username,
		reason.join(" ") || "no reason",
	);
	return [2000, `Muted ctx.user ${username}`];
});

command.on("unmute", async (ctx, username) => {
	if (!username) return [2000, `Syntax: ${prefix}unmute <username>`];
	username = username.replace(/^@/, "");
	const target = await utils.findUserByUsername(username);
	if (!target) return [2000, `User ${username} doesn't exist`];
	const authorRole = getRole(ctx.user, ctx.room);
	const targetRole = getRole(target, ctx.room);
	if (roleValue.indexOf(authorRole) <= roleValue.indexOf(targetRole))
		return [2000, utils.NO_PERM];
	await utils.unmute(ctx.room._id.toString(), username);
	return [2000, `Unmuted ctx.user ${username}`];
});

command.on("ban", async (ctx, username, ...reason) => {
	if (!username)
		return [2000, `Syntax: ${prefix}ban <username> [reason="no reason"]`];
	username = username.replace(/^@/, "");
	const target = await utils.findUserByUsername(username);
	if (!target) return [2000, `User ${username} doesn't exist`];
	if (!superUsers.includes(ctx.user.username)) return [2000, utils.NO_PERM];
	await utils.ban(target._id.toString(), reason.join(" ") || "no reason");
	ctx.socket.emit("ban");
	return [2000, `Banned ctx.user ${username}`];
});

command.on("unban", async (ctx, username) => {
	if (!username)
		return [2000, `Syntax: ${prefix}unban <username> [reason="no reason"]`];
	username = username.replace(/^@/, "");
	const target = await utils.findUserByUsername(username);
	if (!target) return [2000, `User ${username} doesn't exist`];
	if (!superUsers.includes(ctx.user.username)) return [2000, utils.NO_PERM];
	await utils.unban(target._id.toString());
	return [2000, `Unbanned ctx.user ${username}`];
});

command.on("lock", async ctx => {
	if (getRole(ctx.user, ctx.room) === "member") return [2000, utils.NO_PERM];
	await utils.lock(ctx.room._id.toString());
	return [2000, "Topic locked"];
});

command.on("unlock", async ctx => {
	if (getRole(ctx.user, ctx.room) === "member") return [2000, utils.NO_PERM];
	await utils.unlock(ctx.room._id.toString());
	return [2000, "Topic unlocked"];
});

command.on("promote", async (ctx, username) => {
	if (!username) return [2000, `Syntax: ${prefix}promote <username>`];
	if (ctx.room.visibility === "public")
		return [0, "You can't promote anyone in public ctx.room"];
	username = username.replace(/^@/, "");
	const target = await utils.findUserByUsername(username);
	if (!target) return [2000, `User ${username} doesn't exist`];
	const authorRole = getRole(ctx.user, ctx.room);
	const targetRole = getRole(target, ctx.room);
	if (authorRole !== "admin") return [2000, utils.NO_PERM];
	if (targetRole !== "member")
		return [2000, `You can't promote a ${targetRole}!`];
	await utils.assignRole(username, ctx.room._id.toString(), "co-admin");
	return [2000, `Promoted ${username} to co-admin`];
});

command.on("demote", async (ctx, username) => {
	if (!username) return [2000, `Syntax: ${prefix}demote <username>`];
	if (ctx.room.visibility === "public")
		return [0, "You can't demote anyone in public ctx.room"];
	username = username.replace(/^@/, "");
	const target = await utils.findUserByUsername(username);
	if (!target) return [2000, `User ${username} doesn't exist`];
	const authorRole = getRole(ctx.user, ctx.room);
	const targetRole = getRole(target, ctx.room);
	if (authorRole !== "admin") return [2000, utils.NO_PERM];
	if (targetRole !== "co-admin")
		return [2000, `You can't demote a ${targetRole}!`];
	await utils.assignRole(username, ctx.room._id.toString(), "member");
	return [2000, `Demoted ${username} to member`];
});

command.on("check-role", async (ctx, username) => {
	if (!username) username = ctx.user.username;
	username = username.replace(/^@/, "");
	const target = await utils.findUserByUsername(username);
	if (!target) return [2000, `User ${username} doesn't exist`];
	return [
		0,
		`${username} is a ${getRole(target, ctx.room)} of ${ctx.room.name}`,
	];
});

command.on("count-msg", async ctx => [
	0,
	`${ctx.room.messages.length} messages`,
]);

command.on("define", async (ctx, ...args) => {
	if (!args.length)
		return [0, `Syntax: ${prefix}define "<phrase>" <definition>`];
	const all = args.join(" ");
	const word = all.match(/(?<=")[^"]+(?=" )/);
	if (all.match(/^"/) && (all.match(/"/g) || []).length > 2)
		return [0, 'Too many "double quotes"!!'];
	let phrase: string, definition: string;
	if (word) {
		phrase = word[0];
		definition = all.replace(phrase, "").split(/\s+/).slice(1).join(" ");
	} else if (args.length > 1) {
		phrase = args[0];
		definition = args.slice(1).join(" ");
	} else {
		return [0, "Please provide the definition!"];
	}
	await utils.defineWord(ctx.room._id.toString(), phrase, definition);
	return [0, `Defined ${phrase} as ${definition}`];
});

command.on("whatis", async (ctx, ...args) => {
	if (!args.length) return [0, `Syntax: ${prefix}whatis <phrase>`];
	const phrase = args.join(" ");
	const definition = await utils.getWordDefinition(
		ctx.room._id.toString(),
		phrase,
	);
	if (definition) return [0, `${phrase} is ${definition}`];
	return [
		0,
		`Can't find the definition of ${phrase},\n            do >define "${phrase}" <definition> to define it`,
	];
});

command.on("forget", async (ctx, ...args) => {
	if (!args.length) return [0, `Syntax: ${prefix}whatis <phrase>`];
	const phrase = args.join(" ");
	const definition = await utils.getWordDefinition(
		ctx.room._id.toString(),
		phrase,
	);
	if (definition) {
		await utils.undefineWord(ctx.room._id.toString(), phrase);
		return [0, `Successfully forgotten ${phrase}`];
	}
	return [0, `I've never known the definition of ${phrase}`];
});

command.on("remindme", async (ctx, time, ...args) => {
	if (!time) return [0, `Syntax: ${prefix}remindme <hh:mm:ss> <content>`];
	if (!time.match(/^(\d?\d:)?(\d?\d:)?\d?\d$/))
		return [0, "Time format wrong! Use hh:mm:ss time format!"];
	const timeParse = time.split(":");
	const hour = Number(timeParse.at(-3)) || 0;
	const minute = Number(timeParse.at(-2)) || 0;
	const second = Number(timeParse.at(-1));
	const total = hour * 3600 + minute * 60 + second;
	if (total === 0) return [0, "The time can't be zero!"];
	const content = args.join(" ");
	const hourMsg = hour
		? ` ${hour} hours `.slice(0, -(hour === 1 ? 2 : 1))
		: "";
	const minuteMsg = minute
		? ` ${minute} minutes `.slice(0, -(minute === 1 ? 2 : 1))
		: "";
	const secondMsg = ` ${second} seconds `.slice(0, -(second === 1 ? 2 : 1));
	setTimeout(async () => {
		const now = Date.now();
		const msg = `@${ctx.user.username} your timer has ended!\n${content}`;
		const systemMsgId = await utils.insertMessage(
			ctx.room._id.toString(),
			"system",
			msg,
			now,
			0,
			"SYSTEM0$",
		);
		ctx.io.emit("msg", {
			id: systemMsgId,
			authorName: "System",
			authorUsername: "system",
			avatar: "/assets/system.png",
			roomId: ctx.room._id.toString(),
			content: msg,
			time: now,
			pings: await utils.findPings(msg),
			topicIds: [],
		});
	}, total * 1000);
	return [0, `Ok I will remind you after${hourMsg}${minuteMsg}${secondMsg}.`];
});

command.on("help-cmd", async () => [
	0,
	`List of cmd:\n        ${prefix}purge <amount> Desc: delete an amount of message\n        ${prefix}delete <message id> Desc: delete a specific message\n        ${prefix}kick <username> Desc: kick users out of topic\n        ${prefix}mute <username> Desc: mute users\n        ${prefix}unmute <username> Desc: unmute users\n        ${prefix}promote <username> Desc: promote users\n        ${prefix}demote <username> Desc: demote users\n        ${prefix}check-role <username> Desc: check role of the ctx.user in this topic\n        ${prefix}count-msg Desc: count the amount of message in this topic\n        ${prefix}define "<phrase>" <definition> Desc: define a word for this topic\n        ${prefix}whatis "<phrase>" Desc: check definition of a word for this topic\n        ${prefix}forget "<phrase>" Desc: delete definition of a word for this topic\n        ${prefix}remindme <hh:mm:ss> <content> Desc: remind you to do something`,
]);

command.on(">tic-tac-toe", async () => [
	2000,
	`\n[] [] []\n[] [] []\n[] [] []`,
]);
command.on(">chess", async () => [2000, `qxf7 checkmate gg good game`]);
command.on("showcase", (_ctx, arg1, arg2, arg3) => [
	2000,
	`arg1=${arg1}; arg2=${arg2}; arg3=${arg3}`,
]);

command.on("generate", () => {
	const consonant = "bcdfghjklmnpqrstvwxyz";
	const consonantArray = consonant.split("");
	const vowelArray = ["a", "e", "i", "o", "u"];
	let randWord = "";
	for (let i = 0; i < 10; i++) {
		randWord += String(
			consonantArray[Math.floor(Math.random() * consonant.length)],
		);
		randWord += String(
			vowelArray[Math.floor(Math.random() * vowelArray.length)],
		);
	}
	return [0, randWord];
});
