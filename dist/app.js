import express from "express";
import { mainRouter } from "./routes/mainRouter.js";
import cookieParser from "cookie-parser";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/v1", mainRouter);
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`listenning at port ${PORT}`);
});
