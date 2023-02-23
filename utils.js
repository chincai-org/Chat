import { MongoClient, ObjectId } from "mongodb";
import { config } from "dotenv";

config();
const uri = process.env.uri;
const client = new MongoClient(uri);
const colors = ["blue", "green", "purple", "red", "yellow"];

function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function findPings(msg) {
    let pings = [];

    for (let username of new Set(msg.match(/(?<=@)[A-Za-z\d_]+/g) || [])) {
        console.log(username);
        if (await findUserByUsername(username)) {
            pings.push(username);
        }
    }

    return pings;
}

/**
 * @constructor
 * @param {string} displayName - Display name of user, can be duplicated, no rules
 * @param {string} username - Username of user, can't be duplicated, only limited to alphanumeric characters
 * @param {string} password - Can be anything
 * @param {string} cookieId - The cookieId of the user
 */
export async function createUser(displayName, username, password, cookieId) {
    try {
        const users = client.db("db").collection("users");

        return await users.insertOne({
            displayName: displayName,
            username: username,
            avatar:
                "assets/default_" +
                colors[randint(1, colors.length - 1)] +
                ".png",
            password: password,
            cookieId: cookieId,
            rooms: {},
            pins: {
                public: [],
                private: []
            }
        });
    } finally {
    }
}

/**
 * @constructor
 * @param {string} name - Room name
 * @param {string} visibility - "public" | "private"
 * @param {string} creater: Username of creater
 */
export async function createRoom(name, visibility, creater) {
    try {
        const rooms = client.db("db").collection("rooms");

        let result = await rooms.insertOne({
            name: name,
            visibility: visibility,
            msgId: 0,
            messages: [],
            members: visibility == "public" ? [] : [creater]
        });

        if (visibility == "private") {
            await assignRole(creater, result.insertedId, "admin");
        }

        return result;
    } finally {
    }
}

export async function findUserById(userId) {
    try {
        const users = client.db("db").collection("users");
        return await users.findOne({ _id: new ObjectId(userId) });
    } catch (e) {
        return null;
    } finally {
    }
}

export async function findUserByUsername(username) {
    try {
        const users = client.db("db").collection("users");
        return await users.findOne({ username: username });
    } finally {
    }
}

export async function findUserByCookie(cookieId) {
    try {
        const users = client.db("db").collection("users");
        return await users.findOne({ cookieId: cookieId });
    } finally {
    }
}

export async function findRoom(roomId) {
    try {
        const rooms = client.db("db").collection("rooms");
        return await rooms.findOne({ _id: new ObjectId(roomId) });
    } catch (e) {
        return null;
    } finally {
    }
}

export async function findRoomWithUser(username, visibility) {
    try {
        const rooms = client.db("db").collection("rooms");
        return await rooms
            .find(
                {
                    $or: [
                        {
                            visibility: "public"
                        },
                        {
                            members: {
                                $all: [username]
                            }
                        }
                    ],
                    visibility: visibility
                },
                {
                    projection: {
                        _id: 1,
                        name: 1
                    }
                }
            )
            .toArray();
    } finally {
    }
}

export async function findRoomWithUserAndQuery(username, visibility, query) {
    try {
        const rooms = client.db("db").collection("rooms");
        return await rooms
            .find(
                {
                    $or: [
                        {
                            visibility: "public"
                        },
                        {
                            members: {
                                $all: [username]
                            }
                        }
                    ],
                    name: {
                        $regex: query,
                        $options: "i"
                    },
                    visibility: visibility
                },
                {
                    projection: {
                        _id: 1,
                        name: 1
                    }
                }
            )
            .toArray();
    } finally {
    }
}

/**
 * Warning, the room can only be private
 * @param {string} userId
 * @param {string} roomId
 */
export async function addUser(userId, roomId) {
    try {
        const rooms = client.db("db").collection("rooms");

        let user = await findUserById(userId);
        console.log(user);

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $push: {
                    members: user.username
                }
            }
        );

        await assignRole(user.username, roomId, "member");
    } catch (e) {
        return null;
    } finally {
    }
}

export async function removeUser(userId, roomId) {
    try {
        const users = client.db("db").collection("users");
        const rooms = client.db("db").collection("rooms");

        let user = await findUserById(userId);
        let room = await findRoom(roomId);

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $pull: {
                    members: {
                        $eq: user.username
                    }
                }
            }
        );

        await users.updateOne(
            {
                _id: new ObjectId(userId)
            },
            {
                $pull: {
                    ["pins." + room.visibility]: roomId
                },
                $unset: {
                    ["rooms." + roomId]: ""
                }
            }
        );
    } catch (e) {
        return null;
    } finally {
    }
}

export async function insertMessage(roomId, username, content, time) {
    try {
        const rooms = client.db("db").collection("rooms");

        let room = await findRoom(roomId);
        let id = room._id.toString() + (room.msgId + 1);

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $push: {
                    messages: {
                        id: id,
                        author: username,
                        content: content,
                        createdAt: time
                    }
                },
                $inc: {
                    msgId: 1
                }
            }
        );

        return id;
    } catch (e) {
        return null;
    } finally {
    }
}

export async function deleteMessage(roomId, msgId) {
    try {
        const rooms = client.db("db").collection("rooms");

        return await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $pull: {
                    messages: {
                        id: msgId
                    }
                }
            }
        );
    } finally {
    }
}

export async function deleteLastMessages(roomId, amount) {
    try {
        const rooms = client.db("db").collection("rooms");

        let room = await findRoom(roomId);
        let messages = room.messages;

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $set: {
                    messages: messages.slice(0, messages.length - amount)
                }
            }
        );

        return messages.slice(messages.length - amount, messages.length);
    } finally {
    }
}

export async function assignRole(username, roomId, role) {
    try {
        const users = client.db("db").collection("users");

        await users.updateOne(
            {
                username: username
            },
            {
                $set: {
                    ["rooms." + roomId]: role
                }
            }
        );
    } finally {
    }
}

export async function pinRoom(userId, roomId) {
    try {
        const users = client.db("db").collection("users");

        let room = await findRoom(roomId);

        await users.updateOne(
            {
                _id: new ObjectId(userId)
            },
            {
                $push: {
                    ["pins." + room.visibility]: {
                        _id: roomId,
                        name: room.name
                    }
                }
            }
        );
    } catch (e) {
        return null;
    } finally {
    }
}

export async function unpinRoom(userId, roomId) {
    try {
        const users = client.db("db").collection("users");

        let room = await findRoom(roomId);

        await users.updateOne(
            {
                _id: new ObjectId(userId)
            },
            {
                $pull: {
                    ["pins." + room.visibility]: {
                        _id: roomId
                    }
                }
            }
        );
    } catch (e) {
        return null;
    } finally {
    }
}

export async function changeRoomName(roomId, newName) {
    try {
        const rooms = client.db("db").collection("rooms");

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $set: {
                    name: newName
                }
            }
        );
    } finally {
    }
}
