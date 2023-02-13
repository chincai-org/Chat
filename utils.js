import { MongoClient, ObjectId } from "mongodb";
import { config } from "dotenv";

config();
const uri = process.env.uri;
const client = new MongoClient(uri);

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

        users.insertOne({
            displayName: displayName,
            username: username,
            password: password,
            cookieId: cookieId,
            rooms: {},
            pins: []
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

        rooms.insertOne({
            name: name,
            visibility: visibility,
            messages: [],
            members: [creater]
        });
    } finally {
    }
}

export async function findUser(username) {
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
    } finally {
    }
}

export async function insertMessage(roomId, authorId, content, time) {
    try {
        const rooms = client.db("db").collection("rooms");

        rooms.updateOne(
            {
                _id: new ObjectId(roomId)
            },
            {
                $push: {
                    messages: {
                        author: authorId,
                        content: content,
                        createdAt: time
                    }
                }
            }
        );
    } finally {
    }
}

export async function pinRoom(userId, roomId) {
    try {
        const users = client.db("db").collection("users");

        let change = "pins." + (await findRoom(roomId)).visibility;

        users.updateOne(
            {
                id: new ObjectId(userId)
            },
            {
                $push: {
                    ["pins." + change]: roomId
                }
            }
        );
    } finally {
    }
}

export async function unpinRoom(userId, roomId) {
    try {
        const users = client.db("db").collection("users");

        let change = "pins." + (await findRoom(roomId)).visibility;

        users.updateOne(
            {
                id: new ObjectId(userId)
            },
            {
                $pull: {
                    ["pins." + change]: roomId
                }
            }
        );
    } finally {
    }
}
