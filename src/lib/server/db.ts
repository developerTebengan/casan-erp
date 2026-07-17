import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';
import { Pool } from 'pg';

function parseDatabaseUrl(url: string | undefined) {
	if (!url) throw new Error('DATABASE_URL is not defined');
	const parsed = new URL(url);
	return {
		host: parsed.hostname,
		port: parsed.port ? Number(parsed.port) : 5432,
		user: parsed.username,
		password: decodeURIComponent(parsed.password),
		database: parsed.pathname.slice(1)
	};
}

const pool = new Pool(parseDatabaseUrl(process.env.DATABASE_URL));
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
