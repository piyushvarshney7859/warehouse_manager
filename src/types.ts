export interface IProductLocation {
  warehouseId: string;
  row: string;
  bin: string;
}

export interface IProduct {
  _id: string;
  barcode: string;
  serialNumber?: string;
  serialNumbers?: string[];
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minimumStock: number;
  location: IProductLocation;
  unitPrice: number;
  description?: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  createdAt?: string;
  updatedAt?: string;
}

export interface IAssignedProduct {
  productId?: string;
  sku: string;
  barcode: string;
  name: string;
  quantity: number;
}

export interface IBin {
  _id: string;
  warehouseId: string;
  rowCode: string;
  binCode: string;
  orderIndex: number;
  capacity: number;
  currentOccupancy: number;
  status: 'empty' | 'available' | 'nearly_full' | 'full';
  assignedProducts: IAssignedProduct[];
}

export interface IRowGroup {
  rowCode: string;
  orderIndex: number;
  capacity: number;
  currentOccupancy: number;
  occupancyRate: number;
  status: string;
  bins: IBin[];
}

export interface IWarehouseStats {
  totalCapacity: number;
  currentOccupancy: number;
  occupancyRate: number;
  totalRows: number;
  totalBins: number;
  occupiedBins: number;
  availableBins: number;
  fullBins: number;
}

export interface IOrderItem {
  productId: string;
  barcode: string;
  name: string;
  sku: string;
  quantity: number;
  location: {
    warehouseId: string;
    row: string;
    bin: string;
  };
  isPicked: boolean;
  pickedAt?: string;
  scannedBarcode?: string;
}

export interface IOrder {
  _id: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  destination: string;
  items: IOrderItem[];
  status: 'Pending' | 'Picking' | 'Picked' | 'Ready for Dispatch' | 'Dispatched';
  priority: 'Standard' | 'High' | 'Express';
  createdAt: string;
  pickedAt?: string;
  dispatchedAt?: string;
}

export interface IInventoryTransaction {
  _id: string;
  product: string;
  productName: string;
  barcode: string;
  sku: string;
  type: 'INWARD' | 'PICK' | 'ADJUSTMENT' | 'TRANSFER' | 'OUTWARD';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  location: {
    row: string;
    bin: string;
  };
  referenceOrder?: string;
  timestamp: string;
}

export interface IActivityLog {
  _id: string;
  eventType:
    | 'PRODUCT_ADDED'
    | 'PRODUCT_SCANNED'
    | 'LOCATION_ASSIGNED'
    | 'ORDER_CREATED'
    | 'PRODUCT_PICKED'
    | 'WRONG_BARCODE_SCANNED'
    | 'INVENTORY_UPDATED'
    | 'ORDER_DISPATCHED'
    | 'ROW_ACTIVATED'
    | 'SYSTEM_ALERT';
  title: string;
  description: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface IRestockInsight {
  sku: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  suggestedReorderQuantity: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reason: string;
}

export interface IWarehouseInsights {
  summary: string;
  restockRecommendations: IRestockInsight[];
  slottingAdvice: string[];
  throughputTip: string;
  source: 'gemini-ai' | 'deterministic-heuristics';
}

export interface IAnalyticsData {
  summary: {
    totalProducts: number;
    totalInventoryUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalOrders: number;
    pendingOrders: number;
    pickingOrders: number;
    pickedOrders: number;
    readyForDispatchOrders: number;
    dispatchedOrders: number;
    warehouseCapacity: number;
    warehouseOccupancy: number;
    warehouseOccupancyRate: number;
    totalBins: number;
    availableBins: number;
    occupiedBins: number;
    mispickAttemptsPrevented: number;
    successfulPicks: number;
    pickingAccuracy: number;
  };
  inventoryByCategory: { name: string; skus: number; units: number }[];
  rowStats: { row: string; occupancy: number; capacity: number; occupancyRate: number; binsCount: number }[];
  ordersByStatus: { status: string; count: number; fill: string }[];
  lowStockList: {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    quantity: number;
    minimumStock: number;
    location: string;
    status: 'low_stock' | 'out_of_stock';
  }[];
  recentTransactions: IInventoryTransaction[];
  aiInsights: IWarehouseInsights;
}

export interface IAllocationResult {
  warehouseId: string;
  row: string;
  bin: string;
  binCode: string;
  capacity: number;
  newOccupancy: number;
  reason: string;
  isNewRowCreated: boolean;
}

export interface IDeliveryPartner {
  _id?: string;
  partnerId: string;
  name: string;
  phone: string;
  email?: string;
  agency: string;
  pin: string;
  vehicleNumber: string;
  vehicleType: string;
  city?: string;
  address?: string;
  licenseNumber?: string;
  emergencyContact?: string;
  active: boolean;
  totalPickups: number;
  totalUnitsDelivered: number;
  lastLoginAt?: string;
  pendingPickupsCount?: number;
  completedPickupsCount?: number;
}

export interface IWarehouseLocationInfo {
  warehouseId: string;
  name: string;
  code: string;
  city: string;
  address: string;
  contactPhone: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  operatingHours: string;
  dockBays?: string;
  totalCapacity: number;
  currentOccupancy: number;
  availableVacancy: number;
  vacancyPercentage: number;
  status?: string;
}

export interface IPartnerPickupItem {
  uniqueId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  destination: string;
  priority?: string;
  scheduledDateStr: string;
  pickupTimeSlot: string;
  orderStatus: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  location: {
    warehouseId: string;
    row: string;
    bin: string;
  };
  isPicked: boolean;
  pickedAt?: string;
  scannedBarcode?: string;
  assignedPartnerId?: string;
  assignedPartnerName?: string;
}

export interface IWarehouseInventoryItem {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  quantity: number;
  minimumStock: number;
  unitPrice: number;
  location: {
    warehouseId?: string;
    row: string;
    bin: string;
  };
  stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'HEALTHY';
}

export interface IDeliveryHandoverItem {
  product: string;
  productName: string;
  sku: string;
  barcode: string;
  serialNumbers?: string[];
  quantity: number;
  unitPrice: number;
  location: {
    row: string;
    bin: string;
  };
}

export interface IDeliveryHandover {
  _id: string;
  handoverId: string;
  deliveryBoyName: string;
  deliveryBoyPhone: string;
  partner: string;
  vehicleNumber?: string;
  orderReference?: string;
  destination?: string;
  items: IDeliveryHandoverItem[];
  totalQuantity: number;
  totalValue: number;
  status: 'Out for Delivery' | 'Delivered' | 'Returned' | 'Cancelled';
  notes?: string;
  handedOverBy?: string;
  handedOverAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  returnReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IInboundShipment {
  _id: string;
  shipmentId: string;
  manufacturerName: string;
  manufacturerContact?: string;
  targetWarehouseId: string;
  targetWarehouseName: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  quantity: number;
  dispatchDate: string;
  expectedArrivalDate: string;
  status: 'Scheduled' | 'In Transit' | 'Arrived' | 'Received' | 'Cancelled';
  trackingNumber: string;
  carrierName: string;
  notes?: string;
  assignedBin?: string;
  receivedAt?: string;
  receivedBy?: string;
  createdAt?: string;
}

export interface IWarehouseVacancy {
  warehouseId: string;
  name: string;
  code: string;
  city: string;
  address: string;
  contactPhone: string;
  inboundDockCount: number;
  totalCapacity: number;
  currentOccupancy: number;
  availableVacancy: number;
  vacancyPercentage: number;
  vacancyStatus: 'high' | 'moderate' | 'low';
  pendingInboundUnits: number;
  status: string;
}

export interface IAuthUser {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'manufacturer' | 'warehouse' | 'delivery';
  companyName?: string;
  warehouseId?: string;
  partnerId?: string;
  agency?: string;
  avatar?: string;
}

export interface IDeliveryDateTask {
  taskId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  destination: string;
  warehouseId: string;
  warehouseName: string;
  scheduledDate: string;
  dayCategory: 'today' | 'tomorrow' | 'upcoming' | 'past';
  pickupTimeSlot: string;
  assignedPartnerId: string;
  assignedPartnerName: string;
  items: {
    productName: string;
    sku: string;
    barcode: string;
    quantity: number;
    isPicked: boolean;
    warehouseId: string;
    locationGuide: string;
  }[];
  totalItems: number;
  status: 'Pending' | 'Picking' | 'Picked' | 'Ready for Dispatch' | 'Dispatched';
  priority: 'Standard' | 'High' | 'Express';
}

export interface IManufacturerProduct {
  _id?: string;
  manufacturerId?: string;
  manufacturerName?: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unitsPresent: number;
  unitOfMeasure?: string;
  batchNumber?: string;
  unitPrice?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IManufacturerChatMessage {
  _id?: string;
  conversationId: string;
  sender: 'manufacturer' | 'inventory_bot' | 'inventory_manager';
  senderName: string;
  text: string;
  timestamp: string;
  pickupDetails?: {
    warehouseId?: string;
    warehouseName?: string;
    productName?: string;
    quantity?: number;
    pickupDate?: string;
    pickupTimeSlot?: string;
    dockBay?: string;
    gatePassNumber?: string;
    status?: 'proposed' | 'confirmed' | 'rescheduled';
  };
}


