import * as utils from "./utils.js";

const prefix = ">";
const superUsers = ["Bob", "Mortis_666", "ddddddddrrdd3"];
const roleValue = ["member", "co-admin", "admin"];

class Command {
    constructor() {
        this.prefixes = [];
    }

    async parse(io, user, room, msg) {
        for (let [command, func] of this.prefixes) {
            if (msg.startsWith(prefix + command)) {
                return await func(
                    io,
                    user,
                    room,
                    ...msg.split(" ").slice(1, msg.length)
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
        this.prefixes.push([command, callbackFn]);
    }
}

function getRole(user, room) {
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
    let target = await utils.findUserByUsername(username);
    let kickerRole = getRole(user, room);
    let targetRole = getRole(target, room);

    if (room.visibility == "public") {
        return [2000, "You can't kick anyone out of a public room!"];
    } else if (roleValue.indexOf(kickerRole) < roleValue.indexOf(targetRole)) {
        return [2000, "You don't have the permission!"];
    } else {
        await utils.removeUser(target._id, room._id.toString());
        console.log(room._id);
        return [2000, `Kicked user ${username}`];
    }
});

command.on("help-cmd", async (io, user, room) => {
    return [
        0,
        `List of cmd: \n 
        ${prefix}purge <amount> Desc: delete an amount of message \n 
        ${prefix}delete <message id> Desc: delete a specific message \n 
        ${prefix}kick <username> Desc: kick users out of topic \n 
        ${prefix}mute <username> Desc: mute users`
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
    return arg1
    // >showcase; => arg1 = undefined; arg2 = undefined; arg3 = undefined
    // >showcase hello; => arg1 = "hello"; arg2 = undefined; arg3 = undefined
    // >showcase 1 2 3; => arg1 = "1"; arg2 = "2"; arg3 = "3"
    // >showcase 1 2 3 4; => arg1 = "1"; arg2 = "2"; arg3 = "3"

    //            The second one is the message that will be
    //            sent to the topic
    //            vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
    // return [2000, `arg1=${arg1}; arg2=${arg2}; arg3=${arg3}`];
    //      ^^^^
    //      Delete message after this ms
    //      Put `0` to never delete this message
});
