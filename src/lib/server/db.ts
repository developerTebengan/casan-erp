import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.ts';
import { Pool } from 'pg';

function createPool(url: string | undefined) {
	if (!url) throw new Error('DATABASE_URL is not defined');
	const parsed = new URL(url);
	const host = parsed.hostname;
	const local = host === 'localhost' || host === '127.0.0.1';
	return new Pool({
		connectionString: url,
		max: local ? 10 : 1,
		ssl: local ? undefined : { rejectUnauthorized: false }
	});
}

const pool = createPool(process.env.DATABASE_URL);
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
