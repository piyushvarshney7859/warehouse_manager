import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Package,
  CheckCircle2,
  AlertCircle,
  Truck,
  Compass,
  Footprints,
  Eye,
  Sparkles,
  Info,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { IPartnerPickupItem, IWarehouseLocationInfo } from '../../types.js';

interface InsideWarehousePickupMapProps {
  warehouse: IWarehouseLocationInfo | null;
  pickups: IPartnerPickupItem[];
  selectedItem?: IPartnerPickupItem | null;
  onSelectItem?: (item: IPartnerPickupItem | null) => void;
  onQuickVerifyBarcode?: (barcode: string, orderId?: string) => void;
}

interface IFloorBin {
  id: string; // e.g. A01
  row: string; // Row A, Row B, Row C
  binNum: string; // 01, 02...
  x: number;
  y: number;
  width: number;
  height: number;
  category: string;
}

export const InsideWarehousePickupMap: React.FC<InsideWarehousePickupMapProps> = ({
  warehouse,
  pickups,
  selectedItem,
  onSelectItem,
  onQuickVerifyBarcode,
}) => {
  const [activeFilterSku, setActiveFilterSku] = useState<string>('all');
  const [hoveredBin, setHoveredBin] = useState<IFloorBin | null>(null);
  const [showPathway, setShowPathway] = useState(true);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  // Normalize bin strings like "A01", "A-01", "A1" into standard "A01"
  const normalizeBinCode = (binStr?: string): string => {
    if (!binStr) return '';
    const clean = binStr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length === 2 && /^[A-Z][0-9]$/.test(clean)) {
      return `${clean[0]}0${clean[1]}`;
    }
    return clean;
  };

  // Predefined grid of Bins across 3 Rows (A, B, C) with 6 bins each
  const floorBins: IFloorBin[] = useMemo(() => {
    const bins: IFloorBin[] = [];
    const rows = [
      { row: 'Row A', letter: 'A', y: 110, category: 'Electronics & Gadgets' },
      { row: 'Row B', letter: 'B', y: 220, category: 'Apparel & Home Goods' },
      { row: 'Row C', letter: 'C', y: 330, category: 'Hardware & Heavy Items' },
    ];

    rows.forEach((r) => {
      for (let i = 1; i <= 6; i++) {
        const binNum = i < 10 ? `0${i}` : `${i}`;
        const binCode = `${r.letter}${binNum}`;
        const x = 180 + (i - 1) * 95; // evenly spaced bins along the aisle
        bins.push({
          id: binCode,
          row: r.row,
          binNum,
          x,
          y: r.y,
          width: 76,
          height: 52,
          category: r.category,
        });
      }
    });

    return bins;
  }, []);

  // Map products to specific bins
  const binProductsMap = useMemo(() => {
    const map = new Map<string, IPartnerPickupItem[]>();

    pickups.forEach((p) => {
      const code = normalizeBinCode(p.location.bin);
      // Fallback matching if bin code matches row or letter
      const matchedBin = floorBins.find(
        (b) => b.id === code || b.id.includes(code) || code.includes(b.id)
      );
      const targetBinId = matchedBin ? matchedBin.id : 'A01';

      const existing = map.get(targetBinId) || [];
      existing.push(p);
      map.set(targetBinId, existing);
    });

    return map;
  }, [pickups, floorBins]);

  // Unique bins that currently contain assigned products
  const activePickupBins = useMemo(() => {
    return floorBins.filter((b) => (binProductsMap.get(b.id)?.length || 0) > 0);
  }, [floorBins, binProductsMap]);

  // Filtered pickups if a filter chip is clicked
  const activePickupsList = useMemo(() => {
    if (activeFilterSku === 'all') return pickups;
    return pickups.filter((p) => p.sku === activeFilterSku || p.productId === activeFilterSku);
  }, [pickups, activeFilterSku]);

  // Optimal sequential walking path steps
  const pickupSteps = useMemo(() => {
    const steps: {
      stepNum: number;
      title: string;
      description: string;
      binId?: string;
      items?: IPartnerPickupItem[];
      type: 'gate' | 'dock' | 'pickup' | 'staging';
    }[] = [
      {
        stepNum: 1,
        title: 'Commercial Gate 3 Check-In',
        description: 'Verify digital gate pass at security barrier; proceed to freight terminal.',
        type: 'gate',
      },
      {
        stepNum: 2,
        title: 'Dock at Loading Bay 3',
        description: 'Reverse vehicle into designated Bay 3 (Direct access to Outbound Staging).',
        type: 'dock',
      },
    ];

    let currentStepNum = 3;
    // Add distinct pickup stops in optimal warehouse order
    activePickupBins.forEach((bin) => {
      const items = binProductsMap.get(bin.id) || [];
      if (items.length > 0) {
        steps.push({
          stepNum: currentStepNum++,
          title: `Retrieve from ${bin.row}, Bin ${bin.id}`,
          description: items
            .map((item) => `${item.quantity}x ${item.productName} (${item.sku})`)
            .join(' • '),
          binId: bin.id,
          items,
          type: 'pickup',
        });
      }
    });

    steps.push({
      stepNum: currentStepNum,
      title: 'Outbound Staging Desk (Handover & Scan)',
      description: 'Present items to warehouse outbound officer; scan barcodes to confirm pickup.',
      type: 'staging',
    });

    return steps;
  }, [activePickupBins, binProductsMap]);

  // Compute SVG polyline points for the optimal walking path
  const pathwayPoints = useMemo(() => {
    // Start at Gate 3 -> Dock Bay 3 -> Outbound Staging -> Waypoint bins -> Back to Outbound Desk
    const points: [number, number][] = [
      [90, 480], // Gate 3
      [140, 450], // Driveway
      [220, 450], // Dock Bay 3
      [220, 410], // Dock doorway
      [360, 410], // Staging area
    ];

    // Visit each active bin in sequence
    activePickupBins.forEach((bin) => {
      const centerX = bin.x + bin.width / 2;
      const centerY = bin.y + bin.height / 2;
      points.push([centerX, centerY]);
    });

    // Return to Staging Desk
    points.push([420, 410]);

    return points.map((pt) => `${pt[0]},${pt[1]}`).join(' ');
  }, [activePickupBins]);

  return (
    <div className="space-y-4">
      {/* Top Controls & Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Footprints className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                Inside Warehouse Pickup Wayfinding
              </h3>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Live Bay 3 Route
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Interactive indoor floorplan relating your assigned products directly to warehouse aisles & bins.
            </p>
          </div>
        </div>

        {/* View Toggle & Pathway Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPathway(!showPathway)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              showPathway
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>{showPathway ? 'Walking Path: ON' : 'Walking Path: OFF'}</span>
          </button>
        </div>
      </div>

      {/* Product Filter Chips for Instant Spotlighting on Floorplan */}
      {pickups.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-blue-600" />
              Spotlight Product Inside Warehouse
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              {pickups.length} products to pick up
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveFilterSku('all');
                onSelectItem?.(null);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeFilterSku === 'all' && !selectedItem
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Items ({pickups.length})
            </button>

            {pickups.map((item) => {
              const isSelected =
                selectedItem?.uniqueId === item.uniqueId || activeFilterSku === item.sku;
              return (
                <button
                  key={item.uniqueId}
                  type="button"
                  onClick={() => {
                    setActiveFilterSku(item.sku);
                    onSelectItem?.(item);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="truncate max-w-[140px] sm:max-w-xs">{item.productName}</span>
                  <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-black/10">
                    {item.location.row} • {item.location.bin}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* INTERACTIVE FLOORPLAN SVG MAP */}
      <div className="relative rounded-2xl border border-slate-300 bg-slate-950 p-2 sm:p-4 overflow-hidden shadow-inner">
        {/* Subtle Architectural Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-25 pointer-events-none" />

        {/* Legend Overlay at Top Right */}
        <div className="absolute top-4 right-4 z-10 hidden sm:flex flex-col gap-1.5 bg-slate-900/90 border border-slate-700 backdrop-blur-md p-2.5 rounded-xl text-[11px] text-slate-200 shadow-lg">
          <div className="font-bold text-white text-[10px] uppercase tracking-wider mb-0.5">
            Indoor Map Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-emerald-500 ring-2 ring-emerald-300/40" />
            <span>Assigned Pickup Bin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-blue-600 ring-2 ring-blue-400/40" />
            <span>Assigned Dock Bay 3</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-amber-500" />
            <span>Outbound Staging Desk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-emerald-400" />
            <span>Optimal Pickup Route</span>
          </div>
        </div>

        {/* SVG Warehouse Canvas */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 820 510"
            className="w-full min-w-[650px] max-h-[500px] select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Pulsing Glow Filters for Pickup Bins */}
              <filter id="glow-pickup" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Striped safety hatch pattern for pedestrian walkway */}
              <pattern id="safety-stripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="12" fill="#334155" opacity="0.4" />
                <rect x="6" width="6" height="12" fill="#1e293b" opacity="0.4" />
              </pattern>
            </defs>

            {/* WAREHOUSE BOUNDARY & PERIMETER */}
            <rect
              x="20"
              y="20"
              width="780"
              height="470"
              rx="16"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="3"
            />

            {/* PERIMETER LABELS */}
            <text x="40" y="50" fill="#94a3b8" fontSize="13" fontWeight="bold" letterSpacing="1">
              WAREHOUSE FLOORPLAN • {warehouse?.name || 'StockPilot Central Logistics Hub'}
            </text>
            <text x="40" y="68" fill="#64748b" fontSize="10">
              Commercial Dock Gate 3 Entrance • Internal Aisle Wayfinding & Bin Mapping
            </text>

            {/* MAIN PEDESTRIAN & FORKLIFT CENTRAL CROSS-AISLE */}
            <rect
              x="70"
              y="180"
              width="680"
              height="24"
              rx="4"
              fill="url(#safety-stripes)"
              stroke="#475569"
              strokeWidth="1"
            />
            <text x="410" y="196" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
              CENTRAL FORKLIFT & CART PASSAGE
            </text>

            <rect
              x="70"
              y="290"
              width="680"
              height="24"
              rx="4"
              fill="url(#safety-stripes)"
              stroke="#475569"
              strokeWidth="1"
            />
            <text x="410" y="306" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
              SECONDARY SPEED LANE • AISLE CROSS-WALK
            </text>

            {/* ROW LABELS ON THE LEFT */}
            {/* ROW A */}
            <g transform="translate(60, 110)">
              <rect x="0" y="0" width="85" height="52" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="42" y="24" fill="#38bdf8" fontSize="11" fontWeight="900" textAnchor="middle">ROW A</text>
              <text x="42" y="38" fill="#94a3b8" fontSize="8" textAnchor="middle">Electronics</text>
            </g>

            {/* ROW B */}
            <g transform="translate(60, 220)">
              <rect x="0" y="0" width="85" height="52" rx="8" fill="#1e293b" stroke="#a855f7" strokeWidth="1.5" />
              <text x="42" y="24" fill="#a855f7" fontSize="11" fontWeight="900" textAnchor="middle">ROW B</text>
              <text x="42" y="38" fill="#94a3b8" fontSize="8" textAnchor="middle">Apparel</text>
            </g>

            {/* ROW C */}
            <g transform="translate(60, 330)">
              <rect x="0" y="0" width="85" height="52" rx="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="42" y="24" fill="#f59e0b" fontSize="11" fontWeight="900" textAnchor="middle">ROW C</text>
              <text x="42" y="38" fill="#94a3b8" fontSize="8" textAnchor="middle">Home/Goods</text>
            </g>

            {/* BINS GRID */}
            {floorBins.map((bin) => {
              const itemsInBin = binProductsMap.get(bin.id) || [];
              const isAssigned = itemsInBin.length > 0;
              const isSelected =
                selectedItem &&
                normalizeBinCode(selectedItem.location.bin) === bin.id;
              const isHovered = hoveredBin?.id === bin.id;

              return (
                <g
                  key={bin.id}
                  onClick={() => {
                    if (itemsInBin.length > 0) {
                      onSelectItem?.(itemsInBin[0]);
                    }
                  }}
                  onMouseEnter={() => setHoveredBin(bin)}
                  onMouseLeave={() => setHoveredBin(null)}
                  className="cursor-pointer transition-all duration-300"
                >
                  {/* Bin Rack Background */}
                  <rect
                    x={bin.x}
                    y={bin.y}
                    width={bin.width}
                    height={bin.height}
                    rx="8"
                    fill={
                      isSelected
                        ? '#059669'
                        : isAssigned
                        ? '#064e3b'
                        : isHovered
                        ? '#334155'
                        : '#1e293b'
                    }
                    stroke={
                      isSelected
                        ? '#34d399'
                        : isAssigned
                        ? '#10b981'
                        : isHovered
                        ? '#64748b'
                        : '#334155'
                    }
                    strokeWidth={isSelected ? '3' : isAssigned ? '2' : '1'}
                    filter={isAssigned ? 'url(#glow-pickup)' : undefined}
                  />

                  {/* Bin Identifier Code */}
                  <text
                    x={bin.x + bin.width / 2}
                    y={bin.y + (isAssigned ? 20 : 28)}
                    fill={isSelected ? '#ffffff' : isAssigned ? '#6ee7b7' : '#94a3b8'}
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                  >
                    {bin.id}
                  </text>

                  {/* Assigned Products Indicator Badge */}
                  {isAssigned && (
                    <>
                      <circle
                        cx={bin.x + bin.width - 10}
                        cy={bin.y + 10}
                        r="5"
                        fill="#10b981"
                        className="animate-pulse"
                      />
                      <text
                        x={bin.x + bin.width / 2}
                        y={bin.y + 36}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {itemsInBin.reduce((acc, i) => acc + i.quantity, 0)} units
                      </text>
                      <text
                        x={bin.x + bin.width / 2}
                        y={bin.y + 46}
                        fill="#34d399"
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        PICKUP READY
                      </text>
                    </>
                  )}

                  {!isAssigned && (
                    <text
                      x={bin.x + bin.width / 2}
                      y={bin.y + 42}
                      fill="#475569"
                      fontSize="8"
                      textAnchor="middle"
                    >
                      Stock Bin
                    </text>
                  )}
                </g>
              );
            })}

            {/* DOCK & STAGING ZONE (LOWER WAREHOUSE AREA) */}
            {/* Gate 3 Entry Checkpoint */}
            <g transform="translate(60, 430)">
              <rect x="0" y="0" width="70" height="50" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <text x="35" y="22" fill="#38bdf8" fontSize="10" fontWeight="900" textAnchor="middle">GATE 3</text>
              <text x="35" y="36" fill="#94a3b8" fontSize="8" textAnchor="middle">Vehicle Entry</text>
            </g>

            {/* DOCK BAYS 1 TO 5 */}
            {/* Dock 1 */}
            <g transform="translate(145, 430)">
              <rect x="0" y="0" width="60" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1" />
              <text x="30" y="28" fill="#64748b" fontSize="10" textAnchor="middle">Bay 1</text>
            </g>

            {/* Dock 2 */}
            <g transform="translate(215, 430)">
              <rect x="0" y="0" width="60" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1" />
              <text x="30" y="28" fill="#64748b" fontSize="10" textAnchor="middle">Bay 2</text>
            </g>

            {/* Dock 3 (YOUR ASSIGNED DOCK BAY) */}
            <g transform="translate(285, 420)">
              <rect
                x="0"
                y="0"
                width="80"
                height="60"
                rx="10"
                fill="#1e3a8a"
                stroke="#60a5fa"
                strokeWidth="2.5"
                filter="url(#glow-pickup)"
              />
              <circle cx="70" cy="12" r="5" fill="#3b82f6" className="animate-ping" />
              <text x="40" y="24" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle">BAY 3</text>
              <text x="40" y="38" fill="#93c5fd" fontSize="9" fontWeight="bold" textAnchor="middle">YOUR DOCK</text>
              <text x="40" y="50" fill="#bfdbfe" fontSize="7" textAnchor="middle">Commercial Park</text>
            </g>

            {/* Dock 4 */}
            <g transform="translate(375, 430)">
              <rect x="0" y="0" width="60" height="50" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1" />
              <text x="30" y="28" fill="#64748b" fontSize="10" textAnchor="middle">Bay 4</text>
            </g>

            {/* OUTBOUND STAGING & DISPATCH HANDOVER DESK */}
            <g transform="translate(455, 415)">
              <rect
                x="0"
                y="0"
                width="285"
                height="65"
                rx="10"
                fill="#451a03"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <text x="142" y="26" fill="#fcd34d" fontSize="12" fontWeight="900" textAnchor="middle">
                OUTBOUND STAGING & BARCODE DISPATCH DESK
              </text>
              <text x="142" y="42" fill="#fde68a" fontSize="9" textAnchor="middle">
                Inspection • Handover Verification • Driver Barcode Scan Counter
              </text>
              <text x="142" y="55" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle">
                Station S-1 • Officer On Duty
              </text>
            </g>

            {/* WALKING PATHWAY POLYLINE */}
            {showPathway && (
              <polyline
                points={pathwayPoints}
                fill="none"
                stroke="#34d399"
                strokeWidth="3.5"
                strokeDasharray="8 6"
                strokeLinecap="round"
                className="animate-[dash_1.5s_linear_infinite]"
              />
            )}

            {/* Direction Arrows on Pathway */}
            {showPathway && (
              <g fill="#10b981">
                <polygon points="175,445 185,450 175,455" />
                <polygon points="255,445 265,450 255,455" />
                <polygon points="270,410 275,400 280,410" />
              </g>
            )}
          </svg>
        </div>

        {/* Selected or Hovered Bin Quick Inspector Popover */}
        {(selectedItem || hoveredBin) && (
          <div className="mt-3 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <MapPin className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-300">
                  Inspecting Location: <strong className="text-emerald-400 font-mono text-sm">{selectedItem ? `${selectedItem.location.row} • Bin ${selectedItem.location.bin}` : hoveredBin?.id}</strong>
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedItem ? (
                    <span>Product: <strong className="text-white">{selectedItem.productName}</strong> ({selectedItem.quantity} units)</span>
                  ) : (
                    <span>Zone: {hoveredBin?.category}</span>
                  )}
                </div>
              </div>
            </div>

            {selectedItem && onQuickVerifyBarcode && (
              <button
                type="button"
                onClick={() => onQuickVerifyBarcode(selectedItem.barcode, selectedItem.orderId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verify Pickup for this Bin</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* STEP-BY-STEP WAYFINDING CHECKLIST (EASY INSIDE PICKUP GUIDE) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <Compass className="h-3.5 w-3.5" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Optimal Inside Warehouse Pickup Sequence
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {pickupSteps.length} Sequential Steps
          </span>
        </div>

        <div className="space-y-2.5">
          {pickupSteps.map((step, idx) => {
            const isPickupStep = step.type === 'pickup';
            const isActive = activeStepIndex === idx;

            return (
              <div
                key={step.stepNum}
                onClick={() => setActiveStepIndex(isActive ? null : idx)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isPickupStep
                    ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/80'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isPickupStep
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-100'
                      }`}
                    >
                      {step.stepNum}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{step.title}</span>
                        {step.binId && (
                          <span className="font-mono text-[10px] bg-emerald-100 text-emerald-950 px-1.5 py-0.2 rounded border border-emerald-300">
                            Bin {step.binId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-700 uppercase shrink-0 px-2 py-0.5 rounded bg-white border border-slate-200">
                    {step.type === 'dock' ? 'Parking' : step.type === 'staging' ? 'Scan Station' : 'Storage Aisle'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
