import { MongoClient } from "mongodb";
import { config } from "dotenv";

config();
const uri = process.env.uri;
const client = new MongoClient(uri);

export async function createUser() {
    try {
        const users = client.db("db").collection("users");

        // TODO create user
    } finally {
    }
}
