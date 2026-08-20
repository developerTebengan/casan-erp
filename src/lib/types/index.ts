export type UserRole = 'ADMIN' | 'USER' | 'DEPARTMENT_HEAD' | 'FINANCE' | 'MANAGER' | 'DIRECTOR';

export interface User {
	id: string;
	name: string;
	email: string;
	role: UserRole;
}

export interface Category {
	id: string;
	name: string;
}

export interface Supplier {
	id: string;
	name: string;
	type?: string | null;
	phone?: string | null;
	address?: string | null;
	products?: { id: string; code: string; name: string }[];
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
	price: number;
	imageUrl?: string | null;
	status: ProductStatus;
	lastInAt?: string | null;
	suppliers?: Supplier[];
	createdAt: string;
	updatedAt: string;
}

export type PurchasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PurchaseItem {
	id: string;
	purchaseId: string;
	productId: string;
	product?: Product;
	supplierId?: string | null;
	supplier?: Supplier | null;
	qty: number;
	price: number;
	subtotal: number;
	notes?: string | null;
}

export interface Purchase {
	id: string;
	prNumber: string;
	supplierId?: string | null;
	supplier?: Supplier | null;
	dateOfRequest: string;
	priority: PurchasePriority;
	requesterId: string;
	requester?: User;
	dateRequired: string;
	decisionDeadline: string;
	department: string;
	purpose: string;
	comments?: string | null;
	departmentHeadId?: string | null;
	departmentHead?: User | null;
	departmentHeadStatus: ApprovalStatus;
	departmentHeadApprovedAt?: string | null;
	financeApproverId?: string | null;
	financeApprover?: User | null;
	financeStatus: ApprovalStatus;
	financeApprovedAt?: string | null;
	finalApproverId?: string | null;
	finalApprover?: User | null;
	finalStatus: ApprovalStatus;
	finalApprovedAt?: string | null;
	approvalStatus: ApprovalStatus;
	rejectionReason?: string | null;
	total: number;
	tax: number;
	shipping: number;
	otherFees: number;
	actualTax?: number | null;
	actualShipping?: number | null;
	actualOtherFees?: number | null;
	items?: PurchaseItem[];
	fullyReceived?: boolean;
	partiallyReceived?: boolean;
	createdAt: string;
	updatedAt: string;
}

export type StockTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type StockTransactionSource = 'MANUAL' | 'PURCHASE' | 'SALES' | 'ADJUSTMENT' | 'PETTY_CASH';

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
	unitPrice?: number | null;
	note?: string | null;
	createdBy?: string | null;
	createdAt: string;
}

export interface StockTransactionFilters {
	search?: string;
	productId?: string;
	type?: StockTransactionType;
	from?: string;
	to?: string;
	page?: number;
	limit?: number;
}

export type PettyCashType = 'TOP_UP' | 'SPEND' | 'REFUND' | 'TRANSFER';
export type SourceOfFund =
	| 'CASH'
	| 'BANK_TRANSFER'
	| 'DIRECTOR'
	| 'REVENUE'
	| 'OTHER'
	| 'PR_LEFTOVER';

export interface PettyCashTransaction {
	id: string;
	type: PettyCashType;
	amount: number;
	balanceAfter: number;
	expectedAmount?: number | null;
	paidAmount?: number | null;
	catalogUnitPrice?: number | null;
	actualUnitPrice?: number | null;
	qty?: number | null;
	productId?: string | null;
	product?: { id: string; code: string; name: string } | null;
	supplierId?: string | null;
	supplier?: { id: string; name: string } | null;
	sourceOfFund?: SourceOfFund | null;
	stockTransactionId?: string | null;
	note?: string | null;
	createdBy?: string | null;
	createdAt: string;
}

export interface PettyCashSummary {
	balance: number;
	transactions: PettyCashTransaction[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export type DashboardHome = 'queue' | 'mine' | 'ops';

export interface DashboardStats {
	lowStockItems: number;
	pendingApprovals: number;
	pendingPurchases: number;
}

export interface CategoryStockStat {
	categoryId: string;
	categoryName: string;
	productCount: number;
	totalStock: number;
	lowStockCount: number;
	inventoryValue: number;
}

export interface DashboardProductRow {
	id: string;
	code: string;
	name: string;
	categoryName: string;
	stock: number;
	minimumStock: number;
	unit: string;
	imageUrl?: string | null;
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
	home: DashboardHome;
	stats: DashboardStats;
	queue: Purchase[];
	mine: Purchase[];
	lowStockProducts: DashboardProductRow[];
	recentPurchases: Purchase[];
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
