import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProductStatus, PurchaseStatus } from '../generated/prisma/client';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

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

const prisma = new PrismaClient({ adapter });

async function main() {
	await prisma.purchaseItem.deleteMany();
	await prisma.purchase.deleteMany();
	await prisma.product.deleteMany();
	await prisma.category.deleteMany();
	await prisma.supplier.deleteMany();
	await prisma.user.deleteMany();

	const password = await bcrypt.hash('password', 10);

	await prisma.user.create({
		data: {
			name: 'Admin User',
			email: 'admin@casanerp.com',
			password,
			role: 'ADMIN'
		}
	});

	await prisma.user.create({
		data: {
			name: 'John Doe',
			email: 'user@casanerp.com',
			password,
			role: 'USER'
		}
	});

	const suppliers = await Promise.all(
		[
			{ name: 'PT Sumber Jaya', phone: '021-5551234', address: 'Jl. Sudirman No. 12, Jakarta' },
			{ name: 'CV Maju Bersama', phone: '021-5555678', address: 'Jl. Thamrin No. 45, Jakarta' },
			{ name: 'UD Sejahtera', phone: '031-5559012', address: 'Jl. Pemuda No. 7, Surabaya' },
			{
				name: 'PT Nusantara Indah',
				phone: '022-5553456',
				address: 'Jl. Asia Afrika No. 23, Bandung'
			},
			{ name: 'Toko Makmur', phone: '024-5557890', address: 'Jl. Pandanaran No. 9, Semarang' }
		].map((s) => prisma.supplier.create({ data: s }))
	);

	const categories = await Promise.all(
		['Electronics', 'Office Supplies', 'Furniture', 'Cleaning Supplies', 'Tools'].map((name) =>
			prisma.category.create({ data: { name } })
		)
	);

	const productsData = [
		{
			code: 'P001',
			name: 'Laptop ASUS VivoBook',
			category: 'Electronics',
			unit: 'PCS',
			stock: 25,
			minimumStock: 5,
			purchasePrice: 6500000,
			sellingPrice: 7500000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P002',
			name: 'Wireless Mouse Logitech',
			category: 'Electronics',
			unit: 'PCS',
			stock: 120,
			minimumStock: 20,
			purchasePrice: 150000,
			sellingPrice: 195000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P003',
			name: 'Mechanical Keyboard',
			category: 'Electronics',
			unit: 'PCS',
			stock: 45,
			minimumStock: 10,
			purchasePrice: 450000,
			sellingPrice: 599000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P004',
			name: 'A4 Paper 80gsm (Ream)',
			category: 'Office Supplies',
			unit: 'REAM',
			stock: 200,
			minimumStock: 50,
			purchasePrice: 45000,
			sellingPrice: 55000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P005',
			name: 'Ballpoint Pen (Box)',
			category: 'Office Supplies',
			unit: 'BOX',
			stock: 80,
			minimumStock: 15,
			purchasePrice: 25000,
			sellingPrice: 35000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P006',
			name: 'Ergonomic Office Chair',
			category: 'Furniture',
			unit: 'PCS',
			stock: 12,
			minimumStock: 3,
			purchasePrice: 1200000,
			sellingPrice: 1500000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P007',
			name: 'Standing Desk',
			category: 'Furniture',
			unit: 'PCS',
			stock: 7,
			minimumStock: 2,
			purchasePrice: 2800000,
			sellingPrice: 3400000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P008',
			name: 'Floor Cleaner 5L',
			category: 'Cleaning Supplies',
			unit: 'BTL',
			stock: 4,
			minimumStock: 10,
			purchasePrice: 35000,
			sellingPrice: 48000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P009',
			name: 'Multi-purpose Screwdriver Set',
			category: 'Tools',
			unit: 'SET',
			stock: 30,
			minimumStock: 8,
			purchasePrice: 85000,
			sellingPrice: 120000,
			status: ProductStatus.ACTIVE
		},
		{
			code: 'P010',
			name: 'LED Desk Lamp',
			category: 'Electronics',
			unit: 'PCS',
			stock: 2,
			minimumStock: 5,
			purchasePrice: 175000,
			sellingPrice: 235000,
			status: ProductStatus.ACTIVE
		}
	];

	const products = await Promise.all(
		productsData.map((p) =>
			prisma.product.create({
				data: {
					code: p.code,
					name: p.name,
					categoryId: categories.find((c) => c.name === p.category)!.id,
					unit: p.unit,
					stock: p.stock,
					minimumStock: p.minimumStock,
					purchasePrice: p.purchasePrice,
					sellingPrice: p.sellingPrice,
					status: p.status
				}
			})
		)
	);

	const statuses = [
		PurchaseStatus.DRAFT,
		PurchaseStatus.ORDERED,
		PurchaseStatus.RECEIVED,
		PurchaseStatus.CANCELLED
	];

	for (let i = 1; i <= 20; i++) {
		const supplier = suppliers[i % suppliers.length];
		const itemCount = 1 + (i % 3);
		const items: { productId: string; qty: number; price: number; subtotal: number }[] = [];
		let total = 0;

		for (let j = 0; j < itemCount; j++) {
			const product = products[(i + j) % products.length];
			const qty = 1 + (j % 5);
			const price = Number(product.purchasePrice);
			const subtotal = qty * price;
			total += subtotal;
			items.push({ productId: product.id, qty, price, subtotal });
		}

		await prisma.purchase.create({
			data: {
				poNumber: `PO-2026-${String(i).padStart(3, '0')}`,
				supplierId: supplier.id,
				purchaseDate: new Date(2026, i % 12, (i % 28) + 1),
				status: statuses[i % statuses.length],
				total,
				items: {
					create: items
				}
			}
		});
	}

	console.log('Seed completed successfully.');
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
