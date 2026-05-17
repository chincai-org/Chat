import type { ObjectId } from "mongodb";
import type { Server, Socket } from "socket.io";

export type PinRef = {
	_id: string | { toString(): string };
	name: string;
	members?: Array<{ username: string } | string>;
};

export type UserDoc = {
	_id?: ObjectId | string;
	username: string;
	cookieId: string;
	displayName: string;
	password: string;
	avatar: string;
	rooms: Record<string, string>;
	pins?: { public: PinRef[]; private: PinRef[] };
	banned?: string | false;
	lastMessageTimestamp?: number;
	topicCreated?: number;
};

export type MessageDoc = {
	id: string;
	author: string;
	content: string;
	createdAt: number;
};

export type RoomDoc = {
	_id: ObjectId | string;
	name: string;
	visibility: string;
	msgId: number;
	messages: MessageDoc[];
	members?: Array<{ username: string } | string>;
	muted?: Array<{ username: string; reason: string }>;
	locked?: boolean;
	dictionary?: Record<string, string>;
};

export type SocketContext = {
	io: Server;
	socket: Socket;
	user: UserDoc;
	room: RoomDoc;
};

export type RoomSummary = {
	_id: string;
	name: string;
	members?: Array<{ username: string } | string>;
};

export type ChatMessage = {
	id: string;
	authorName: string;
	authorUsername: string;
	avatar: string;
	roomId: string;
	content: string;
	time: number;
	pings?: string[];
	topicIds?: Array<{ id: string; name: string }>;
};

export type ClientToServerEvents = {
	msg: (cookieId: string, roomId: string, msg: string) => void;
	rooms: (cookieId: string, visibility: string) => void;
	findrooms: (cookieId: string, visibility: string, query: string) => void;
	"new-room": (
		cookieId: string,
		name: string,
		visibility: string,
		nsfw?: boolean,
	) => void;
	"change-name": (cookieId: string, roomId: string, newName: string) => void;
	typing: (cookieId: string, roomId: string, timeStart: number) => void;
	"fetch-typing": (cookieId: string, roomId: string) => void;
	"typing-kill": (id: string, roomId: string) => void;
	leave: (cookieId: string, roomId: string) => void;
	"delete-msg": (cookieId: string, roomId: string, messageId: string) => void;
	pin: (cookieId: string, roomId: string) => void;
	unpin: (cookieId: string, roomId: string) => void;
};

export type ServerToClientEvents = {
	msg: (message: ChatMessage) => void;
	rooms: (
		rooms: RoomSummary[],
		pins: Array<{
			_id: string;
			name: string;
			members?: Array<{ username: string } | string>;
		}>,
	) => void;
	room: (room: { _id: string; name: string }) => void;
	delete: (msgId: string) => void;
	"change-name": (roomId: string, newName: string) => void;
	typing: (username: string, roomId: string, timeStart: number) => void;
	typings: (usersTyping: Record<string, number>) => void;
	"typing-kill": (username: string) => void;
	ban: () => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = Record<string, never>;
