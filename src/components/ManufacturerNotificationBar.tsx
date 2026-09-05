import React, { useState, useEffect, useRef } from 'react';
import {
  Factory,
  MessageSquare,
  Send,
  Calendar,
  Clock,
  Truck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Bell,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.js';
import { IManufacturerChatMessage, IAuthUser } from '../types.js';

interface ManufacturerNotificationBarProps {
  currentUser?: IAuthUser | null;
  onNavigateToWarehouseMap?: () => void;
}

export const ManufacturerNotificationBar: React.FC<ManufacturerNotificationBarProps> = ({
  currentUser,
  onNavigateToWarehouseMap,
}) => {
  const [latestMessage, setLatestMessage] = useState<IManufacturerChatMessage | null>(null);
  const [allMessages, setAllMessages] = useState<IManufacturerChatMessage[]>([]);
  const [incomingShipments, setIncomingShipments] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBarCollapsed, setIsBarCollapsed] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showShipmentsDropdown, setShowShipmentsDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getWarehouseManufacturerNotifications();
      if (res.success) {
        if (res.latestMessage) setLatestMessage(res.latestMessage);
        if (res.recentMessages) setAllMessages(res.recentMessages);
        if (res.incomingShipments) setIncomingShipments(res.incomingShipments);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed loading manufacturer notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 12 seconds for real-time manufacturer conversation updates
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      // Scroll to bottom when chat opens or updates
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isChatOpen, allMessages]);

  const handleSendReply = async (textToSend?: string) => {
    const content = (textToSend || replyText).trim();
    if (!content) return;

    setIsSending(true);
    try {
      const senderName = currentUser?.name
        ? `${currentUser.name} (Warehouse Desk)`
        : 'Warehouse Desk Coordinator';

      const res = await api.sendManufacturerChatMessage({
        conversationId: 'mfg-inv-desk',
        text: content,
        senderName,
        sender: 'inventory_manager',
      });

      if (res.success) {
        setReplyText('');
        // Refresh notification messages
        await fetchNotifications();
      }
    } catch (err: any) {
      alert('Failed to send reply: ' + (err.message || 'Network error'));
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (dateStr: any) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getPreviewText = () => {
    if (!latestMessage) {
      return 'Connected to Manufacturer Coordination Desk. Ready for incoming dispatch & pickup scheduling.';
    }
    if (latestMessage.pickupDetails) {
      const p = latestMessage.pickupDetails;
      return `Pickup Request for ${p.warehouseId || 'WH-01'}: ${p.pickupDate || 'Tomorrow'} (${p.pickupTimeSlot || 'Morning'}) - Gate Pass: ${p.gatePassNumber || 'Pending'}`;
    }
    return latestMessage.text;
  };

  return (
    <>
      {/* ========================================================= */}
      {/* PERSISTENT NOTIFICATION BAR AT TOP OF WAREHOUSE PORTAL     */}
      {/* ========================================================= */}
      <div className="mb-4 overflow-hidden rounded-xl border border-purple-200 bg-linear-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5">
          {/* Left section: Icon, Manufacturer Identity & Live Ticker */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-200 border border-purple-400/30">
              <Factory className="h-4 w-4 text-purple-300" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
                  Manufacturer Dispatch & Pickup Desk
                </span>
                <span className="rounded bg-purple-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-purple-200 border border-purple-400/30">
                  Apex Industrial
                </span>
                {latestMessage?.timestamp && (
                  <span className="text-[10px] text-slate-400">
                    {formatTimestamp(latestMessage.timestamp)}
                  </span>
                )}
              </div>

              {/* Ticker / Latest Message */}
              <div className="truncate text-xs text-slate-200 font-medium mt-0.5 max-w-2xl">
                {getPreviewText()}
              </div>
            </div>
          </div>

          {/* Right section: Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Incoming dispatches dropdown button */}
            {incomingShipments.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowShipmentsDropdown(!showShipmentsDropdown)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-xs font-semibold text-purple-100 border border-purple-400/30 transition-colors cursor-pointer"
                >
                  <Truck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{incomingShipments.length} Dispatches</span>
                  <ChevronDown className="h-3 w-3 text-purple-300" />
                </button>

                {/* Dropdown Menu */}
                {showShipmentsDropdown && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-slate-700 bg-slate-900 p-2.5 shadow-2xl z-50 text-xs text-slate-200 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 font-bold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-emerald-400" />
                        Manufacturer Shipments In Transit
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowShipmentsDropdown(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {incomingShipments.map((s) => (
                        <div
                          key={s._id || s.shipmentId}
                          className="rounded-lg border border-slate-800 bg-slate-800/60 p-2 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-bold text-white">
                            <span>{s.productName}</span>
                            <span className="text-emerald-400 font-mono">+{s.quantity} units</span>
                          </div>
                          <div className="text-slate-400 text-[10px] mt-0.5 flex items-center justify-between">
                            <span>SKU: {s.sku} • {s.targetWarehouseName || s.targetWarehouseId}</span>
                            <span className="rounded bg-emerald-950 px-1 py-0.5 text-emerald-300 border border-emerald-800">
                              {s.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick 1-click Reply & Open Chat */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 px-3 py-1.5 text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Reply to Manufacturer</span>
              {unreadCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 text-[9px] font-extrabold text-purple-200">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick inline response pills bar */}
        <div className="flex items-center gap-2 border-t border-purple-500/20 bg-black/25 px-3 sm:px-4 py-1.5 text-[11px] overflow-x-auto">
          <span className="text-purple-300 font-medium shrink-0">Quick Response:</span>
          {[
            'Dock Bay 1 Ready for Inbound Unloading',
            'Pickup Slot Confirmed for Tomorrow 10:00 AM',
            'Gate Pass Verified • Proceed to Bay 2',
            'Capacity Available • 150 Pallet Slots Free',
          ].map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => handleSendReply(quick)}
              disabled={isSending}
              className="rounded-full bg-purple-500/15 hover:bg-purple-500/30 text-purple-100 border border-purple-400/25 px-2.5 py-0.5 shrink-0 transition-colors cursor-pointer text-[10px] disabled:opacity-50"
            >
              + {quick}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* INTERACTIVE COORDINATION CHAT MODAL                       */}
      {/* ========================================================= */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="flex h-[88vh] max-h-[720px] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-linear-to-r from-purple-950 via-slate-900 to-indigo-950 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-xs">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-sm sm:text-base text-white">
                      Manufacturer & Inventory Coordination Desk
                    </h2>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      Live Sync
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Direct communication channel between Apex Industrial and Warehouse Dock Supervisors.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchNotifications}
                  title="Refresh messages"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Inbound Booking Quick Ribbon */}
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs flex items-center justify-between gap-2 overflow-x-auto">
              <span className="font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-600" />
                Warehouse Bays:
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="rounded bg-white px-2 py-0.5 font-medium text-slate-600 border border-slate-200">
                  Bay 1: Available
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-medium text-slate-600 border border-slate-200">
                  Bay 2: Active (Receiving)
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-medium text-slate-600 border border-slate-200">
                  Bay 3: Scheduled
                </span>
              </div>
            </div>

            {/* Message Thread History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
              {allMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs text-center">
                  <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
                  <p>No messages exchanged yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Type a message below to coordinate pickup slots or dock readiness.
                  </p>
                </div>
              ) : (
                allMessages.map((msg, idx) => {
                  const isWarehouse = msg.sender === 'inventory_manager';
                  const isBot = msg.sender === 'inventory_bot';
                  const isMfg = msg.sender === 'manufacturer';

                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${isWarehouse ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
                        <span className="font-semibold text-slate-600">
                          {msg.senderName || (isWarehouse ? 'Warehouse Desk' : isMfg ? 'Apex Industrial' : 'System Bot')}
                        </span>
                        <span>•</span>
                        <span>{formatTimestamp(msg.timestamp)}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                          isWarehouse
                            ? 'bg-purple-600 text-white rounded-tr-none'
                            : isBot
                            ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            : 'bg-indigo-900 text-white rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                        {/* If message includes pickup details card */}
                        {msg.pickupDetails && (
                          <div className="mt-2.5 rounded-xl border border-white/20 bg-black/15 p-2.5 text-[11px] space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                Inbound Slot Details
                              </span>
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300 uppercase">
                                {msg.pickupDetails.status || 'Confirmed'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[10px] opacity-90 pt-1">
                              <div>Warehouse: <strong>{msg.pickupDetails.warehouseName || msg.pickupDetails.warehouseId}</strong></div>
                              <div>Dock Bay: <strong>{msg.pickupDetails.dockBay || 'Bay 2'}</strong></div>
                              <div>Date: <strong>{msg.pickupDetails.pickupDate}</strong></div>
                              <div>Time Slot: <strong>{msg.pickupDetails.pickupTimeSlot}</strong></div>
                              {msg.pickupDetails.gatePassNumber && (
                                <div className="col-span-2 text-emerald-300 font-mono font-bold">
                                  Gate Pass: {msg.pickupDetails.gatePassNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions for Warehouse */}
            <div className="border-t border-slate-100 bg-white px-4 py-2 text-[11px] flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-400 font-semibold shrink-0">Quick Reply:</span>
              {[
                'Dock Bay 1 Cleared',
                'Dock Bay 2 Ready for Unload',
                'Gate Pass Verified',
                'Please dispatch driver now',
              ].map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => handleSendReply(pill)}
                  disabled={isSending}
                  className="rounded-full bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 border border-slate-200 px-2.5 py-0.5 shrink-0 transition-colors text-[10px] font-medium"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendReply();
              }}
              className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type reply or dock instructions for the manufacturer..."
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
