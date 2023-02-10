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
 */
export async function createUser(displayName, username, password) {
    try {
        const users = client.db("db").collection("users");

        users.insertOne({
            displayName: displayName,
            username: username,
            password: password,
            rooms: {},
            pins: []
        });
    } finally {
    }
}

/**
 * @constructor
 * @param {string} name - Topic name
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
            admin: creater,
            coAdmins: [],
            members: []
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

export async function findRoom(roomId) {
    try {
        const rooms = client.db("db").collection("rooms");
        return await rooms.findOne({ _id: ObjectId(roomId) });
    } finally {
    }
}

// TODO: Insert msg, pin topic, change role
