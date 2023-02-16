import * as utils from "./utils.js";

const prefix = ">";

class Command {
    constructor() {
        this.prefixes = [];
    }

    async parse(io, roomId, msg, role) {
        for (let [command, func] of this.prefixes) {
            if (msg.startsWith(prefix + command)) {
                return await func(
                    io,
                    roomId,
                    role,
                    ...msg.split(" ").slice(1, msg.length)
                );
            }
        }
    }

    on(command, callbackFn) {
        this.prefixes.push([command, callbackFn]);
    }
}

export const command = new Command();

command.on("delete", async (io, roomId, role, msgId) => {
    if (msgId) {
        let result = await utils.deleteMessage(roomId, msgId);

        if (result.modifiedCount) {
            io.emit("delete", msgId);
            return `Deleted message ${msgId}`;
        } else {
            return `Message id ${msgId} doesn't exist`;
        }
    } else {
        return `Syntax: ${prefix}delete <message_id>`;
    }
});

command.on("purge", async (io, roomId, role, amt) => {
    if (amt && !amt.match(/[^0-9]/g)) {
        let deletedMessages = await utils.deleteLastMessages(roomId, amt);

        for (let deletedMessage of deletedMessages) {
            io.emit("delete", deletedMessage.id);
        }

        return `Deleted ${amt} messages`;
    } else {
        return `Syntax: ${prefix}purge <amount>`;
    }
});
