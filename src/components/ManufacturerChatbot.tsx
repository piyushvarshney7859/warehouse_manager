import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Calendar,
  Clock,
  Warehouse,
  Truck,
  CheckCircle2,
  Sparkles,
  Ticket,
  ChevronRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api.js';
import { IManufacturerChatMessage, IWarehouseVacancy, IManufacturerProduct } from '../types.js';

interface ManufacturerChatbotProps {
  warehouses: IWarehouseVacancy[];
  products: IManufacturerProduct[];
  onShipmentScheduled?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const ManufacturerChatbot: React.FC<ManufacturerChatbotProps> = ({
  warehouses,
  products,
  onShipmentScheduled,
  className = '',
  isCompact = false,
}) => {
  const [messages, setMessages] = useState<IManufacturerChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showBookingPanel, setShowBookingPanel] = useState(false);

  // Booking Form Fields
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    warehouses[0]?.warehouseId || 'WH-01'
  );
  const [selectedProductSku, setSelectedProductSku] = useState(products[0]?.sku || '');
  const [pickupQuantity, setPickupQuantity] = useState(50);
  const [pickupDate, setPickupDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [pickupTimeSlot, setPickupTimeSlot] = useState('10:00 AM - 12:30 PM');
  const [truckNumber, setTruckNumber] = useState('KA-01-EQ-4921');
  const [bookingNotes, setBookingNotes] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await api.getManufacturerChatMessages();
      if (res.success) {
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || sending) return;

    setInputText('');
    setSending(true);

    // Optimistic user message
    const tempUserMsg: IManufacturerChatMessage = {
      conversationId: 'mfg-inv-desk',
      sender: 'manufacturer',
      senderName: 'Apex Industrial (Manufacturer)',
      text: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.sendManufacturerChatMessage({
        text: message,
        senderName: 'Apex Industrial (Manufacturer)',
      });

      if (res.success) {
        setMessages((prev) => {
          // Replace or append with server response
          const withoutTemp = prev.slice(0, prev.length - 1);
          return [...withoutTemp, res.userMessage, res.botReply];
        });
      }
    } catch (err: any) {
      console.error('Chat error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSending(true);
      const chosenProduct = products.find((p) => p.sku === selectedProductSku);
      const chosenWarehouse = warehouses.find((w) => w.warehouseId === selectedWarehouseId);

      const res = await api.bookManufacturerPickupSlot({
        warehouseId: selectedWarehouseId,
        productName: chosenProduct?.name || 'Factory Production Pallets',
        quantity: pickupQuantity,
        pickupDate,
        pickupTimeSlot,
        truckNumber,
        notes: bookingNotes,
      });

      if (res.success) {
        setShowBookingPanel(false);
        setBookingNotes('');
        setMessages((prev) => [...prev, res.booking]);
        if (onShipmentScheduled) onShipmentScheduled();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to book slot');
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    { label: 'Request Pickup Slot for Tomorrow', text: 'Please schedule an inbound pickup slot for tomorrow morning.' },
    { label: 'Check Warehouse Vacancies', text: 'What is the current available vacancy and bay capacity across warehouses?' },
    { label: 'Confirm 10:00 AM Dock Arrival', text: 'Can we book the 10:00 AM - 12:30 PM slot at WH-01 Central for 120 units?' },
    { label: 'Generate Gate Pass for Vehicle', text: 'We have truck KA-01-EQ-4921 arriving. Please issue gate pass and dock bay.' },
  ];

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-300 bg-white shadow-md overflow-hidden ${
        isCompact ? 'h-[500px]' : 'h-[680px]'
      } ${className}`}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
              <Bot className="h-5 w-5" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-950">StockPilot Inventory Coordination Desk</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900 border border-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-[11px] text-slate-800 font-semibold">
              Direct liaison for pickup dates, time slots, warehouse dock vacancy & gate passes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBookingPanel(!showBookingPanel)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all shadow-xs ${
              showBookingPanel
                ? 'bg-slate-900 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {showBookingPanel ? 'View Chat' : 'Book Pickup Slot'}
          </button>

          <button
            type="button"
            onClick={fetchMessages}
            disabled={loading}
            title="Refresh Conversation"
            className="rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Area: Chat Messages OR Booking Form Drawer */}
      {showBookingPanel ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-sm font-black text-slate-950 flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-700" />
              Schedule Inbound Pickup & Dock Appointment
            </h4>
            <p className="text-xs text-slate-800 font-semibold mt-0.5">
              Submit your preferred date and time to immediately reserve an unloading dock bay and receive a verified gate pass.
            </p>
          </div>

          <form onSubmit={handleBookSlot} className="space-y-3.5 max-w-xl">
            {/* Warehouse */}
            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                Destination Warehouse Hub
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
              >
                {warehouses.map((wh) => (
                  <option key={wh.warehouseId} value={wh.warehouseId}>
                    {wh.code} - {wh.name} ({wh.availableVacancy} units available space)
                  </option>
                ))}
              </select>
            </div>

            {/* Product */}
            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                Select Manufactured Product for Pickup
              </label>
              <select
                value={selectedProductSku}
                onChange={(e) => setSelectedProductSku(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
              >
                {products.length === 0 ? (
                  <option value="">No products listed yet</option>
                ) : (
                  products.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} (SKU: {p.sku}) — {p.unitsPresent} units present at factory
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Quantity & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-950 block mb-1">
                  Quantity for Pickup (Units)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={pickupQuantity}
                  onChange={(e) => setPickupQuantity(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-black focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-950 block mb-1">
                  Scheduled Pickup / Arrival Date
                </label>
                <input
                  type="date"
                  required
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Time Slot & Truck Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-950 block mb-1">
                  Preferred Time Window
                </label>
                <select
                  value={pickupTimeSlot}
                  onChange={(e) => setPickupTimeSlot(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold focus:border-amber-600 focus:outline-hidden"
                >
                  <option value="09:00 AM - 11:30 AM">Morning: 09:00 AM - 11:30 AM (Inbound Bay 1/2)</option>
                  <option value="11:30 AM - 02:00 PM">Midday: 11:30 AM - 02:00 PM (Inbound Bay 2)</option>
                  <option value="02:30 PM - 05:00 PM">Afternoon: 02:30 PM - 05:00 PM (Inbound Bay 1/3)</option>
                  <option value="06:00 PM - 09:00 PM">Evening Cargo: 06:00 PM - 09:00 PM</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-950 block mb-1">
                  Transport Vehicle / Truck No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-12-AB-9821"
                  value={truckNumber}
                  onChange={(e) => setTruckNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-mono font-bold focus:border-amber-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-black text-slate-950 block mb-1">
                Special Handling / Pallet Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Forklift required, shrink-wrapped 4 pallets"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 font-bold placeholder:text-slate-500 focus:border-amber-600 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBookingPanel(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-slate-100"
              >
                Back to Conversation
              </button>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-black text-white transition-all shadow-md"
              >
                {sending ? 'Reserving Bay...' : 'Confirm & Generate Gate Pass'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-100/70">
          {messages.map((msg, idx) => {
            const isMe = msg.sender === 'manufacturer';
            const hasPickup = Boolean(msg.pickupDetails);

            return (
              <div
                key={msg._id || idx}
                className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-2 shadow-xs ${
                    isMe
                      ? 'bg-amber-600 text-white rounded-tr-xs'
                      : 'bg-white text-slate-950 border border-slate-300 rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] opacity-90">
                    <span className="font-black">{msg.senderName}</span>
                    <span className="font-semibold">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs whitespace-pre-wrap leading-relaxed font-semibold">{msg.text}</p>

                  {/* Confirmed Pickup / Dock Bay Card */}
                  {hasPickup && msg.pickupDetails && (
                    <div
                      className={`rounded-xl p-3 text-xs space-y-2 border ${
                        isMe
                          ? 'bg-amber-700 text-white border-amber-500'
                          : 'bg-amber-50 border-amber-300 text-slate-950'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-300/60 pb-1.5">
                        <div className="flex items-center gap-1.5 font-black text-amber-950">
                          <Ticket className="h-3.5 w-3.5" />
                          <span>Official Inbound Dock Pass</span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-black text-emerald-950">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Confirmed Slot
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-800 font-bold block text-[10px]">Date:</span>
                          <span className="font-black text-slate-950">
                            {msg.pickupDetails.pickupDate
                              ? new Date(msg.pickupDetails.pickupDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Scheduled'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-800 font-bold block text-[10px]">Time Slot:</span>
                          <span className="font-black text-amber-950">
                            {msg.pickupDetails.pickupTimeSlot || '10:00 AM - 12:30 PM'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-800 font-bold block text-[10px]">Warehouse Bay:</span>
                          <span className="font-black text-slate-950">
                            {msg.pickupDetails.warehouseId} • {msg.pickupDetails.dockBay || 'Dock 2'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-800 font-bold block text-[10px]">Gate Pass Code:</span>
                          <span className="font-mono font-black text-emerald-950">
                            {msg.pickupDetails.gatePassNumber || 'GP-2026-INB'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isMe && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {sending && (
            <div className="flex gap-2.5 items-center text-xs text-slate-950 font-bold animate-pulse">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                <Bot className="h-4 w-4" />
              </div>
              <span className="bg-white border border-slate-300 rounded-xl px-3 py-2 shadow-xs">
                Inventory Desk is checking dock vacancies & scheduling...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Quick Prompts Bar */}
      {!showBookingPanel && (
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
          <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-600" /> Suggestions:
          </span>
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(qp.text)}
              disabled={sending}
              className="shrink-0 text-[11px] font-bold rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-950 px-2.5 py-1 transition-all shadow-xs"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      {!showBookingPanel && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="border-t border-slate-200 bg-white p-3 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Type your message (e.g., 'Request pickup slot for tomorrow 10 AM at WH-01')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-950 font-bold placeholder:text-slate-500 focus:border-amber-600 focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-500 p-2.5 text-white disabled:opacity-40 transition-all shadow-md"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
};
