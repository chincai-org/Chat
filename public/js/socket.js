const socket = io();

socket.on("msg", (authorName, roomId, content, time) => {
    // TODO append msg to html
    // time is unix timestamp convert urself ;)
});
