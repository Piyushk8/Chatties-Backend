import { CloudinaryFile } from "../types/types.js";

export const getBase64 = (file:CloudinaryFile) => {
    if (!file || !file.buffer) {
      throw new Error("Invalid file or file buffer");
    }
    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  };
  