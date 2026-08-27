export type UserRole =
	| 'ADMIN'
	| 'USER'
	| 'BUYER'
	| 'STOCK_KEEPER'
	| 'DEPARTMENT_HEAD'
	| 'FINANCE'
	| 'MANAGER'
	| 'DIRECTOR';

export interface User {
	id: string;
	name: string;
	email: string;
	role: UserRole;
}

export interface Category {
	id: string;
	name: string;
	createdAt?: string;
	updatedAt?: string;
}

export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface Supplier {
	id: string;
	name: string;
	type?: string | null;
	phone?: string | null;
	address?: string | null;
	contactPerson?: string | null;
	email?: string | null;
	paymentTerms?: string | null;
	leadTimeDays?: number | null;
	taxId?: string | null;
	status?: SupplierStatus;
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
	preferredSupplierId?: string | null;
	preferredSupplier?: Supplier | null;
	status: ProductStatus;
	createdAt: string;
	updatedAt: string;
}

export type PurchasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FulfillmentStatus = 'N/A' | 'OPEN' | 'PARTIAL' | 'COMPLETE';

export interface PurchaseItem {
	id: string;
	purchaseId: string;
	productId: string;
	product?: Product;
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
	expectedDeliveryDate?: string | null;
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
	fulfillmentStatus?: FulfillmentStatus;
	receivedQty?: number;
	orderedQty?: number;
	total: number;
	items?: PurchaseItem[];
	createdAt: string;
	updatedAt: string;
}

export interface ReadyToReceiveRow extends Purchase {
	remainingLines: number;
	remainingQty: number;
	orderedQty: number;
	receivedQty: number;
	fulfillmentStatus: FulfillmentStatus;
	canReceive: true;
}

export type StockTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
export type StockTransactionSource =
	| 'MANUAL'
	| 'PURCHASE'
	| 'SALES'
	| 'ADJUSTMENT'
	| 'CYCLE_COUNT'
	| 'TRANSFER';

export interface Warehouse {
	id: string;
	code: string;
	name: string;
	isDefault: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface StockTransaction {
	id: string;
	productId: string;
	product?: Product;
	type: StockTransactionType;
	source: StockTransactionSource;
	referenceId?: string | null;
	warehouseId?: string | null;
	warehouse?: Warehouse | null;
	reversedFromId?: string | null;
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

export interface GoodsReceipt {
	id: string;
	grnNumber: string;
	purchaseId: string;
	warehouseId?: string | null;
	note?: string | null;
	createdBy?: string | null;
	createdAt: string;
	lines?: { productId: string; qty: number; product?: Product }[];
	purchase?: Purchase;
	warehouse?: Warehouse | null;
}

export interface CycleCount {
	id: string;
	code: string;
	warehouseId: string;
	warehouse?: Warehouse;
	status: 'DRAFT' | 'POSTED' | 'CANCELLED';
	note?: string | null;
	createdById?: string | null;
	postedAt?: string | null;
	createdAt: string;
	lines?: {
		id: string;
		productId: string;
		product?: Product;
		systemQty: number;
		countedQty: number;
		variance: number;
	}[];
}

export interface AppNotification {
	id: string;
	userId: string;
	type: string;
	title: string;
	body: string;
	href?: string | null;
	readAt?: string | null;
	createdAt: string;
}

export interface DashboardStats {
	totalProducts: number;
	totalPurchaseOrders: number;
	totalSuppliers: number;
	lowStockItems: number;
	pendingApprovals: number;
	readyToReceive?: number;
	unreadNotifications?: number;
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
	stats: DashboardStats;
	monthlyPurchases: MonthlyPurchase[];
	recentActivities: RecentActivity[];
	categoryStock: CategoryStockStat[];
	productsByCategory: DashboardProductRow[];
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
