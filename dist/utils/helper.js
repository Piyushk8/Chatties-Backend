import { socketIds } from "../app.js";
export const getBase64 = (file) => {
    if (!file || !file.buffer) {
        throw new Error("Invalid file or file buffer");
    }
    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};
export const getSockets = (users = []) => {
    // console.log(users,"users")
    const sockets = users.map((user) => {
        return socketIds.get(user?.user.id);
    });
    return sockets;
};
export const getSocketIds = (users = []) => {
    // console.log(users,"users")
    const sockets = users.map((user) => {
        return socketIds.get(user);
    });
    console.log(sockets, users);
    return sockets;
};
export const emitEvent = (req, event, users, data) => {
    const userSockets = getSocketIds(users);
    const io = req.app.get("io");
    console.log(event);
    io.to(userSockets).emit(event, data);
};
