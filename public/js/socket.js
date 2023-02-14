const socket = io();

socket.on("msg", (authorName, roomId, content, time) => {
    // TODO append msg to html
    // time is unix timestamp convert urself ;)
});

socket.on("rooms", (rooms, pins) => {
    console.table(rooms);
    console.table(pins);
    // TODO append room to rooms
    // Object in rooms and pins looks something like this:
    // {
    //     _id: "xxx",
    //     name: "xxx"
    // }
});
