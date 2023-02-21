import * as utils from "./utils.js";

const prefix = ">";
const superUsers = ["Bob", "Mortis_666"];

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
    if (superUsers.includes(user.username)) {
        return "admin";
    }
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
