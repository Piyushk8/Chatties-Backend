import express from "express"
import { mainRouter } from "./routes/mainRouter.js";
import cookieParser from "cookie-parser";
import cors from "cors"
import { createServer } from "http"
import { redisConfig, RedisService } from "./Redis/redisManager.js";
import { SocketService } from "./Socket/Socket.js";

const app = express();
export const server = createServer(app)

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.CLIENT_URL || ""
].filter(Boolean)

// Initialize Redis and Socket services
export const redisService = RedisService.getInstance(redisConfig);
export const socketService = new SocketService(server, redisService);

// Express middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(cors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, 
    optionsSuccessStatus: 204
}))

// Routes
app.get("/", (req, res) => {
  res.send("hello server pingged")
})

app.use("/api/v1", mainRouter)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`)
})