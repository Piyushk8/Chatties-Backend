import { v2 as cloudinary } from "cloudinary";
import "dotenv";
import { config } from "dotenv";
import { getBase64 } from "./helper.js";
config({ path: "../.env" });
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});
export const uploadToCloudinary = async (files = []) => {
    const cloudinaryUrls = [];
    const uploadPromise = files.map((file) => {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload(getBase64(file), {
                resource_type: 'auto',
                folder: "DrizzleChatApp",
            }, (err, result) => {
                if (err) {
                    console.error('Cloudinary upload error:', err);
                    return reject(err);
                }
                if (!result) {
                    console.error('Cloudinary upload error: Result is undefined');
                    return reject();
                }
                resolve(result);
                cloudinaryUrls.push(result.secure_url);
            });
        });
    });
    try {
        const result = await Promise.all(uploadPromise);
        return cloudinaryUrls;
    }
    catch (error) {
        console.log("Upload Failed");
        throw error;
    }
};
// console.log(process.env.CLOUDINARY_CLOUD_NAME
//     ,process.env.CLOUDINARY_API_KEY
//     ,process.env.CLOUDINARY_SECRET_KEY)
