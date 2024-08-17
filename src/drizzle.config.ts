import { config } from 'dotenv';
import { defineConfig } from "drizzle-kit";

const res = config({ path: '../.env' });

console.log(res,process.env.DATABASE_URL)

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});