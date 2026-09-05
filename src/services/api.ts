import {
  IProduct,
  IOrder,
  IRowGroup,
  IWarehouseStats,
  IBin,
  IAnalyticsData,
  IActivityLog,
  IAllocationResult,
  IDeliveryPartner,
  IDeliveryHandover,
  IInboundShipment,
  IWarehouseVacancy,
  IAuthUser,
  IDeliveryDateTask,
  IManufacturerProduct,
  IManufacturerChatMessage,
  IWarehouseLocationInfo,
  IPartnerPickupItem,
  IWarehouseInventoryItem,
} from '../types.js';

const BASE_URL = '/api';

async function fetchSafe<T>(url: string, options?: RequestInit, retries: number = 2): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err: any) {
      attempt++;
      if (attempt > retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
}

export const api = {
  // Health
  async getHealth() {
    return fetchSafe<{ status: string; service: string; version: string; database: any }>(`${BASE_URL}/health`);
  },

  // Products
  async getProducts(params?: { search?: string; category?: string; status?: string; sortBy?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.sortBy) query.set('sortBy', params.sortBy);

    return fetchSafe<{ success: boolean; count: number; products: IProduct[] }>(
      `${BASE_URL}/products?${query.toString()}`
    );
  },

  async getProductByBarcode(barcode: string) {
    return fetchSafe<{ success: boolean; product: IProduct; bin?: IBin; message?: string }>(
      `${BASE_URL}/products/barcode/${encodeURIComponent(barcode)}`
    );
  },

  async getProduct(id: string) {
    return fetchSafe<{ success: boolean; product: IProduct; bin?: IBin; recentTransactions: any[] }>(
      `${BASE_URL}/products/${id}`
    );
  },

  async createProduct(data: {
    name: string;
    sku: string;
    barcode: string;
    serialNumber?: string;
    category: string;
    quantity: number;
    minimumStock?: number;
    unitPrice?: number;
    description?: string;
  }) {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      product?: IProduct;
      allocation?: IAllocationResult;
      message?: string;
    }>;
  },

  async updateProduct(id: string, data: Partial<IProduct>) {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{ success: boolean; product?: IProduct; message?: string }>;
  },

  async deleteProduct(id: string) {
    const res = await fetch(`${BASE_URL}/products/${id}`, { method: 'DELETE' });
    return res.json() as Promise<{ success: boolean; message: string }>;
  },

  // Orders
  async getOrders(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${BASE_URL}/orders?${query.toString()}`);
    return res.json() as Promise<{ success: boolean; count: number; orders: IOrder[] }>;
  },

  async getOrder(id: string) {
    const res = await fetch(`${BASE_URL}/orders/${id}`);
    return res.json() as Promise<{ success: boolean; order: IOrder }>;
  },

  async createOrder(data: {
    customerName: string;
    customerEmail?: string;
    destination?: string;
    priority?: string;
    items: { productId?: string; barcode?: string; quantity: number }[];
  }) {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{ success: boolean; order?: IOrder; message?: string }>;
  },

  async pickOrderItem(orderId: string, data: { scannedBarcode: string; expectedBarcode: string }) {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/pick-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      verified: boolean;
      errorType?: string;
      message?: string;
      expected?: any;
      scanned?: any;
      allPicked?: boolean;
      orderStatus?: string;
      order?: IOrder;
    }>;
  },

  async dispatchOrder(orderId: string) {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/dispatch`, {
      method: 'POST',
    });
    return res.json() as Promise<{ success: boolean; order?: IOrder; message?: string }>;
  },

  // Scan
  async scanBarcode(codeOrPayload: string | { barcode?: string; serialNumber?: string }) {
    const payload = typeof codeOrPayload === 'string' ? { barcode: codeOrPayload } : codeOrPayload;
    const res = await fetch(`${BASE_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json() as Promise<{
      success: boolean;
      found: boolean;
      product?: IProduct;
      bin?: IBin;
      message?: string;
    }>;
  },

  async inwardStock(data: {
    barcode: string;
    serialNumber?: string;
    quantity: number;
    name?: string;
    sku?: string;
    category?: string;
    unitPrice?: number;
    description?: string;
  }) {
    const res = await fetch(`${BASE_URL}/scan/inward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      product?: IProduct;
      allocation?: IAllocationResult;
      message?: string;
    }>;
  },

  // Warehouse
  async getWarehouseOverview() {
    return fetchSafe<{
      success: boolean;
      warehouse: any;
      stats: IWarehouseStats;
      rows: any[];
    }>(`${BASE_URL}/warehouse`);
  },

  async getWarehouseBins() {
    return fetchSafe<{
      success: boolean;
      rows: IRowGroup[];
      rawBins: IBin[];
    }>(`${BASE_URL}/warehouse/bins`);
  },

  async addWarehouseRow() {
    return fetchSafe<{ success: boolean; message: string; row: any; bins: any[] }>(
      `${BASE_URL}/warehouse/add-row`,
      { method: 'POST' }
    );
  },

  // Analytics
  async getAnalytics() {
    return fetchSafe<IAnalyticsData & { success: boolean }>(`${BASE_URL}/analytics`);
  },

  // Activity
  async getActivity(params?: { eventType?: string; severity?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.eventType) query.set('eventType', params.eventType);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.limit) query.set('limit', String(params.limit));

    return fetchSafe<{ success: boolean; count: number; logs: IActivityLog[] }>(
      `${BASE_URL}/activity?${query.toString()}`
    );
  },

  // Delivery & Partner Portal APIs
  async getDeliveryPartners() {
    return fetchSafe<{ success: boolean; count: number; partners: IDeliveryPartner[] }>(
      `${BASE_URL}/deliveries/partners`
    );
  },

  async loginDeliveryPartner(data: { phone: string; pin?: string; name?: string; agency?: string }) {
    const res = await fetch(`${BASE_URL}/deliveries/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      partner?: IDeliveryPartner;
      message: string;
      notFound?: boolean;
      isNew?: boolean;
    }>;
  },

  async registerDeliveryPartner(data: {
    name: string;
    phone: string;
    agency?: string;
    pin?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    city?: string;
  }) {
    const res = await fetch(`${BASE_URL}/deliveries/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      partner?: IDeliveryPartner;
      message: string;
    }>;
  },

  async getMyPickups(phone: string) {
    return fetchSafe<{
      success: boolean;
      count: number;
      activeCount: number;
      deliveredCount: number;
      totalUnitsCarried: number;
      handovers: IDeliveryHandover[];
    }>(`${BASE_URL}/deliveries/my-pickups/${encodeURIComponent(phone)}`);
  },

  async getDeliveries(params?: { status?: string; partner?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.partner) query.set('partner', params.partner);
    if (params?.search) query.set('search', params.search);

    return fetchSafe<{
      success: boolean;
      count: number;
      handovers: IDeliveryHandover[];
      stats: {
        totalHandovers: number;
        totalUnitsDispatched: number;
        totalValueDispatched: number;
        activeOutForDelivery: number;
        deliveredCount: number;
        returnedCount: number;
      };
    }>(`${BASE_URL}/deliveries?${query.toString()}`);
  },

  async createDeliveryHandover(data: {
    deliveryBoyName: string;
    deliveryBoyPhone: string;
    partner?: string;
    vehicleNumber?: string;
    orderReference?: string;
    destination?: string;
    notes?: string;
    items: {
      productId?: string;
      barcode?: string;
      sku?: string;
      quantity: number;
    }[];
  }) {
    const res = await fetch(`${BASE_URL}/deliveries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      handover?: IDeliveryHandover;
      deductions?: {
        productName: string;
        barcode: string;
        quantityDeducted: number;
        remainingStock: number;
      }[];
    }>;
  },

  async updateDeliveryStatus(id: string, data: { status: string; returnReason?: string; notes?: string }) {
    const res = await fetch(`${BASE_URL}/deliveries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      handover?: IDeliveryHandover;
    }>;
  },

  // Datewise Delivery Tasks & Status
  async getDatewiseDeliveryTasks(params?: { dateFilter?: string; warehouseId?: string; partnerId?: string }) {
    const query = new URLSearchParams();
    if (params?.dateFilter) query.set('dateFilter', params.dateFilter);
    if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params?.partnerId) query.set('partnerId', params.partnerId);

    return fetchSafe<{
      success: boolean;
      summary: {
        total: number;
        totalToday: number;
        totalTomorrow: number;
        totalUpcoming: number;
        readyForPickup: number;
        inTransit: number;
        delivered: number;
        completionRate: number;
      };
      tasks: IDeliveryDateTask[];
    }>(`${BASE_URL}/deliveries/datewise-tasks?${query.toString()}`);
  },

  async updateDeliveryTaskStatus(orderId: string, data: { status: string; partnerName?: string; notes?: string }) {
    const res = await fetch(`${BASE_URL}/deliveries/tasks/${orderId}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      order?: IOrder;
    }>;
  },

  // Streamlined Delivery Partner Portal Endpoints
  async getWarehouseLocation(warehouseId?: string) {
    const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
    return fetchSafe<{
      success: boolean;
      warehouse: IWarehouseLocationInfo;
    }>(`${BASE_URL}/deliveries/warehouse-location${query}`);
  },

  async updateWarehouseLocation(data: {
    warehouseId?: string;
    address?: string;
    city?: string;
    contactPhone?: string;
    latitude?: number;
    longitude?: number;
    operatingHours?: string;
  }) {
    const res = await fetch(`${BASE_URL}/deliveries/warehouse-location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      warehouse?: any;
    }>;
  },

  async getWarehouseInventory(params?: { search?: string; category?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);

    return fetchSafe<{
      success: boolean;
      count: number;
      products: IWarehouseInventoryItem[];
    }>(`${BASE_URL}/deliveries/warehouse-inventory?${query.toString()}`);
  },

  async getDeliveryPartnersManagement() {
    return fetchSafe<{
      success: boolean;
      count: number;
      partners: IDeliveryPartner[];
    }>(`${BASE_URL}/deliveries/partners-management`);
  },

  async createDeliveryPartner(data: Partial<IDeliveryPartner>) {
    const res = await fetch(`${BASE_URL}/deliveries/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      partner?: IDeliveryPartner;
    }>;
  },

  async assignOrderToDeliveryPartner(data: {
    orderId: string;
    partnerId: string;
    partnerName?: string;
    scheduledDeliveryDate?: string;
    pickupTimeSlot?: string;
    notes?: string;
  }) {
    const res = await fetch(`${BASE_URL}/deliveries/assign-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      order?: IOrder;
    }>;
  },

  async getAssignedPickups(params?: { partnerId?: string; phone?: string; date?: string }) {
    const query = new URLSearchParams();
    if (params?.partnerId) query.set('partnerId', params.partnerId);
    if (params?.phone) query.set('phone', params.phone);
    if (params?.date) query.set('date', params.date);

    return fetchSafe<{
      success: boolean;
      partner: IDeliveryPartner | null;
      warehouse: IWarehouseLocationInfo;
      stats: {
        totalItems: number;
        pendingCount: number;
        pickedCount: number;
      };
      pickups: IPartnerPickupItem[];
    }>(`${BASE_URL}/deliveries/assigned-pickups?${query.toString()}`);
  },

  async confirmBarcodePickup(data: {
    orderId?: string;
    barcode: string;
    partnerId?: string;
    partnerName?: string;
    partnerPhone?: string;
  }) {
    const res = await fetch(`${BASE_URL}/deliveries/confirm-barcode-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      order?: IOrder;
      item?: any;
      freedSpace?: number;
      binCode?: string;
      newBinOccupancy?: number;
      binVacantUnits?: number;
      newWarehouseVacancy?: number;
      totalWarehouseCapacity?: number;
      allPicked?: boolean;
    }>;
  },

  // Manufacturer Portal Endpoints
  async getWarehouseVacancies() {
    return fetchSafe<{
      success: boolean;
      count: number;
      warehouses: IWarehouseVacancy[];
    }>(`${BASE_URL}/manufacturer/warehouses`);
  },

  async getInboundShipments(params?: { warehouseId?: string; manufacturer?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params?.manufacturer) query.set('manufacturer', params.manufacturer);
    if (params?.status) query.set('status', params.status);

    return fetchSafe<{
      success: boolean;
      count: number;
      shipments: IInboundShipment[];
    }>(`${BASE_URL}/manufacturer/shipments?${query.toString()}`);
  },

  async createInboundShipment(data: {
    manufacturerName?: string;
    manufacturerContact?: string;
    targetWarehouseId: string;
    productName: string;
    sku: string;
    barcode?: string;
    category?: string;
    quantity: number;
    dispatchDate?: string;
    expectedArrivalDate: string;
    carrierName?: string;
    notes?: string;
  }) {
    const res = await fetch(`${BASE_URL}/manufacturer/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      shipment?: IInboundShipment;
    }>;
  },

  async receiveInboundShipment(id: string, data?: { receiverName?: string }) {
    const res = await fetch(`${BASE_URL}/manufacturer/shipments/${id}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      shipment?: IInboundShipment;
      product?: IProduct;
      allocation?: IAllocationResult;
    }>;
  },

  // Manufacturer's Own Factory Products
  async getManufacturerProducts(manufacturerId?: string) {
    const query = manufacturerId ? `?manufacturerId=${encodeURIComponent(manufacturerId)}` : '';
    return fetchSafe<{ success: boolean; count: number; products: IManufacturerProduct[] }>(
      `${BASE_URL}/manufacturer/my-products${query}`
    );
  },

  async addManufacturerProduct(data: Partial<IManufacturerProduct>) {
    const res = await fetch(`${BASE_URL}/manufacturer/my-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      product?: IManufacturerProduct;
    }>;
  },

  async updateManufacturerProduct(id: string, data: Partial<IManufacturerProduct>) {
    const res = await fetch(`${BASE_URL}/manufacturer/my-products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      product?: IManufacturerProduct;
    }>;
  },

  async adjustManufacturerProductStock(id: string, delta: number, reason?: string) {
    const res = await fetch(`${BASE_URL}/manufacturer/my-products/${id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, reason }),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      product?: IManufacturerProduct;
    }>;
  },

  async deleteManufacturerProduct(id: string) {
    const res = await fetch(`${BASE_URL}/manufacturer/my-products/${id}`, {
      method: 'DELETE',
    });
    return res.json() as Promise<{ success: boolean; message: string }>;
  },

  // Manufacturer <-> Inventory Coordinator Chat & Pickup Scheduler
  async getManufacturerChatMessages(conversationId?: string) {
    const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : '';
    return fetchSafe<{ success: boolean; count: number; messages: IManufacturerChatMessage[] }>(
      `${BASE_URL}/manufacturer/chat/messages${query}`
    );
  },

  async sendManufacturerChatMessage(data: {
    conversationId?: string;
    text: string;
    senderName?: string;
    sender?: 'manufacturer' | 'inventory_bot' | 'inventory_manager';
    requestedPickup?: any;
  }) {
    const res = await fetch(`${BASE_URL}/manufacturer/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      userMessage: IManufacturerChatMessage;
      botReply?: IManufacturerChatMessage | null;
    }>;
  },

  async getWarehouseManufacturerNotifications() {
    return fetchSafe<{
      success: boolean;
      latestMessage?: IManufacturerChatMessage | null;
      recentMessages: IManufacturerChatMessage[];
      incomingShipments: any[];
      unreadCount: number;
      timestamp: string;
    }>(`${BASE_URL}/manufacturer/warehouse-notifications`);
  },

  async bookManufacturerPickupSlot(data: {
    conversationId?: string;
    warehouseId: string;
    productName?: string;
    quantity?: number;
    pickupDate: string;
    pickupTimeSlot: string;
    truckNumber?: string;
    notes?: string;
  }) {
    const res = await fetch(`${BASE_URL}/manufacturer/chat/book-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      booking: IManufacturerChatMessage;
    }>;
  },

  // Auth Endpoints
  async loginUser(payload: { email?: string; password?: string; role?: string; isQuickDemo?: boolean }) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      user?: IAuthUser;
      token?: string;
    }>;
  },

  async signupUser(payload: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    role: 'manufacturer' | 'warehouse' | 'delivery';
    companyName?: string;
    warehouseId?: string;
    agency?: string;
    vehicleNumber?: string;
  }) {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json() as Promise<{
      success: boolean;
      message: string;
      user?: IAuthUser;
      token?: string;
    }>;
  },

  // Demo
  async resetDemoData() {
    const res = await fetch(`${BASE_URL}/demo/reset`, { method: 'POST' });
    return res.json() as Promise<{ success: boolean; message: string; result: any }>;
  },

  async getDemoShortcuts() {
    const res = await fetch(`${BASE_URL}/demo/shortcuts`);
    return res.json() as Promise<{ success: boolean; demoFlow: any }>;
  },
};
