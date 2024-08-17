export const getBase64 = (file) => {
    if (!file || !file.buffer) {
        throw new Error("Invalid file or file buffer");
    }
    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};
