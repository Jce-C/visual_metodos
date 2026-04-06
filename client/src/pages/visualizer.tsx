import React, { useState, useEffect } from "react";
import { Play, RotateCcw, Activity, AlertTriangle, ChevronRight, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MethodType, MathParams, IterationState, calculateNextStep } from "../lib/math-engine";
import { MathGraph } from "../components/MathGraph";
import { DataTable } from "../components/DataTable";
import { usePresets } from "../hooks/use-presets";
import katex from "katex";
import "katex/dist/katex.min.css";

const METHOD_LABELS: Record<MethodType, string> = {
  bisection: "Bisección",
  falsePosition: "Falsa Posición",
  newton: "Newton-Raphson",
  secant: "Secante",
  fixedPoint: "Punto Fijo"
};

function LatexPreview({ expression }: { expression: string }) {
  const [html, setHtml] = useState("");
  
  useEffect(() => {
    try {
      const rendered = katex.renderToString(expression, { 
        throwOnError: false,
        displayMode: true
      });
      setHtml(rendered);
    } catch (e) {
      setHtml(`<span style="color: #ef4444; font-size: 0.875rem;">Error en LaTeX</span>`);
    }
  }, [expression]);

  return (
    <div 
      className="bg-black/30 border border-white/10 rounded-lg p-3 mt-2 min-h-[50px] flex items-center justify-center overflow-x-auto text-white/80"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function Visualizer() {
  const { data: presets = [], isLoading: isLoadingPresets } = usePresets();

  const [params, setParams] = useState<MathParams>({
    f: "x^3 - x - 2",
    method: "bisection",
    a: 1,
    b: 2,
    x0: 1.5,
    x1: 2,
    g: "cbrt(x + 2)",
    tolerance: 0.01
  });

  const [iterations, setIterations] = useState<IterationState[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isClosed = params.method === 'bisection' || params.method === 'falsePosition';
  const isSecant = params.method === 'secant';
  const isFixedPoint = params.method === 'fixedPoint';
  
  const isFinished = iterations.length > 0 && 
    iterations[iterations.length - 1].error < params.tolerance && 
    iterations[iterations.length - 1].i > 0;
  
  const isDiverged = iterations.length > 0 && iterations[iterations.length - 1].diverging;

  const handleNextStep = () => {
    try {
      setErrorMsg(null);
      const next = calculateNextStep(params, iterations);
      setIterations(prev => [...prev, next]);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleReset = () => {
    setIterations([]);
    setErrorMsg(null);
  };

  const updateParam = (key: keyof MathParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
    handleReset();
  };

  const applyPreset = (presetId: number) => {
    const p = presets.find(x => x.id === presetId);
    if (p) {
      updateParam('f', p.expression);
      if (p.gExpression) updateParam('g', p.gExpression);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-foreground p-4 md:p-6 lg:p-8 flex flex-col font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 text-primary rounded-xl border border-primary/30">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Métodos Numéricos
            </h1>
            <p className="text-sm text-muted-foreground">Visualizador Interactivo</p>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Controls */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="glass-panel p-5 rounded-2xl">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Calculator size={18} className="text-secondary" />
              Configuración
            </h2>

            {/* Presets */}
            {presets.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1">Ejemplos</label>
                <select 
                  className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  onChange={e => applyPreset(Number(e.target.value))}
                >
                  <option value="">Selecciona un ejemplo...</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Method Select */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1">Método</label>
              <select 
                value={params.method}
                onChange={e => updateParam('method', e.target.value as MethodType)}
                className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none text-primary font-medium"
              >
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Function f(x) with LaTeX Preview */}
            <div className="mb-4">
              <label className="block text-xs text-muted-foreground mb-1">Función f(x) = 0</label>
              <input 
                type="text" 
                value={params.f}
                onChange={e => updateParam('f', e.target.value)}
                className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                placeholder="Ej. x^2 - 4"
              />
              <LatexPreview expression={`f(x) = ${params.f}`} />
            </div>

            {/* Function g(x) for fixed point with LaTeX */}
            {isFixedPoint && (
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1">Función g(x)</label>
                <input 
                  type="text" 
                  value={params.g}
                  onChange={e => updateParam('g', e.target.value)}
                  className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-secondary outline-none"
                  placeholder="Ej. sqrt(4)"
                />
                <LatexPreview expression={`g(x) = ${params.g}`} />
              </div>
            )}

            {/* Intervals / Initial Points */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {isClosed ? (
                <>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Extremo a</label>
                    <input type="number" step="any" value={params.a} onChange={e => updateParam('a', parseFloat(e.target.value))} className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Extremo b</label>
                    <input type="number" step="any" value={params.b} onChange={e => updateParam('b', parseFloat(e.target.value))} className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </>
              ) : isSecant ? (
                <>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Punto x(i-1)</label>
                    <input type="number" step="any" value={params.x0} onChange={e => updateParam('x0', parseFloat(e.target.value))} className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Punto x(i)</label>
                    <input type="number" step="any" value={params.x1} onChange={e => updateParam('x1', parseFloat(e.target.value))} className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Punto Inicial x0</label>
                  <input type="number" step="any" value={params.x0} onChange={e => updateParam('x0', parseFloat(e.target.value))} className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none" />
                </div>
              )}
            </div>

            {/* Tolerance */}
            <div className="mb-6">
              <label className="block text-xs text-muted-foreground mb-1">Tolerancia Error (%)</label>
              <input type="number" step="0.001" value={params.tolerance} onChange={e => updateParam('tolerance', parseFloat(e.target.value))} className="w-full bg-black/40 border border-border rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-primary outline-none" />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleNextStep}
              disabled={isFinished || isDiverged}
              className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all duration-300 shadow-lg ${
                isFinished || isDiverged 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-gradient-to-r from-primary to-primary/70 text-black hover:shadow-primary/25 hover:-translate-y-0.5'
              }`}
            >
              {iterations.length === 0 ? (
                <><Play size={20} /> Iniciar Análisis</>
              ) : (
                <><ChevronRight size={20} /> Siguiente Paso</>
              )}
            </button>
            
            <button 
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
            >
              <RotateCcw size={18} /> Reiniciar
            </button>
          </div>

        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Graph Section */}
          <div className="h-[45vh] lg:h-[55vh] w-full rounded-2xl relative">
            <MathGraph params={params} iterations={iterations} />
            
            {/* Overlay Status */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-destructive/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-red-400 shadow-xl flex items-center gap-2 font-medium"
                >
                  <AlertTriangle size={18} /> {errorMsg}
                </motion.div>
              )}
              {isFinished && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-4 right-4 bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-2 rounded-lg backdrop-blur-sm shadow-xl font-medium"
                >
                  ¡Convergencia alcanzada!
                </motion.div>
              )}
              {isDiverged && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-4 right-4 bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg backdrop-blur-sm shadow-xl font-medium"
                >
                  ¡Divergencia detectada!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Data Table Section */}
          <div className="flex-1 min-h-[250px] flex flex-col">
            <h3 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
              Registro de Iteraciones
            </h3>
            <DataTable iterations={iterations} method={params.method} />
          </div>

        </div>
      </div>
    </div>
  );
}
