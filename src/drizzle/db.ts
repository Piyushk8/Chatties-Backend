import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

const result = config({ path: '../.env' }); // or .env.local
//console.log("DATABASE_URL_db.ts:", process.env.DATABASE_URL);
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

async function main() {
  console.log('Running migrations...');  
  await migrate(db, { migrationsFolder: './drizzle/migrations' 
  });
  
  console.log('Migrations complete!');
  
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed');
  console.error(err);
  process.exit(1);
})