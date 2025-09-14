// db.ts
import { Client } from "pg";
import "dotenv/config"

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "raguser",
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  database: process.env.DB_NAME || "ragdb",
});

export async function connectDB() {
  try {
    await client.connect();
    console.log("Postgres connected!");
  } catch (err) {
    console.error("Failed to connect to Postgres", err);
    process.exit(1); // stop server if DB fails
  }
}

export default client;
