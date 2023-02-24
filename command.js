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
    }

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
            return `Message id ${msgId} doesn't exist`;
        } else if (role == "member" && message.author != user.username) {
            return `You don't have the permission!`;
        } else {
            await utils.deleteMessage(room._id, msgId);
            io.emit("delete", msgId);
            return `Deleted message ${msgId}`;
        }
    } else {
        return `Syntax: ${prefix}delete <message_id>`;
    }
});

command.on("purge", async (io, user, room, amt) => {
    let role = getRole(user, room);
    if (role == "member") return `You don't have the permission!`;

    if (amt && (!amt.match(/[^0-9]/g) || amt.toLowerCase() == "all")) {
        if (amt.toLowerCase() == "all") amt = room.messages.length + 1;

        let deletedMessages = await utils.deleteLastMessages(room._id, amt);

        for (let deletedMessage of deletedMessages) {
            io.emit("delete", deletedMessage.id);
        }

        return `Deleted ${amt} messages`;
    } else {
        return `Syntax: ${prefix}purge <amount>`;
    }
});

command.on("kick", async (io, user, room, username) => {
    if (!username) return `Syntax: ${prefix}kick <username>`;
    let target = await utils.findUserByUsername(username);
    let kickerRole = getRole(user, room);
    let targetRole = getRole(target, room);

    if (room.visibility == "public") {
        return "You can't kick anyone out of a public room!";
    } else if (roleValue.indexOf(kickerRole) < roleValue.indexOf(targetRole)) {
        return "You don't have the permission!";
    } else {
        await utils.removeUser(target._id, room._id.toString());
        console.log(room._id);
        return `Kicked user ${username}`;
    }
});

command.on("help-cmd", async (io, user, room, username) => {
    return "List of cmd: \n >purge <amount> Desc: delete an amount of message \n >delete <message id> Desc: delete a specific message \n >kick <username> Desc: kick users out of topic \n >mute <username> Desc: mute users"
});

command.on(">tic-tac-toe", async (io, user, room, username) => {
    return `\n[] [] []\n[] [] []\n[] [] []`;
    //how do i get user msg
})