import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Search,
  Maximize2,
  Minimize2,
  Camera,
  Layers,
  MapPin,
  Box,
  Eye,
  Info,
  CheckCircle2,
  AlertTriangle,
  Scan,
  RefreshCw,
  Sparkles,
  Navigation,
  Compass,
} from 'lucide-react';
import { IRowGroup, IBin } from '../types.js';

interface Warehouse3DModelProps {
  rows: IRowGroup[];
  selectedBin: IBin | null;
  onSelectBin: (bin: IBin) => void;
  onNavigateToScan?: (barcode?: string) => void;
}

export const Warehouse3DModel: React.FC<Warehouse3DModelProps> = ({
  rows,
  selectedBin,
  onSelectBin,
  onNavigateToScan,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedBinCode, setHighlightedBinCode] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'aisle' | 'dock'>('iso');
  const [hoveredBin, setHoveredBin] = useState<IBin | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [showRacksOnly, setShowRacksOnly] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // References to three.js scene objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const binMeshesMap = useRef<Map<string, THREE.Mesh>>(new Map());
  const beaconMeshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Flatten all bins for easy lookup
  const allBins = React.useMemo(() => {
    const list: IBin[] = [];
    rows.forEach((r) => list.push(...r.bins));
    return list;
  }, [rows]);

  // Extract all unique products present across bins for fast 1-click locator
  const storedProducts = React.useMemo(() => {
    const map = new Map<string, { product: any; binCode: string; rowCode: string }>();
    rows.forEach((r) => {
      r.bins.forEach((b) => {
        b.assignedProducts?.forEach((p) => {
          if (!map.has(p.sku || p.name)) {
            map.set(p.sku || p.name, { product: p, binCode: b.binCode, rowCode: r.rowCode });
          }
        });
      });
    });
    return Array.from(map.values());
  }, [rows]);

  // Search results for products
  const matchingProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return storedProducts.filter(
      (item) =>
        item.product.name.toLowerCase().includes(q) ||
        item.product.sku.toLowerCase().includes(q) ||
        item.binCode.toLowerCase().includes(q) ||
        (item.product.category && item.product.category.toLowerCase().includes(q))
    );
  }, [storedProducts, searchQuery]);

  // 1. Initialize Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = Math.max(480, container.clientHeight || 520);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // dark slate 900
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.set(38, 42, 48);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Don't allow camera to go below floor
    controls.minDistance = 10;
    controls.maxDistance = 120;
    controls.target.set(0, 2, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(30, 45, 25);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.bias = -0.0005;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.4); // subtle blue fill
    dirLight2.position.set(-30, 20, -25);
    scene.add(dirLight2);

    // Warehouse Floor with industrial grid markings
    const floorGeo = new THREE.PlaneGeometry(80, 70);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Grid lines
    const grid = new THREE.GridHelper(80, 40, 0x38bdf8, 0x334155);
    grid.position.y = 0.02;
    scene.add(grid);

    // Safety walkways / yellow safety boundaries
    const createSafetyLine = (w: number, d: number, x: number, z: number) => {
      const lineGeo = new THREE.PlaneGeometry(w, d);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.04, z);
      scene.add(line);
    };

    // Yellow safety aisle stripes
    createSafetyLine(76, 0.35, 0, 28);
    createSafetyLine(76, 0.35, 0, -28);
    createSafetyLine(0.35, 56, -38, 0);
    createSafetyLine(0.35, 56, 38, 0);

    // Loading Dock Bays Area (Back of warehouse)
    for (let bay = 1; bay <= 3; bay++) {
      const bayX = -22 + (bay - 1) * 22;
      // Dock bay shutter
      const shutterGeo = new THREE.BoxGeometry(10, 8, 0.6);
      const shutterMat = new THREE.MeshStandardMaterial({
        color: bay === 2 ? 0x10b981 : 0x475569,
        metalness: 0.6,
        roughness: 0.3,
      });
      const shutter = new THREE.Mesh(shutterGeo, shutterMat);
      shutter.position.set(bayX, 4, -34.8);
      scene.add(shutter);

      // Dock Bay Floor Markings
      const markGeo = new THREE.PlaneGeometry(12, 10);
      const markMat = new THREE.MeshBasicMaterial({
        color: bay === 2 ? 0x065f46 : 0x1e293b,
        wireframe: true,
      });
      const mark = new THREE.Mesh(markGeo, markMat);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(bayX, 0.03, -29);
      scene.add(mark);

      // Inbound Delivery Truck stationed at Bay 2
      if (bay === 2) {
        const truckGroup = new THREE.Group();
        // Trailer container
        const containerMesh = new THREE.Mesh(
          new THREE.BoxGeometry(7, 5, 12),
          new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.4 })
        );
        containerMesh.position.set(0, 3.5, -4);
        containerMesh.castShadow = true;
        truckGroup.add(containerMesh);

        // Cab
        const cabMesh = new THREE.Mesh(
          new THREE.BoxGeometry(6.5, 4.5, 4.5),
          new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.3 })
        );
        cabMesh.position.set(0, 3, -12);
        truckGroup.add(cabMesh);

        truckGroup.position.set(bayX, 0, -26);
        scene.add(truckGroup);
      }
    }

    // Yellow Forklift on main aisle
    const forklift = new THREE.Group();
    const flBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.5, 4.5),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 })
    );
    flBody.position.set(0, 1.6, 0);
    flBody.castShadow = true;
    forklift.add(flBody);

    // Mast & Forks
    const mast = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 5.5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    mast.position.set(0, 2.8, 2.4);
    forklift.add(mast);

    const forks = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.15, 2),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    );
    forks.position.set(0, 0.4, 3.4);
    forklift.add(forks);

    forklift.position.set(-8, 0, 18);
    forklift.rotation.y = Math.PI / 4;
    scene.add(forklift);

    // Pulsing 3D Beacon / Pin for Highlighted Product
    const beaconGeo = new THREE.ConeGeometry(0.8, 2.2, 16);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.rotation.x = Math.PI; // point downward
    beacon.visible = false;
    scene.add(beacon);
    beaconMeshRef.current = beacon;

    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(binMeshesMap.current.values()) as THREE.Object3D[];
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const binData = hit.userData?.bin as IBin | undefined;
        if (binData) {
          setHoveredBin(binData);
          setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          canvas.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredBin(null);
      canvas.style.cursor = 'grab';
    };

    const handlePointerDown = () => {
      canvas.style.cursor = 'grabbing';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(binMeshesMap.current.values()) as THREE.Object3D[];
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const binData = hit.userData?.bin as IBin | undefined;
        if (binData) {
          onSelectBin(binData);
          setHighlightedBinCode(binData.binCode);
        }
      }
    };

    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('click', handleClick);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Animate beacon floating & bouncing
      if (beacon.visible) {
        beacon.position.y = beacon.userData.baseY + Math.sin(elapsedTime * 4) * 0.4;
        beacon.rotation.y += 0.03;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newW = container.clientWidth;
      const newH = Math.max(480, container.clientHeight || 520);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('click', handleClick);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // 2. Build 3D Storage Racks & Product Boxes based on actual Live DB rows
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old racks
    binMeshesMap.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
    });
    binMeshesMap.current.clear();

    // Remove existing rack groups if any
    const oldRacks = scene.getObjectByName('STORAGE_RACKS_GROUP');
    if (oldRacks) scene.remove(oldRacks);

    const racksGroup = new THREE.Group();
    racksGroup.name = 'STORAGE_RACKS_GROUP';

    const numRows = rows.length;
    const rowSpacing = 9.5;
    const startZ = -((numRows - 1) * rowSpacing) / 2;

    rows.forEach((row, rowIndex) => {
      const zPos = startZ + rowIndex * rowSpacing;
      const rowGroup = new THREE.Group();

      const numBins = row.bins.length;
      const binWidth = 5.2;
      const startX = -((numBins - 1) * binWidth) / 2;

      // Steel upright rack columns
      const columnGeo = new THREE.BoxGeometry(0.3, 7.5, 0.3);
      const columnMat = new THREE.MeshStandardMaterial({
        color: 0x334155, // slate 700 industrial steel
        metalness: 0.85,
        roughness: 0.25,
      });

      // Shelf crossbeams
      const beamGeo = new THREE.BoxGeometry(binWidth * numBins + 0.6, 0.25, 2.6);
      const beamMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.5,
        roughness: 0.4,
      });

      // Add multi-tier shelf beams (Level 1, Level 2, Level 3)
      [1.8, 3.8, 5.8].forEach((shelfY) => {
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, shelfY, zPos);
        beam.receiveShadow = true;
        racksGroup.add(beam);
      });

      // Columns along the rack length
      for (let c = 0; c <= numBins; c++) {
        const colX = startX - binWidth / 2 + c * binWidth;
        [-1.2, 1.2].forEach((offsetZ) => {
          const col = new THREE.Mesh(columnGeo, columnMat);
          col.position.set(colX, 3.75, zPos + offsetZ);
          col.castShadow = true;
          racksGroup.add(col);
        });
      }

      // Add individual storage bins & cargo product boxes
      row.bins.forEach((bin, binIndex) => {
        const xPos = startX + binIndex * binWidth;
        const occupancyRate = bin.capacity > 0 ? (bin.currentOccupancy / bin.capacity) * 100 : 0;
        const isOccupied = bin.currentOccupancy > 0;

        // Shelf tier position: cycle tiers for realistic multi-level stacking
        const tier = (binIndex % 2 === 0) ? 2.3 : 4.3;

        // Visual color logic based on status and occupancy
        let boxColor = 0x64748b; // empty gray
        let emissiveColor = 0x000000;

        if (occupancyRate >= 100) {
          boxColor = 0xf43f5e; // Rose (full)
        } else if (occupancyRate >= 80) {
          boxColor = 0xf59e0b; // Amber (near capacity)
        } else if (isOccupied) {
          boxColor = 0x10b981; // Emerald (active stock)
        }

        // Pallet wooden base
        const palletGeo = new THREE.BoxGeometry(3.6, 0.35, 2.2);
        const palletMat = new THREE.MeshStandardMaterial({
          color: 0x78350f, // wood brown
          roughness: 0.9,
        });
        const pallet = new THREE.Mesh(palletGeo, palletMat);
        pallet.position.set(xPos, tier - 0.2, zPos);
        pallet.castShadow = true;
        racksGroup.add(pallet);

        // Product Cargo Box / Pallet Load
        const boxHeight = isOccupied ? 1.4 + Math.min(1.2, (bin.currentOccupancy / 50) * 0.8) : 0.4;
        const boxGeo = new THREE.BoxGeometry(3.2, boxHeight, 1.9);
        const boxMat = new THREE.MeshStandardMaterial({
          color: boxColor,
          roughness: 0.45,
          metalness: 0.15,
          transparent: !isOccupied,
          opacity: isOccupied ? 0.95 : 0.35,
          emissive: emissiveColor,
        });

        const boxMesh = new THREE.Mesh(boxGeo, boxMat);
        boxMesh.position.set(xPos, tier + boxHeight / 2, zPos);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;

        // Store reference data in userData for raycasting & inspector
        boxMesh.userData = {
          bin,
          rowCode: row.rowCode,
          binCode: bin.binCode,
          tierLevel: tier > 3 ? 'Tier 2 (Upper Rack)' : 'Tier 1 (Lower Rack)',
          centerPos: new THREE.Vector3(xPos, tier + boxHeight / 2, zPos),
        };

        binMeshesMap.current.set(bin.binCode, boxMesh);
        racksGroup.add(boxMesh);
      });
    });

    scene.add(racksGroup);
  }, [rows]);

  // 3. Highlight Selected Bin / Product and Smoothly Position Camera & Beacon
  useEffect(() => {
    const targetCode = selectedBin?.binCode || highlightedBinCode;
    const beacon = beaconMeshRef.current;
    if (!beacon) return;

    if (!targetCode) {
      beacon.visible = false;
      return;
    }

    const targetMesh = binMeshesMap.current.get(targetCode);
    if (!targetMesh) {
      beacon.visible = false;
      return;
    }

    const pos = targetMesh.userData.centerPos as THREE.Vector3;
    beacon.position.set(pos.x, pos.y + 2.8, pos.z);
    beacon.userData = { baseY: pos.y + 2.8 };
    beacon.visible = true;

    // Smoothly focus camera on this rack if controls exist
    if (controlsRef.current && cameraRef.current) {
      const controls = controlsRef.current;
      const camera = cameraRef.current;

      // Animate camera target towards the target bin
      const currentTarget = controls.target;
      const targetPos = new THREE.Vector3(pos.x, pos.y + 1.5, pos.z);

      // Smooth step towards target
      currentTarget.lerp(targetPos, 0.7);
      controls.target.copy(currentTarget);
    }
  }, [selectedBin, highlightedBinCode]);

  // Camera presets switcher
  const handleSetPreset = (preset: 'iso' | 'top' | 'aisle' | 'dock') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    setCameraPreset(preset);

    if (preset === 'iso') {
      camera.position.set(38, 42, 48);
      controls.target.set(0, 2, 0);
    } else if (preset === 'top') {
      camera.position.set(0, 68, 0.1);
      controls.target.set(0, 0, 0);
    } else if (preset === 'aisle') {
      camera.position.set(-25, 6, 2);
      controls.target.set(0, 4, 2);
    } else if (preset === 'dock') {
      camera.position.set(0, 14, -45);
      controls.target.set(0, 3, -20);
    }
    controls.update();
  };

  // Instant 1-Click Product Locator Handler
  const handleSelectProductToLocate = (binCode: string) => {
    setHighlightedBinCode(binCode);
    setSearchQuery('');
    const foundBin = allBins.find((b) => b.binCode === binCode);
    if (foundBin) {
      onSelectBin(foundBin);
    }
  };

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-700/80 bg-slate-950 text-white shadow-2xl overflow-hidden">
      {/* ========================================================= */}
      {/* 3D MAP HEADER & FAST PRODUCT LOCATOR TOOLBAR             */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur-md z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold text-indigo-300 border border-indigo-500/30">
              <Compass className="h-3.5 w-3.5 text-indigo-400" />
              3D Digital Twin Model
            </span>
            <span className="text-xs text-slate-400 font-medium">
              WH-01 Storage Racks & Automated Aisle View
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Rotate & zoom to inspect live rack occupancy. Search any product below to instantly locate its exact 3D shelf position.
          </p>
        </div>

        {/* Product Search Input ("Without Any Hustle") */}
        <div className="relative w-full md:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name or SKU to locate in 3D..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown Search Results */}
          {matchingProducts.length > 0 && (
            <div className="absolute right-0 mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl z-50 text-xs max-h-64 overflow-y-auto space-y-1 animate-in fade-in duration-150">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Found {matchingProducts.length} Product Location{matchingProducts.length > 1 ? 's' : ''}
              </div>
              {matchingProducts.map((item) => (
                <button
                  key={`${item.binCode}-${item.product.sku}`}
                  type="button"
                  onClick={() => handleSelectProductToLocate(item.binCode)}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-900/60 border border-slate-700/60 hover:border-indigo-500/50 transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-bold text-white group-hover:text-indigo-200 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>SKU: {item.product.sku}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {item.product.quantity} units
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-1 text-[11px] font-mono font-bold text-indigo-300 border border-indigo-500/40">
                    <MapPin className="h-3 w-3" />
                    <span>{item.binCode}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick 1-Click Stored Product Chips Strip */}
      {storedProducts.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-slate-800/80 bg-slate-950/70 px-4 py-2 text-[11px] overflow-x-auto">
          <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            Quick Locate:
          </span>
          {storedProducts.slice(0, 8).map((item) => {
            const isTarget = (selectedBin?.binCode || highlightedBinCode) === item.binCode;
            return (
              <button
                key={item.product.sku}
                type="button"
                onClick={() => handleSelectProductToLocate(item.binCode)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium shrink-0 transition-all border ${
                  isTarget
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm font-bold ring-2 ring-indigo-400/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{item.product.name.split(' ')[0]}</span>
                <span className="font-mono text-[9px] px-1 rounded bg-black/40 text-indigo-200">
                  {item.binCode}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* THREE.JS 3D CANVAS VIEWPORT                              */}
      {/* ========================================================= */}
      <div ref={containerRef} className="relative h-[480px] sm:h-[530px] w-full bg-slate-950 select-none">
        <canvas ref={canvasRef} className="h-full w-full block cursor-grab active:cursor-grabbing" />

        {/* Camera Preset Control Buttons Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 p-1.5 backdrop-blur-md shadow-lg z-10 text-[11px]">
          <span className="text-slate-400 text-[10px] font-bold px-2 uppercase">Angle:</span>
          <button
            type="button"
            onClick={() => handleSetPreset('iso')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
              cameraPreset === 'iso' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📐 Isometric 3D
          </button>
          <button
            type="button"
            onClick={() => handleSetPreset('top')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
              cameraPreset === 'top' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🔝 Top-Down
          </button>
          <button
            type="button"
            onClick={() => handleSetPreset('aisle')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
              cameraPreset === 'aisle' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🚶 Aisle Walk
          </button>
          <button
            type="button"
            onClick={() => handleSetPreset('dock')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
              cameraPreset === 'dock' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🚚 Inbound Dock
          </button>
        </div>

        {/* 3D Color Legend Overlay */}
        <div className="absolute bottom-3 left-3 hidden sm:flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 backdrop-blur-md text-[11px] text-slate-300 z-10">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-slate-500" />
            <span>Empty Pallet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
            <span>Active (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
            <span>Nearly Full (80-99%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
            <span>Full (100%)</span>
          </div>
        </div>

        {/* Active Hover Tooltip */}
        {hoveredBin && hoverPos && (
          <div
            style={{ left: Math.min(hoverPos.x + 12, (containerRef.current?.clientWidth || 800) - 220), top: hoverPos.y - 45 }}
            className="pointer-events-none absolute z-30 rounded-xl border border-indigo-500/40 bg-slate-900/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md text-white animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between gap-3 font-mono font-bold text-indigo-300">
              <span>Bin {hoveredBin.binCode}</span>
              <span className="text-[10px] text-slate-400">
                {hoveredBin.capacity > 0 ? Math.round((hoveredBin.currentOccupancy / hoveredBin.capacity) * 100) : 0}%
              </span>
            </div>
            <div className="text-[11px] text-slate-200 mt-0.5">
              {hoveredBin.assignedProducts && hoveredBin.assignedProducts.length > 0 ? (
                <span>
                  <strong>{hoveredBin.assignedProducts[0].name}</strong> ({hoveredBin.currentOccupancy} units)
                </span>
              ) : (
                <span className="text-slate-400 italic">Empty storage cell</span>
              )}
            </div>
            <div className="text-[9px] text-indigo-400/80 mt-1">Click to inspect bin & products</div>
          </div>
        )}

        {/* Active Product HUD Card (When a bin is selected or located) */}
        {selectedBin && (
          <div className="absolute top-3 right-3 w-72 sm:w-80 rounded-2xl border border-indigo-500/50 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md z-20 animate-in fade-in slide-in-from-right-4 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono font-bold text-xs">
                  {selectedBin.binCode}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-white">Rack Location Found</div>
                  <div className="text-[11px] text-indigo-300 font-mono">
                    {selectedBin.rowCode} • Slot {selectedBin.orderIndex}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHighlightedBinCode(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Occupancy Progress Bar */}
            <div className="my-3 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Bin Occupancy</span>
                <span className="font-bold text-indigo-200">
                  {selectedBin.currentOccupancy} / {selectedBin.capacity} units ({selectedBin.capacity > 0 ? Math.round((selectedBin.currentOccupancy / selectedBin.capacity) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/60">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-full"
                  style={{
                    width: `${Math.min(100, selectedBin.capacity > 0 ? (selectedBin.currentOccupancy / selectedBin.capacity) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>

            {/* Stored Product Details */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Stored Product In This Bin:
              </span>
              {selectedBin.assignedProducts && selectedBin.assignedProducts.length > 0 ? (
                selectedBin.assignedProducts.map((p) => (
                  <div
                    key={p.productId || p.sku}
                    className="rounded-xl border border-slate-800 bg-slate-800/80 p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{p.name}</span>
                      <span className="text-emerald-400 font-mono">+{p.quantity} units</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>SKU: <strong className="text-slate-200 font-mono">{p.sku}</strong></span>
                      {p.category && (
                        <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                          {p.category}
                        </span>
                      )}
                    </div>
                    {p.barcode && (
                      <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                        Barcode: {p.barcode}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-3 text-center text-xs text-slate-400">
                  Empty storage cell ready for stock assignment
                </div>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-800">
              {onNavigateToScan && selectedBin.assignedProducts && selectedBin.assignedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateToScan(selectedBin.assignedProducts?.[0]?.barcode)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white transition-colors"
                >
                  <Scan className="h-3.5 w-3.5" />
                  <span>Scan / Inward Stock</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectBin(selectedBin)}
                className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition-colors"
              >
                Inspect Full Bin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Tip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800 bg-slate-900/60 px-4 py-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span>💡 <strong>Tip:</strong> Left-click + drag to orbit in 3D • Right-click to pan • Scroll wheel to zoom in</span>
        </div>
        <div className="text-slate-400">
          Showing {allBins.length} storage bins across {rows.length} aisles
        </div>
      </div>
    </div>
  );
};
