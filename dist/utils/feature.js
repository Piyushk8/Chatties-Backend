// const TryCatch=(passedfunction:)=> async(req,res,next)=>{
//     try{
import Jwt from "jsonwebtoken";
const cookieOption = {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'none',
    secure: true,
};
const sendToken = (res, user, code, message) => {
    const token = Jwt.sign(user.id, "JSON_SECRET");
    return res.status(code).cookie("token", "Bearer " + token, {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        sameSite: 'none',
        secure: true,
    })
        .json({
        sucsess: true,
        user,
        message
    });
};
export { sendToken };
