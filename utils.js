import { MongoClient, ObjectId } from "mongodb";
import { config } from "dotenv";
import crypto from "crypto";

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

function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function sha256(plain) {
    return crypto.createHash("sha256").update(plain).digest("hex");
}

export async function checkLogin(req, res, next) {
    let user = await findUserByCookie(req.cookies.id);
    if (!user) {
        return res.redirect("/login");
    }

    next();
}

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function checkBan(req, res, next) {
    let user = await findUserByCookie(req.cookies.id);
    if (user.banned) {
        return res.send(`You are banned for ${user.banned}`);
    }

    next();
}

export function generateWarningMessage(msg) {
    return {
        id: "SYSTEM0",
        authorName: "System",
        authorUsername: "system",
        avatar: "/assets/system.png",
        roomId: "$",
        content: msg,
        time: Date.now()
    };
}

export async function findPings(msg) {
    let pings = [];

    for (let username of new Set(msg.match(/(?<=@)[A-Za-z\d_]+/g) || [])) {
        if (await findUserByUsername(username)) {
            pings.push(username);
        }
    }

    return pings;
}

export async function findHashtagTopic(msg) {
    try {
        let topicIds = [];

        for (let topicId of new Set(msg.match(/(?<=#)[a-z\d]+/g) || [])) {
            console.log(
                "🚀 ~ file: utils.js:49 ~ findHashtagTopic ~ topicId:",
                topicId
            );

            let topic = await findRoom(topicId);
            if (topic && topic.visibility == "public") {
                topicIds.push({ id: topicId, name: topic.name });
            }
        }

        return topicIds;
    } finally {
    }
}

export async function findDevice(ipAddress) {
    try {
        const ip = client.db("db").collection("ip");
        return await ip.findOne({ ipAddress: await sha256(ipAddress) });
    } finally {
    }
}

async function addDeviceToIp(ipAddress, amount = 1) {
    try {
        const ip = client.db("db").collection("ip");

        await ip.updateOne(
            { ipAddress: await sha256(ipAddress) },
            {
                $inc: {
                    amount: amount
                }
            },
            {
                upsert: true
            }
        );
    } finally {
    }
}

export async function isValidApiKey(apiKey) {
    try {
        const apiKeys = client.db("db").collection("apiKeys");

        return await apiKeys.findOne({ apiKey: apiKey });
    } finally {
    }
}

/**
 * @constructor
 * @param {string} displayName - Display name of user, can be duplicated, no rules
 * @param {string} username - Username of user, can't be duplicated, only limited to alphanumeric characters
 * @param {string} password - Can be anything
 * @param {number} birthday - Birthday as unix time format
 * @param {string} cookieId - The cookieId of the user
 * @param {string} ipAddress - Ip of client
 */
export async function createUser(
    displayName,
    username,
    password,
    birthday,
    cookieId,
    ipAddress
) {
    try {
        const users = client.db("db").collection("users");

        await addDeviceToIp(ipAddress);

        return await users.insertOne({
            displayName: displayName,
            username: username,
            avatar:
                "assets/default_" +
                colors[randint(1, colors.length - 1)] +
                ".png",
            password: await sha256(password),
            birthday: birthday,
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
export async function createRoom(name, visibility, creater, nsfw) {
    try {
        const users = client.db("db").collection("users");
        const rooms = client.db("db").collection("rooms");

        let result = await rooms.insertOne({
            name: name,
            visibility: visibility,
            msgId: 0,
            messages: [],
            members: visibility == "public" ? [] : [creater],
            nsfw: nsfw,
            weeklyMessageAmount: 0,
            lastWeekMessageAmount: 0,
            muted: []
        });

        await users.updateOne(
            {
                username: creater
            },
            {
                $inc: {
                    topicCreated: 1
                }
            }
        );

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

export async function findUserByUsernameQuery(roomId, username) {
    try {
        const users = client.db("db").collection("users");
        let room = await findRoom(roomId);

        let query = {
            username: {
                $regex: new RegExp("^" + username),
                $options: "i"
            }
        };

        if (room.visibility == "private") {
            query["rooms." + roomId] = { $exists: true };
        }

        console.log(
            "🚀 ~ file: utils.js:135 ~ findUserByUsernameQuery ~ query:",
            query
        );

        return await users.findOne(query);
    } catch (e) {
        console.error(e);
        return null;
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

/**
 * # Warning, this only searches the public room
 * @param {string} name
 * @returns {Promise<import("mongodb").WithId<import("mongodb").Document> | null>}
 */
export async function findRoomByName(name) {
    try {
        const rooms = client.db("db").collection("rooms");

        return await rooms.findOne({
            name: name,
            visibility: "public"
        });
    } finally {
    }
}

export async function findRoomWithUser(username, visibility, limit = 20) {
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
                            "members.username": username
                        }
                    ],
                    visibility: visibility
                },
                {
                    projection: {
                        _id: 1,
                        name: 1,
                        members: 1
                    }
                }
            )
            .sort({
                lastWeekMessageAmount: -1,
                weeklyMessageAmount: -1
            })
            .limit(limit)
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
                                username: username
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
                        name: 1,
                        members: 1
                    }
                }
            )
            .toArray();
    } finally {
    }
}

/**
 * # Warning, the room can only be private
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
                    ["pins." + room.visibility]: {
                        _id: roomId
                    }
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

export async function insertMessage(
    roomId,
    username,
    content,
    time,
    isHuman,
    id = ""
) {
    try {
        const rooms = client.db("db").collection("rooms");
        const users = client.db("db").collection("users");

        let room = await findRoom(roomId);
        id += room._id.toString() + (room.msgId + 1);

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
                    msgId: 1,
                    weeklyMessageAmount: isHuman
                }
            }
        );

        await users.updateOne(
            {
                username: username
            },
            {
                $set: {
                    lastMessageTimestamp: time
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

        let result = await rooms.updateOne(
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

        return result;
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

export async function mute(roomId, username, reason = "") {
    try {
        const rooms = client.db("db").collection("rooms");

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $push: {
                    muted: {
                        username: username,
                        reason: reason
                    }
                }
            }
        );
    } finally {
    }
}

export async function unmute(roomId, username) {
    try {
        const rooms = client.db("db").collection("rooms");

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $pull: {
                    muted: {
                        username: username
                    }
                }
            }
        );
    } finally {
    }
}

export async function ban(userId, reason) {
    try {
        const users = client.db("db").collection("users");

        await users.updateOne(
            {
                _id: new ObjectId(userId)
            },
            {
                $set: {
                    banned: reason
                }
            }
        );
    } finally {
    }
}

export async function unban(userId) {
    try {
        const users = client.db("db").collection("users");

        await users.updateOne(
            {
                _id: new ObjectId(userId)
            },
            {
                $set: {
                    banned: false
                }
            }
        );
    } finally {
    }
}

export async function lock(roomId) {
    try {
        const rooms = client.db("db").collection("rooms");

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $set: {
                    locked: true
                }
            }
        );
    } finally {
    }
}

export async function unlock(roomId) {
    try {
        const rooms = client.db("db").collection("rooms");

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $set: {
                    locked: false
                }
            }
        );
    } finally {
    }
}

export async function defineWord(roomId, word, definition) {
    try {
        const rooms = client.db("db").collection("rooms");

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $set: {
                    ["dictionary." + word]: definition
                }
            }
        );
    } finally {
    }
}

export async function undefineWord(roomId, word) {
    try {
        const rooms = client.db("db").collection("rooms");

        await rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $unset: {
                    ["dictionary." + word]: 1
                }
            }
        );
    } finally {
    }
}

export async function getWordDefinition(roomId, word) {
    try {
        const rooms = client.db("db").collection("rooms");

        let room = await rooms.findOne({
            _id: new ObjectId(roomId)
        });

        return room.dictionary[word];
    } finally {
    }
}
