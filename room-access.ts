import type { RoomDoc, UserDoc } from "./types.ts";

export function isPrivateRoom(room: RoomDoc | null | undefined) {
	return room?.visibility === "private";
}

export function isRoomMember(
	user: Pick<UserDoc, "username"> | null | undefined,
	room: Pick<RoomDoc, "members"> | null | undefined,
) {
	return !!room?.members?.find(
		member => (member as { username: string }).username === user?.username,
	);
}

export function canAccessRoom(
	user: Pick<UserDoc, "username"> | null | undefined,
	room: RoomDoc | null | undefined,
) {
	return (
		!!user && !!room && (!isPrivateRoom(room) || isRoomMember(user, room))
	);
}
