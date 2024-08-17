import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as schema from "./schema.js";
config({ path: "../.env" });
//console.log("DATABASE_URL_migrate:", process.env.DATABASE_URL );
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
