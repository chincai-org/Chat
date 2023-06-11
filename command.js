import * as utils from "./utils.js";

const prefix = ">";
const superUsers = ["Mortis_666", "ddddddddrrdd3"];
const roleValue = ["member", "co-admin", "admin"];

class Command {
    constructor() {
        this.commands = [];
    }

    async parse(ctx, msg) {
        for (let [command, func] of this.commands) {
            if (msg.match(new RegExp("^" + prefix + command + "(\\s+)?"))) {
                return await func(
                    ctx,
                    ...msg.split(/\s+/).slice(1, msg.length)
                );
            }
        }

        return [0, null];
    }

    /**
     * @typedef {Object} Context
     * @property {import("socket.io").Server} io - io to emit messages to the frontend
     * @property {import("socket.io").Socket} socket - io to emit messages to the frontend
     * @property {import("mongodb").WithId<import("mongodb").Document>} user - user object
     * @property {import("mongodb").WithId<import("mongodb").Document>} room - room object
     */

    /**
     * @callback callback
     * @param {Context} ctx
     * @param {...String} args - arguments in the message
     * @returns {Promise<[int, String]>}
     */
    /**
     * @param {String} command - The command name
     * @param {callback} callbackFn
     */
    on(command, callbackFn) {
        this.commands.push([command, callbackFn]);
    }
}

export function getRole(user, room) {
    if (superUsers.includes(user.username)) return "admin";
    return room.visibility == "public" ? "member" : user.rooms[room._id];
}

export const command = new Command();

command.on("delete", async (ctx, msgId) => {
    if (msgId) {
        let role = getRole(ctx.user, ctx.room);
        let message = ctx.room.messages.find(msg => msg.id == msgId);

        if (!message) {
            return [2000, `Message id ${msgId} doesn't exist`];
        } else if (role == "member" && message.author != ctx.user.username) {
            return [2000, utils.NO_PERM];
        } else {
            await utils.deleteMessage(ctx.room._id, msgId);
            ctx.io.emit("delete", msgId);
            return [2000, `Deleted message ${msgId}`];
        }
    } else {
        return [2000, `Syntax: ${prefix}delete <message_id>`];
    }
});

command.on("purge", async (ctx, amt) => {
    let role = getRole(ctx.user, ctx.room);
    if (role == "member") return [2000, utils.NO_PERM];

    if (amt && (!amt.match(/[^0-9]/g) || amt.toLowerCase() == "all")) {
        if (amt.toLowerCase() == "all") amt = ctx.room.messages.length + 1;

        let deletedMessages = await utils.deleteLastMessages(ctx.room._id, amt);

        for (let deletedMessage of deletedMessages) {
            ctx.io.emit("delete", deletedMessage.id);
        }

        return [2000, `Deleted ${amt} messages`];
    } else {
        return [2000, `Syntax: ${prefix}purge <amount>`];
    }
});

command.on("kick", async (ctx, username) => {
    if (!username) return [2000, `Syntax: ${prefix}kick <username>`];
    if (ctx.room.visibility == "public")
        return [2000, "You can't kick anyone out of a public ctx.room!"];

    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(ctx.user, ctx.room);
    let targetRole = getRole(target, ctx.room);

    if (roleValue.indexOf(authorRole) < roleValue.indexOf(targetRole)) {
        return [2000, utils.NO_PERM];
    } else {
        await utils.removeUser(target._id, ctx.room._id.toString());
        return [2000, `Kicked ctx.user ${username}`];
    }
});

command.on("mute", async (ctx, username, ...reason) => {
    if (!username)
        return [2000, `Syntax: ${prefix}mute <username> [reason="no reason"]`];
    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(ctx.user, ctx.room);
    let targetRole = getRole(target, ctx.room);

    if (roleValue.indexOf(authorRole) <= roleValue.indexOf(targetRole)) {
        return [2000, utils.NO_PERM];
    } else {
        await utils.mute(
            ctx.room._id.toString(),
            username,
            reason.join(" ") || "no reason"
        );
        return [2000, `Muted ctx.user ${username}`];
    }
});

command.on("unmute", async (ctx, username) => {
    if (!username) return [2000, `Syntax: ${prefix}unmute <username>`];
    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(ctx.user, ctx.room);
    let targetRole = getRole(target, ctx.room);

    if (roleValue.indexOf(authorRole) <= roleValue.indexOf(targetRole)) {
        return [2000, utils.NO_PERM];
    } else {
        await utils.unmute(ctx.room._id.toString(), username);
        return [2000, `Unmuted ctx.user ${username}`];
    }
});

command.on("ban", async (ctx, username, ...reason) => {
    if (!username)
        return [2000, `Syntax: ${prefix}ban <username> [reason="no reason"]`];
    username = username.replace(/^@/, "");

    let target = await utils.findUserByUsername(username);
    if (!target) return [2000, `User ${username} doesn't exist`];

    if (!superUsers.includes(ctx.user.username)) {
        return [2000, utils.NO_PERM];
    } else {
        await utils.ban(target._id.toString(), reason.join(" ") || "no reason");
        ctx.socket.emit("ban");
        return [2000, `Banned ctx.user ${username}`];
    }
});

command.on("unban", async (ctx, username) => {
    if (!username)
        return [2000, `Syntax: ${prefix}unban <username> [reason="no reason"]`];
    username = username.replace(/^@/, "");

    let target = await utils.findUserByUsername(username);
    if (!target) return [2000, `User ${username} doesn't exist`];

    if (!superUsers.includes(ctx.user.username)) {
        return [2000, utils.NO_PERM];
    } else {
        await utils.unban(target._id.toString());
        return [2000, `Unbanned ctx.user ${username}`];
    }
});

command.on("lock", async ctx => {
    if (getRole(ctx.user, ctx.room) == "member") {
        return [2000, utils.NO_PERM];
    } else {
        await utils.lock(ctx.room._id.toString());
        return [2000, "Topic locked"];
    }
});

command.on("unlock", async ctx => {
    if (getRole(ctx.user, ctx.room) == "member") {
        return [2000, utils.NO_PERM];
    } else {
        await utils.unlock(ctx.room._id.toString());
        return [2000, "Topic unlocked"];
    }
});

command.on("promote", async (ctx, username) => {
    if (!username) return [2000, `Syntax: ${prefix}promote <username>`];
    if (ctx.room.visibility == "public")
        return [0, "You can't promote anyone in public ctx.room"];

    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(ctx.user, ctx.room);
    let targetRole = getRole(target, ctx.room);

    if (authorRole != "admin") {
        return [2000, utils.NO_PERM];
    } else if (targetRole != "member") {
        return [2000, `You can't promote a ${targetRole}!`];
    } else {
        await utils.assignRole(username, ctx.room._id.toString(), "co-admin");
        return [2000, `Promoted ${username} to co-admin`];
    }
});

command.on("demote", async (ctx, username) => {
    if (!username) return [2000, `Syntax: ${prefix}demote <username>`];
    if (ctx.room.visibility == "public")
        return [0, "You can't demote anyone in public ctx.room"];

    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(ctx.user, ctx.room);
    let targetRole = getRole(target, ctx.room);

    if (authorRole != "admin") {
        return [2000, utils.NO_PERM];
    } else if (targetRole != "co-admin") {
        return [2000, `You can't demote a ${targetRole}!`];
    } else {
        await utils.assignRole(username, ctx.room._id.toString(), "member");
        return [2000, `Demoted ${username} to member`];
    }
});

command.on("check-role", async (ctx, username) => {
    if (!username) username = ctx.user.username;
    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);
    return [
        0,
        `${username} is a ${getRole(target, ctx.room)} of ${ctx.room.name}`
    ];
});

command.on("count-msg", async ctx => {
    return [0, `${ctx.room.messages.length} messages`];
});

command.on("define", async (ctx, ...args) => {
    if (!args) return [0, `Syntax: ${prefix}define "<phrase>" <definition>`];
    let all = args.join(" ");
    let word = all.match(/(?<=")[^"]+(?=" )/);

    if (all.match(/^"/) && (all.match(/"/g) || []).length > 2)
        return [0, 'Too many "double quotes"!!'];

    let phrase, definition;

    if (word) {
        phrase = word[0];
        definition = all.replace(phrase, "").split(/\s+/).slice(1).join(" ");
    } else if (args.length > 1) {
        phrase = args[0];
        definition = args.slice(1, args.length).join(" ");
    } else {
        return [0, "Please provide the definition!"];
    }

    await utils.defineWord(ctx.room._id.toString(), phrase, definition);
    return [0, `Defined ${phrase} as ${definition}`];
});

command.on("whatis", async (ctx, ...args) => {
    if (!args) return [0, `Syntax: ${prefix}whatis <phrase>`];

    let phrase = args.join(" ");
    let definition = await utils.getWordDefinition(
        ctx.room._id.toString(),
        phrase
    );

    if (definition) {
        return [0, `${phrase} is ${definition}`];
    } else {
        return [
            0,
            `Can't find the definition of ${phrase},
            do >define "${phrase}" <definition> to define it`
        ];
    }
});

command.on("forget", async (ctx, ...args) => {
    if (!args) return [0, `Syntax: ${prefix}whatis <phrase>`];

    let phrase = args.join(" ");
    let definition = await utils.getWordDefinition(
        ctx.room._id.toString(),
        phrase
    );

    if (definition) {
        await utils.undefineWord(ctx.room._id.toString(), phrase);
        return [0, `Successfully forgotten ${phrase}`];
    } else {
        return [0, `I've never known the definition of ${phrase}`];
    }
});

command.on("remindme", async (ctx, time, ...args) => {
    if (!time) {
        return [0, `Syntax: ${prefix}remindme <hh:mm:ss> <content>`];
    } else if (!time.match(/^(\d?\d:)?(\d?\d:)?\d?\d$/)) {
        return [0, "Time format wrong! Use hh:mm:ss time format!"];
    } else {
        let timeParse = time.split(":");
        let hour = timeParse.at(-3) || 0;
        let minute = timeParse.at(-2) || 0;
        let second = +timeParse.at(-1);

        let total = hour * 3600 + minute * 60 + +second;
        console.log("🚀 ~ file: command.js:274 ~ command.on ~ total:", total);

        if (total === 0) return [0, "The time can't be zero!"];

        let content = args.join(" ");
        let hourMsg = hour ? ` ${hour} hours `.slice(0, -1 - (hour == 1)) : "";
        let minuteMsg = minute
            ? ` ${minute} minutes `.slice(0, -1 - (minute == 1))
            : "";
        let secondMsg = ` ${second} seconds `.slice(0, -1 - (second == 1));

        setTimeout(async () => {
            let now = Date.now();
            let msg = `@${ctx.user.username} your timer has ended!\n${content}`;
            let systemMsgId = await utils.insertMessage(
                ctx.room._id.toString(),
                "system",
                msg,
                now,
                "SYSTEM0" + "$"
            );

            ctx.io.emit(
                "msg",
                systemMsgId,
                "System",
                "system",
                "/assets/system.png",
                ctx.room._id.toString(),
                msg,
                now,
                await utils.findPings(msg),
                []
            );
        }, total * 1000);

        return [
            0,
            `Ok I will remind you after${hourMsg}${minuteMsg}${secondMsg}.`
        ];
    }
});

command.on("help-cmd", async ctx => {
    return [
        0,
        `List of cmd:
        ${prefix}purge <amount> Desc: delete an amount of message
        ${prefix}delete <message id> Desc: delete a specific message
        ${prefix}kick <username> Desc: kick users out of topic
        ${prefix}mute <username> Desc: mute users
        ${prefix}unmute <username> Desc: unmute users
        ${prefix}promote <username> Desc: promote users
        ${prefix}demote <username> Desc: demote users
        ${prefix}check-role <username> Desc: check role of the ctx.user in this topic
        ${prefix}count-msg Desc: count the amount of message in this topic
        ${prefix}define "<phrase>" <definition> Desc: define a word for this topic
        ${prefix}whatis "<phrase>" Desc: check definition of a word for this topic
        ${prefix}forget "<phrase>" Desc: delete definition of a word for this topic
        ${prefix}remindme <hh:mm:ss> <content> Desc: remind you to do something`
    ];
});

command.on(">tic-tac-toe", async ctx => {
    return [2000, `\n[] [] []\n[] [] []\n[] [] []`];
    //how do i get ctx.user msg
});

command.on(">chess", async ctx => {
    return [2000, `qxf7 checkmate gg good game`];
});

command.on("showcase", (ctx, arg1, arg2, arg3) => {
    // >showcase; => arg1 = undefined; arg2 = undefined; arg3 = undefined
    // >showcase hello; => arg1 = "hello"; arg2 = undefined; arg3 = undefined
    // >showcase 1 2 3; => arg1 = "1"; arg2 = "2"; arg3 = "3"
    // >showcase 1 2 3 4; => arg1 = "1"; arg2 = "2"; arg3 = "3"

    //            The second one is the message that will be
    //            sent to the topic
    //            vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
    return [2000, `arg1=${arg1}; arg2=${arg2}; arg3=${arg3}`];
    //      ^^^^
    //      Delete message after this ms
    //      Put `0` to never delete this message
});

command.on("generate", ctx => {
    let consonant = "bcdfghjklmnpqrstvwxyz";
    let consonantArray = consonant.split("");
    let vowelArray = ["a", "e", "i", "o", "u"];
    let randWord = "";
    for (let i = 0; i < 10; i++) {
        randWord += String(
            consonantArray[Math.floor(Math.random() * consonant.length)]
        );
        randWord += String(
            vowelArray[Math.floor(Math.random() * vowelArray.length)]
        );
    }
    return [0, randWord];
});
