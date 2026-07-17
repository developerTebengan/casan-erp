export interface User {
	id: string;
	name: string;
	email: string;
	role: string;
}

export interface Category {
	id: string;
	name: string;
}

export interface Supplier {
	id: string;
	name: string;
	phone?: string | null;
	address?: string | null;
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface Product {
	id: string;
	code: string;
	name: string;
	categoryId: string;
	category?: Category;
	unit: string;
	stock: number;
	minimumStock: number;
	purchasePrice: number;
	sellingPrice: number;
	status: ProductStatus;
	createdAt: string;
	updatedAt: string;
}

export type PurchaseStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseItem {
	id: string;
	purchaseId: string;
	productId: string;
	product?: Product;
	qty: number;
	price: number;
	subtotal: number;
}

export interface Purchase {
	id: string;
	poNumber: string;
	supplierId: string;
	supplier?: Supplier;
	purchaseDate: string;
	status: PurchaseStatus;
	total: number;
	items?: PurchaseItem[];
	createdAt: string;
	updatedAt: string;
}

export type StockTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type StockTransactionSource = 'MANUAL' | 'PURCHASE' | 'SALES' | 'ADJUSTMENT';

export interface StockTransaction {
	id: string;
	productId: string;
	product?: Product;
	type: StockTransactionType;
	source: StockTransactionSource;
	referenceId?: string | null;
	qty: number;
	stockBefore: number;
	stockAfter: number;
	note?: string | null;
	createdBy?: string | null;
	createdAt: string;
}

export interface StockTransactionFilters {
	search?: string;
	productId?: string;
	type?: StockTransactionType;
	page?: number;
	limit?: number;
}

export interface DashboardStats {
	totalProducts: number;
	totalPurchaseOrders: number;
	totalSuppliers: number;
	lowStockItems: number;
}

export interface MonthlyPurchase {
	month: string;
	total: number;
}

export interface RecentActivity {
	id: string;
	description: string;
	date: string;
	type: 'PRODUCT' | 'PURCHASE';
}

export interface DashboardData {
	stats: DashboardStats;
	monthlyPurchases: MonthlyPurchase[];
	recentActivities: RecentActivity[];
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ApiError {
	message: string;
	errors?: Record<string, string[]>;
}
