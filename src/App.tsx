import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar, NavTab } from './components/Sidebar.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ScanPage } from './pages/ScanPage.js';
import { ProductsPage } from './pages/ProductsPage.js';
import { OrdersPage } from './pages/OrdersPage.js';
import { WarehousePage } from './pages/WarehousePage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { DeliveryPage } from './pages/DeliveryPage.js';
import { ManufacturerPage } from './pages/ManufacturerPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { PickOrderModal } from './components/PickOrderModal.js';
import { ManufacturerNotificationBar } from './components/ManufacturerNotificationBar.js';
import { DeliveryPartnerManagement } from './components/warehouse/DeliveryPartnerManagement.js';
import { api } from './services/api.js';
import { IOrder, IAuthUser } from './types.js';
import {
  LayoutDashboard,
  ScanLine,
  PackageSearch,
  ClipboardCheck,
  Grid3X3,
  BarChart3,
  History,
  Settings,
  Truck,
  Factory,
} from 'lucide-react';

export function App() {
  // Authentication & Unified Role Routing
  const [currentUser, setCurrentUser] = useState<IAuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('stockpilot_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => !currentUser);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (currentUser?.role === 'manufacturer') return 'manufacturer';
    if (currentUser?.role === 'delivery') return 'delivery';
    return 'dashboard';
  });

  const [manufacturerSubTab, setManufacturerSubTab] = useState<'overview' | 'dispatch' | 'chat' | 'my-products'>('overview');

  const [activeRole, setActiveRole] = useState<'Operator' | 'Manager'>('Operator');
  const [activePickOrder, setActivePickOrder] = useState<IOrder | null>(null);

  // Badge counters
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const fetchBadgeCounts = async () => {
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        api.getAnalytics(),
        api.getOrders(),
      ]);
      if (analyticsRes.success) {
        setLowStockCount(analyticsRes.summary.lowStockCount);
      }
      if (ordersRes.success) {
        const pending = ordersRes.orders.filter(
          (o) => o.status === 'Pending' || o.status === 'Picking'
        ).length;
        setPendingOrdersCount(pending);
      }
    } catch (err) {
      console.warn('Failed loading badge counts:', err);
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
  }, [currentTab]);

  const handleLoginSuccess = (user: IAuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('stockpilot_auth_user', JSON.stringify(user));
    setIsAuthOpen(false);

    // Differentiate and route directly to appropriate role dashboard
    if (user.role === 'manufacturer') {
      setCurrentTab('manufacturer');
    } else if (user.role === 'delivery') {
      setCurrentTab('delivery');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('stockpilot_auth_user');
    setCurrentUser(null);
    setIsAuthOpen(true);
  };

  const handleSwitchPortal = (targetRole: 'manufacturer' | 'warehouse' | 'delivery') => {
    if (targetRole === 'manufacturer') {
      setCurrentTab('manufacturer');
    } else if (targetRole === 'delivery') {
      setCurrentTab('delivery');
    } else {
      setCurrentTab('dashboard');
    }
  };

  // If user is not authenticated, show the single Login/Signup Portal
  if (isAuthOpen && !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onRefreshAll={fetchBadgeCounts}
        activeRole={activeRole}
        onToggleRole={setActiveRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchPortal={handleSwitchPortal}
        onOpenDeliveryPortal={() => setCurrentTab('delivery')}
        onOpenManufacturerPortal={() => setCurrentTab('manufacturer')}
      />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          manufacturerSubTab={manufacturerSubTab}
          onSelectManufacturerSubTab={(sub) => {
            setCurrentTab('manufacturer');
            setManufacturerSubTab(sub);
          }}
          pendingOrdersCount={pendingOrdersCount}
          lowStockCount={lowStockCount}
          isManufacturerRole={currentUser?.role === 'manufacturer'}
          isDeliveryRole={currentUser?.role === 'delivery'}
        />

        {/* Dynamic Main Content Canvas */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-20 md:pb-6">
          <div className="mx-auto max-w-7xl space-y-4">
            {/* Manufacturer Portal (Warehouse product lists, vacancy metrics, dispatch stock) */}
            {currentTab === 'manufacturer' && (
              <ManufacturerPage
                currentUser={currentUser}
                activeSubTab={manufacturerSubTab}
                onTabChange={setManufacturerSubTab}
              />
            )}

            {/* Warehouse Portal: Persistent Notification Bar from Manufacturer for easy conversation & pickup sync (hidden in delivery & manufacturer portals) */}
            {currentTab !== 'manufacturer' && currentTab !== 'delivery' && (
              <ManufacturerNotificationBar
                currentUser={currentUser}
                onNavigateToWarehouseMap={() => setCurrentTab('warehouse')}
              />
            )}

            {/* Delivery Partner Portal (Datewise task bar, pickup bays, destinations) */}
            {currentTab === 'delivery' && (
              <DeliveryPage
                currentUser={currentUser}
                onLogout={handleLogout}
                onSwitchPortal={handleSwitchPortal}
              />
            )}

            {/* Warehouse Operations & Management */}
            {currentTab === 'dashboard' && (
              <DashboardPage
                onNavigate={setCurrentTab}
                onOpenPickOrder={(orderId) => {
                  api.getOrder(orderId).then((res) => {
                    if (res.success && res.order) setActivePickOrder(res.order);
                  });
                }}
              />
            )}

            {currentTab === 'scan' && <ScanPage />}

            {/* Inventory & Product Catalog with Incoming Stock Calendar link */}
            {currentTab === 'products' && (
              <ProductsPage
                onNavigateToScan={() => setCurrentTab('scan')}
                onNavigateToWarehouse={() => setCurrentTab('warehouse')}
              />
            )}

            {currentTab === 'orders' && <OrdersPage />}

            {currentTab === 'delivery-management' && <DeliveryPartnerManagement />}

            {currentTab === 'warehouse' && (
              <WarehousePage onNavigateToScan={() => setCurrentTab('scan')} />
            )}

            {currentTab === 'analytics' && <AnalyticsPage />}

            {currentTab === 'activity' && <ActivityPage />}

            {currentTab === 'settings' && (
              <SettingsPage onRefreshAll={fetchBadgeCounts} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden for Delivery Partner to remove warehouse operations controls) */}
      {currentUser?.role !== 'delivery' && currentTab !== 'delivery' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-13 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md md:hidden shadow-xs">
          {[
            {
              id: 'manufacturer' as NavTab,
              label: 'Factory',
              icon: <Factory className="h-5 w-5" />,
            },
            {
              id: 'dashboard' as NavTab,
              label: 'Home',
              icon: <LayoutDashboard className="h-5 w-5" />,
            },
            {
              id: 'delivery' as NavTab,
              label: 'Delivery',
              icon: <Truck className="h-5 w-5" />,
            },
            {
              id: 'products' as NavTab,
              label: 'Stock',
              icon: <PackageSearch className="h-5 w-5" />,
            },
            {
              id: 'orders' as NavTab,
              label: 'Orders',
              icon: <ClipboardCheck className="h-5 w-5" />,
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                currentTab === item.id
                  ? 'text-emerald-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Pick Order Modal (accessible application-wide) */}
      {activePickOrder && (
        <PickOrderModal
          order={activePickOrder}
          isOpen={!!activePickOrder}
          onClose={() => setActivePickOrder(null)}
          onOrderUpdated={fetchBadgeCounts}
        />
      )}
    </div>
  );
}

export default App;
