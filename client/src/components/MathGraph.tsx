import React, { useMemo, useRef, useState, useEffect } from 'react';
import { evaluate } from 'mathjs';
import { IterationState, MethodType, MathParams } from '../lib/math-engine';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface MathGraphProps {
  params: MathParams;
  iterations: IterationState[];
}

interface Tooltip {
  x: number;
  y: number;
  text: string;
  visible: boolean;
}

export function MathGraph({ params, iterations }: MathGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<Tooltip>({ x: 0, y: 0, text: '', visible: false });

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(400, entry.contentRect.height)
        });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;

  // Auto-calculate domain based on iterations and keep it centered
  // Also handle auto-zoom for small values
  const domain = useMemo(() => {
    let xMin = -10, xMax = 10, yMin = -10, yMax = 10;
    let autoZoom = 1;
    
    if (iterations.length > 0) {
      let xs: number[] = [];
      let ys: number[] = [];
      
      iterations.forEach(it => {
        if (it.a !== undefined) xs.push(it.a);
        if (it.b !== undefined) xs.push(it.b);
        if (it.a_prev !== undefined) xs.push(it.a_prev);
        if (it.b_prev !== undefined) xs.push(it.b_prev);
        if (it.c !== undefined) { xs.push(it.c); ys.push(it.fc || 0); }
        if (it.xi !== undefined) { xs.push(it.xi); ys.push(it.fxi || 0); }
        if (it.xi_prev !== undefined) { xs.push(it.xi_prev); }
        if (it.xi_minus_1 !== undefined) { xs.push(it.xi_minus_1); ys.push(it.fxi_minus_1 || 0); }
        if (it.xNext !== undefined) xs.push(it.xNext);
        if (it.gxi !== undefined) ys.push(it.gxi);
      });

      if (xs.length > 0) {
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const diffX = Math.max(maxX - minX, 2);
        xMin = minX - diffX * 0.3;
        xMax = maxX + diffX * 0.3;
        
        // Auto-zoom for small values
        if (diffX < 0.1) autoZoom = 3;
        else if (diffX < 0.5) autoZoom = 2;
      }
      
      if (ys.length > 0) {
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const diffY = Math.max(maxY - minY, 2);
        yMin = minY - diffY * 0.3;
        yMax = maxY + diffY * 0.3;
        
        // Auto-zoom for small values
        if (diffY < 0.1) autoZoom = Math.max(autoZoom, 3);
        else if (diffY < 0.5) autoZoom = Math.max(autoZoom, 2);
      }
    } else {
      if (params.a !== undefined && params.b !== undefined) {
        xMin = params.a - 2; xMax = params.b + 2;
      } else if (params.x0 !== undefined) {
        xMin = params.x0 - 5; xMax = params.x0 + 5;
      }
    }
    
    if (xMin > 0 && xMin < 2) xMin = -1;
    if (xMax < 0 && xMax > -2) xMax = 1;
    if (yMin > 0 && yMin < 2) yMin = -1;
    if (yMax < 0 && yMax > -2) yMax = 1;

    // Ensure no zero width/height
    if (xMax <= xMin) xMax = xMin + 1;
    if (yMax <= yMin) yMax = yMin + 1;

    return { xMin, xMax, yMin, yMax, autoZoom };
  }, [iterations, params]);

  const effectiveZoom = Math.max(zoom, domain.autoZoom);

  const mapX = (x: number) => {
    const range = (domain.xMax - domain.xMin);
    const centerX = (domain.xMax + domain.xMin) / 2;
    // Apply pan relative to the data range, not screen pixels directly for consistency
    const xWithPan = x - (panX / (width * effectiveZoom)) * range;
    return ((xWithPan - domain.xMin) / range) * width * effectiveZoom;
  };

  const mapY = (y: number) => {
    const range = (domain.yMax - domain.yMin);
    const yWithPan = y - (panY / (height * effectiveZoom)) * range;
    return height - (((yWithPan - domain.yMin) / range) * height * effectiveZoom);
  };

  // Inverse map for tooltip
  const unmapX = (px: number) => {
    const range = domain.xMax - domain.xMin;
    return domain.xMin + (px / (width * effectiveZoom)) * range + (panX / (width * effectiveZoom)) * range;
  };

  const unmapY = (py: number) => {
    const range = domain.yMax - domain.yMin;
    return domain.yMin + ((height - py) / (height * effectiveZoom)) * range + (panY / (height * effectiveZoom)) * range;
  };

  // Generate f(x) path
  const functionPath = useMemo(() => {
    let d = "";
    const steps = 300; // Increased steps for better resolution
    const rangeX = (domain.xMax - domain.xMin);
    const viewPortXMin = domain.xMin + (panX / (width * effectiveZoom)) * rangeX;
    const viewPortXMax = viewPortXMin + rangeX;
    
    // Draw slightly beyond the viewport to ensure smooth edges
    const drawMinX = viewPortXMin - rangeX * 0.5;
    const drawMaxX = viewPortXMax + rangeX * 0.5;
    const stepX = (drawMaxX - drawMinX) / steps;

    let first = true;
    for (let i = 0; i <= steps; i++) {
      const x = drawMinX + i * stepX;
      try {
        const y = evaluate(params.f, { x });
        if (!isFinite(y)) {
          first = true;
          continue;
        }
        const px = mapX(x);
        const py = mapY(y);
        
        // Safety check for extreme values
        if (py < -height * 5 || py > height * 5) {
          first = true;
          continue;
        }
        
        if (first) {
          d += `M ${px} ${py} `;
          first = false;
        } else {
          d += `L ${px} ${py} `;
        }
      } catch (e) {
        first = true;
      }
    }
    return d;
  }, [params.f, domain, width, height, zoom, panX, panY, effectiveZoom]);

  // Generate g(x) path
  const gFunctionPath = useMemo(() => {
    if (params.method !== 'fixedPoint' || !params.g) return "";
    let d = "";
    const steps = 300;
    const rangeX = (domain.xMax - domain.xMin);
    const viewPortXMin = domain.xMin + (panX / (width * effectiveZoom)) * rangeX;
    const viewPortXMax = viewPortXMin + rangeX;
    
    const drawMinX = viewPortXMin - rangeX * 0.5;
    const drawMaxX = viewPortXMax + rangeX * 0.5;
    const stepX = (drawMaxX - drawMinX) / steps;

    let first = true;
    for (let i = 0; i <= steps; i++) {
      const x = drawMinX + i * stepX;
      try {
        const y = evaluate(params.g, { x });
        if (!isFinite(y)) {
          first = true;
          continue;
        }
        const px = mapX(x);
        const py = mapY(y);
        if (py < -height * 5 || py > height * 5) {
          first = true;
          continue;
        }
        if (first) {
          d += `M ${px} ${py} `;
          first = false;
        } else {
          d += `L ${px} ${py} `;
        }
      } catch (e) {
        first = true;
      }
    }
    return d;
  }, [params.method, params.g, domain, width, height, zoom, panX, panY, effectiveZoom]);

  const xAxisY = mapY(0);
  const yAxisX = mapX(0);
  const lastIt = iterations[iterations.length - 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      
      const x = unmapX(px);
      const y = unmapY(py);
      
      try {
        const fx = evaluate(params.f, { x });
        setTooltip({
          x: px,
          y: py,
          text: `x=${x.toFixed(3)}, f(x)=${fx.toFixed(3)}`,
          visible: true
        });
      } catch (e) {
        setTooltip({ ...tooltip, visible: false });
      }
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ ...tooltip, visible: false });
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2 || e.ctrlKey || e.metaKey) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY + panY });
  };

  const handleMouseMove2 = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      const newPanX = e.clientX - dragStart.x;
      const newPanY = dragStart.y - e.clientY; // Invert Y drag
      setPanX(newPanX);
      setPanY(newPanY);
    }
    handleMouseMove(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(4, prev * 1.3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, prev / 1.3));
  };

  const handleResetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#0A0F1A] rounded-xl border border-white/5 shadow-2xl" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        className="absolute inset-0"
        onMouseMove={handleMouseMove2}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Grid labels / Coordinates */}
        {(() => {
          const labels = [];
          const rangeX = (domain.xMax - domain.xMin);
          const rangeY = (domain.yMax - domain.yMin);
          
          const viewPortXMin = domain.xMin + (panX / (width * effectiveZoom)) * rangeX;
          const viewPortXMax = viewPortXMin + rangeX;
          const viewPortYMin = domain.yMin + (panY / (height * effectiveZoom)) * rangeY;
          const viewPortYMax = viewPortYMin + rangeY;

          const stepX = rangeX / 10;
          const stepY = rangeY / 10;
          
          // Calculate grid starting point based on viewport
          const startX = Math.floor(viewPortXMin / stepX) * stepX;
          const startY = Math.floor(viewPortYMin / stepY) * stepY;

          for (let i = -2; i <= 12; i++) {
            const x = startX + i * stepX;
            const y = startY + i * stepY;
            const px = mapX(x);
            const py = mapY(y);
            
            if (px >= 0 && px <= width) {
              labels.push(
                <text key={`x-${i}-${x}`} x={px} y={Math.max(15, Math.min(height - 5, xAxisY + 15))} fontSize="10" fill="rgba(255,255,255,0.4)" textAnchor="middle">
                  {x.toFixed(1)}
                </text>
              );
            }
            if (py >= 0 && py <= height) {
              labels.push(
                <text key={`y-${i}-${y}`} x={Math.max(5, Math.min(width - 40, yAxisX - 5))} y={py + 4} fontSize="10" fill="rgba(255,255,255,0.4)" textAnchor="end">
                  {y.toFixed(1)}
                </text>
              );
            }
          }
          return labels;
        })()}

        {/* Axes */}
        {domain.yMin <= 0 && domain.yMax >= 0 && (
          <line x1="0" y1={xAxisY} x2={width} y2={xAxisY} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        )}
        {domain.xMin <= 0 && domain.xMax >= 0 && (
          <line x1={yAxisX} y1="0" x2={yAxisX} y2={height} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        )}

        {/* Math functions */}
        {params.method === 'fixedPoint' && (
          <line x1={mapX(domain.xMin)} y1={mapY(domain.xMin)} x2={mapX(domain.xMax)} y2={mapY(domain.xMax)} stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="5,5" fill="none" />
        )}
        {gFunctionPath && (
          <path d={gFunctionPath} stroke="hsl(316, 70%, 50%)" strokeWidth="2.5" fill="none" className="drop-shadow-lg" />
        )}
        <path d={functionPath} stroke="hsl(190, 90%, 50%)" strokeWidth="2.5" fill="none" className="drop-shadow-lg" />

        {/* Method Specific Visualizations */}
        {lastIt && (
          <>
            {/* BISECTION & FALSE POSITION - Show history trail */}
            {(params.method === 'bisection' || params.method === 'falsePosition') && lastIt.a !== undefined && lastIt.b !== undefined && lastIt.c !== undefined && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Previous interval - faded */}
                {lastIt.a_prev !== undefined && lastIt.b_prev !== undefined && (
                  <>
                    <rect 
                      x={Math.min(mapX(lastIt.a_prev), mapX(lastIt.b_prev))} y={0} 
                      width={Math.abs(mapX(lastIt.b_prev) - mapX(lastIt.a_prev))} height={height} 
                      fill="rgba(150, 100, 150, 0.05)"
                      opacity="0.3"
                    />
                    <motion.circle cx={mapX(lastIt.a_prev)} cy={xAxisY} r="4" fill="hsl(300, 70%, 50%)" opacity="0.4" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                    <motion.circle cx={mapX(lastIt.b_prev)} cy={xAxisY} r="4" fill="hsl(300, 70%, 50%)" opacity="0.4" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                  </>
                )}
                
                {/* Current interval - bright */}
                <motion.rect 
                  x={Math.min(mapX(lastIt.a), mapX(lastIt.b))} y={0} 
                  width={Math.abs(mapX(lastIt.b) - mapX(lastIt.a))} height={height} 
                  fill="hsl(190, 90%, 50%, 0.08)"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                />
                
                {/* Current bounds a, b */}
                <motion.circle cx={mapX(lastIt.a)} cy={xAxisY} r="6" fill="hsl(190, 90%, 50%)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                <motion.circle cx={mapX(lastIt.b)} cy={xAxisY} r="6" fill="hsl(190, 90%, 50%)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                
                {/* Midpoint c with enhanced tracking */}
                <motion.line x1={mapX(lastIt.c)} y1={0} x2={mapX(lastIt.c)} y2={height} stroke="hsl(262, 83%, 68%)" strokeWidth="2.5" strokeDasharray="4,4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                {/* Tracking line from midpoint to curve */}
                <motion.line x1={mapX(lastIt.c)} y1={xAxisY} x2={mapX(lastIt.c)} y2={mapY(lastIt.fc!)} stroke="hsl(262, 83%, 68%)" strokeWidth="1.5" opacity="0.6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1, duration: 0.4 }} />
                {/* Point on curve */}
                <motion.circle cx={mapX(lastIt.c)} cy={mapY(lastIt.fc!)} r="6" fill="hsl(262, 83%, 68%)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} />
                {/* Point on x-axis */}
                <motion.circle cx={mapX(lastIt.c)} cy={xAxisY} r="5" fill="hsl(262, 83%, 68%)" opacity="0.6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 }} />
              </motion.g>
            )}

            {/* NEWTON - Animated tangent then point with history */}
            {params.method === 'newton' && lastIt.xi !== undefined && lastIt.xNext !== undefined && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Previous point - faded */}
                {lastIt.xi_prev !== undefined && (
                  <motion.circle cx={mapX(lastIt.xi_prev)} cy={mapY(lastIt.fxi!)} r="3" fill="hsl(150, 70%, 50%)" opacity="0.3" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                )}
                
                {/* Vertical line xi to f(xi) */}
                <motion.line x1={mapX(lastIt.xi)} y1={xAxisY} x2={mapX(lastIt.xi)} y2={mapY(lastIt.fxi!)} stroke="rgba(255,255,255,0.3)" strokeDasharray="4,4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} />
                
                {/* Tangent line */}
                <line 
                  x1={mapX(lastIt.xi)} y1={mapY(lastIt.fxi!)} 
                  x2={mapX(lastIt.xNext)} y2={xAxisY} 
                  stroke="hsl(316, 70%, 50%)" strokeWidth="2"
                />
                
                {/* Point on curve */}
                <motion.circle 
                  cx={mapX(lastIt.xi)} cy={mapY(lastIt.fxi!)} r="6" fill="hsl(190, 90%, 50%)" 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: 0.3, type: 'spring' }}
                />
                
                {/* New point */}
                <motion.circle 
                  cx={mapX(lastIt.xNext)} cy={xAxisY} r="6" fill="hsl(316, 70%, 50%)" 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: 0.55, type: 'spring', stiffness: 150 }}
                />
              </motion.g>
            )}

            {/* SECANT - Show both previous points and current */}
            {params.method === 'secant' && lastIt.xi !== undefined && lastIt.xi_minus_1 !== undefined && lastIt.xNext !== undefined && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Previous points - faded */}
                {lastIt.xi_prev !== undefined && (
                  <motion.circle cx={mapX(lastIt.xi_prev)} cy={mapY(lastIt.fxi!)} r="3" fill="hsl(150, 70%, 50%)" opacity="0.3" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                )}
                {lastIt.xi_minus_1_prev !== undefined && (
                  <motion.circle cx={mapX(lastIt.xi_minus_1_prev)} cy={mapY(lastIt.fxi!)} r="3" fill="hsl(150, 70%, 50%)" opacity="0.3" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                )}
                
                {/* Current secant line between two points */}
                <line 
                  x1={mapX(lastIt.xi_minus_1)} y1={mapY(lastIt.fxi_minus_1!)} 
                  x2={mapX(lastIt.xi)} y2={mapY(lastIt.fxi!)} 
                  stroke="hsl(316, 70%, 50%)" strokeWidth="2" strokeDasharray="4,4"
                />
                <line 
                  x1={mapX(lastIt.xi)} y1={mapY(lastIt.fxi!)} 
                  x2={mapX(lastIt.xNext)} y2={xAxisY} 
                  stroke="hsl(316, 70%, 50%)" strokeWidth="2"
                />
                <motion.circle cx={mapX(lastIt.xi_minus_1)} cy={mapY(lastIt.fxi_minus_1!)} r="5" fill="hsl(190, 90%, 50%)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                <motion.circle cx={mapX(lastIt.xi)} cy={mapY(lastIt.fxi!)} r="6" fill="hsl(190, 90%, 50%)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                <motion.circle cx={mapX(lastIt.xNext)} cy={xAxisY} r="6" fill="hsl(316, 70%, 50%)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} />
              </motion.g>
            )}

            {/* FIXED POINT (Cobweb) */}
            {params.method === 'fixedPoint' && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {iterations.map((it, idx) => {
                  if (it.xi === undefined || it.gxi === undefined) return null;
                  const opacity = 0.3 + (idx / Math.max(1, iterations.length - 1)) * 0.7;
                  return (
                    <motion.g key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                      <line x1={mapX(it.xi)} y1={mapY(idx === 0 ? 0 : it.xi)} x2={mapX(it.xi)} y2={mapY(it.gxi)} stroke="hsl(262, 83%, 68%)" strokeWidth="1.5" opacity={opacity} />
                      <line x1={mapX(it.xi)} y1={mapY(it.gxi)} x2={mapX(it.gxi)} y2={mapY(it.gxi)} stroke="hsl(262, 83%, 68%)" strokeWidth="1.5" opacity={opacity} />
                      <circle cx={mapX(it.xi)} cy={mapY(it.gxi)} r="3" fill="hsl(190, 90%, 50%)" opacity={opacity} />
                    </motion.g>
                  );
                })}
              </motion.g>
            )}
          </>
        )}
      </svg>
      
      {/* Tooltip */}
      {tooltip.visible && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bg-black/80 text-white text-xs px-3 py-1 rounded pointer-events-none border border-white/20 font-mono"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.text}
        </motion.div>
      )}
      
      {/* HUD Info */}
      <div className="absolute top-4 left-4 text-xs font-mono text-white/50 bg-black/40 px-2 py-1 rounded">
        <div>Dominio: [{domain.xMin.toFixed(2)}, {domain.xMax.toFixed(2)}]</div>
        <div className="text-white/30 text-xs mt-1">Arrastra para navegar</div>
      </div>

      {/* Zoom and Navigation Controls */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-black/40 rounded-lg p-2 backdrop-blur-sm border border-white/10">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded hover:bg-white/10 transition text-white/70 hover:text-white"
          title="Aumentar zoom"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded hover:bg-white/10 transition text-white/70 hover:text-white"
          title="Disminuir zoom"
        >
          <ZoomOut size={18} />
        </button>
        <div className="h-px bg-white/10 my-1" />
        <button
          onClick={handleResetView}
          className="px-2 py-1 rounded hover:bg-white/10 transition text-white/70 hover:text-white text-xs font-mono"
          title="Restablecer vista"
        >
          Reset
        </button>
      </div>
      
      {/* Iteration counter */}
      {iterations.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-4 right-4 text-sm font-bold text-white bg-gradient-to-r from-primary/30 to-primary/10 px-4 py-2 rounded-lg border border-primary/30 backdrop-blur-sm"
        >
          Paso {iterations.length}
        </motion.div>
      )}
    </div>
  );
}
