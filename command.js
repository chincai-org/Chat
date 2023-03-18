import * as utils from "./utils.js";

const prefix = ">";
const superUsers = ["Bob", "Mortis_666", "ddddddddrrdd3"];
const roleValue = ["member", "co-admin", "admin"];

class Command {
    constructor() {
        this.commands = [];
    }

    async parse(io, user, room, msg) {
        for (let [command, func] of this.commands) {
            if (msg.match(new RegExp("^" + prefix + command + "(\\s+)?"))) {
                return await func(
                    io,
                    user,
                    room,
                    ...msg.split(/\s+/).slice(1, msg.length)
                );
            }
        }

        return [0, null];
    }

    /**
     * @callback callback
     * @param {import("socket.io").Server} io - io to emit messages to the frontend
     * @param {import("mongodb").WithId<import("mongodb").Document>} user - user object
     * @param {import("mongodb").WithId<import("mongodb").Document>} room - room object
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

command.on("delete", async (io, user, room, msgId) => {
    if (msgId) {
        let role = getRole(user, room);
        let message;

        for (let msg of room.messages) {
            if (msg.id == msgId) message = msg;
        }

        if (!message) {
            return [2000, `Message id ${msgId} doesn't exist`];
        } else if (role == "member" && message.author != user.username) {
            return [2000, "You don't have the permission!"];
        } else {
            await utils.deleteMessage(room._id, msgId);
            io.emit("delete", msgId);
            return [2000, `Deleted message ${msgId}`];
        }
    } else {
        return [2000, `Syntax: ${prefix}delete <message_id>`];
    }
});

command.on("purge", async (io, user, room, amt) => {
    let role = getRole(user, room);
    if (role == "member") return [2000, "You don't have the permission!"];

    if (amt && (!amt.match(/[^0-9]/g) || amt.toLowerCase() == "all")) {
        if (amt.toLowerCase() == "all") amt = room.messages.length + 1;

        let deletedMessages = await utils.deleteLastMessages(room._id, amt);

        for (let deletedMessage of deletedMessages) {
            io.emit("delete", deletedMessage.id);
        }

        return [2000, `Deleted ${amt} messages`];
    } else {
        return [2000, `Syntax: ${prefix}purge <amount>`];
    }
});

command.on("kick", async (io, user, room, username) => {
    if (!username) return [2000, `Syntax: ${prefix}kick <username>`];
    if (room.visibility == "public")
        return [2000, "You can't kick anyone out of a public room!"];

    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(user, room);
    let targetRole = getRole(target, room);

    if (roleValue.indexOf(authorRole) < roleValue.indexOf(targetRole)) {
        return [2000, "You don't have the permission!"];
    } else {
        await utils.removeUser(target._id, room._id.toString());
        return [2000, `Kicked user ${username}`];
    }
});

command.on("mute", async (io, user, room, username) => {
    if (!username) return [2000, `Syntax: ${prefix}mute <username>`];
    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(user, room);
    let targetRole = getRole(target, room);

    if (roleValue.indexOf(authorRole) <= roleValue.indexOf(targetRole)) {
        return [2000, "You don't have the permission!"];
    } else {
        await utils.mute(room._id.toString(), username);
        return [2000, `Muted user ${username}`];
    }
});

command.on("unmute", async (io, user, room, username) => {
    if (!username) return [2000, `Syntax: ${prefix}unmute <username>`];
    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(user, room);
    let targetRole = getRole(target, room);

    if (roleValue.indexOf(authorRole) <= roleValue.indexOf(targetRole)) {
        return [2000, "You don't have the permission!"];
    } else {
        await utils.unmute(room._id.toString(), username);
        return [2000, `Unmuted user ${username}`];
    }
});

command.on("promote", async (io, user, room, username) => {
    if (!username) return [2000, `Syntax: ${prefix}promote <username>`];
    if (room.visibility == "public")
        return [0, "You can't promote anyone in public room"];

    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(user, room);
    let targetRole = getRole(target, room);

    if (authorRole != "admin") {
        return [2000, "You don't have the permission!"];
    } else if (targetRole != "member") {
        return [2000, `You can't promote a ${targetRole}!`];
    } else {
        await utils.assignRole(username, room._id.toString(), "co-admin");
        return [2000, `Promoted ${username} to co-admin`];
    }
});

command.on("demote", async (io, user, room, username) => {
    if (!username) return [2000, `Syntax: ${prefix}demote <username>`];
    if (room.visibility == "public")
        return [0, "You can't demote anyone in public room"];

    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);

    if (!target) return [2000, `User ${username} doesn't exist`];

    let authorRole = getRole(user, room);
    let targetRole = getRole(target, room);

    if (authorRole != "admin") {
        return [2000, "You don't have the permission!"];
    } else if (targetRole != "co-admin") {
        return [2000, `You can't demote a ${targetRole}!`];
    } else {
        await utils.assignRole(username, room._id.toString(), "member");
        return [2000, `Demoted ${username} to member`];
    }
});

command.on("check-role", async (io, user, room, username) => {
    if (!username) username = user.username;
    username = username.replace(/^@/, "");
    let target = await utils.findUserByUsername(username);
    return [0, `${username} is a ${getRole(target, room)} of ${room.name}`];
});

command.on("count-msg", async (io, user, room) => {
    return [0, `${room.messages.length} messages`];
});

command.on("define", async (io, user, room, ...args) => {
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

    await utils.defineWord(room._id.toString(), phrase, definition);
    return [0, `Defined ${phrase} as ${definition}`];
});

command.on("whatis", async (io, user, room, ...args) => {
    if (!args) return [0, `Syntax: ${prefix}whatis <phrase>`];

    let phrase = args.join(" ");
    let definition = await utils.getWordDefinition(room._id.toString(), phrase);

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

command.on("forget", async (io, user, room, ...args) => {
    if (!args) return [0, `Syntax: ${prefix}whatis <phrase>`];

    let phrase = args.join(" ");
    let definition = await utils.getWordDefinition(room._id.toString(), phrase);

    if (definition) {
        await utils.undefineWord(room._id.toString(), phrase);
        return [0, `Successfully forgotten ${phrase}`];
    } else {
        return [0, `I've never known the definition of ${phrase}`];
    }
});

command.on("remindme", async (io, user, room, time, ...args) => {
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
            let msg = `@${user.username} your timer has ended!\n${content}`;
            let systemMsgId = await utils.insertMessage(
                room._id.toString(),
                "system",
                msg,
                now,
                "SYSTEM0" + "$"
            );

            io.emit(
                "msg",
                systemMsgId,
                "System",
                "system",
                "/assets/system.png",
                room._id.toString(),
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

command.on("help-cmd", async (io, user, room) => {
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
        ${prefix}check-role <username> Desc: check role of the user in this topic
        ${prefix}count-msg Desc: count the amount of message in this topic
        ${prefix}define "<phrase>" <definition> Desc: define a word for this topic
        ${prefix}whatis "<phrase>" Desc: check definition of a word for this topic
        ${prefix}forget "<phrase>" Desc: delete definition of a word for this topic
        ${prefix}remindme <hh:mm:ss> <content> Desc: remind you to do something`
    ];
});

command.on(">tic-tac-toe", async (io, user, room) => {
    return [2000, `\n[] [] []\n[] [] []\n[] [] []`];
    //how do i get user msg
});

command.on(">chess", async (io, user, room) => {
    return [2000, `qxf7 checkmate gg good game`];
});

command.on("showcase", (io, user, room, arg1, arg2, arg3) => {
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
