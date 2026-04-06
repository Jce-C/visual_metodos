import React from 'react';
import { IterationState, MethodType } from '../lib/math-engine';

interface DataTableProps {
  iterations: IterationState[];
  method: MethodType;
}

export function DataTable({ iterations, method }: DataTableProps) {
  if (iterations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
        Aún no hay iteraciones. Presiona "Iniciar" o "Siguiente Paso".
      </div>
    );
  }

  const isClosed = method === 'bisection' || method === 'falsePosition';
  
  return (
    <div className="w-full overflow-auto rounded-xl border border-border/50 bg-card/50 backdrop-blur">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground bg-black/20 uppercase">
          <tr>
            <th className="px-4 py-3">i</th>
            {isClosed ? (
              <>
                <th className="px-4 py-3">a</th>
                <th className="px-4 py-3">b</th>
                <th className="px-4 py-3">c (Raíz aprox)</th>
                <th className="px-4 py-3">f(c)</th>
              </>
            ) : method === 'secant' ? (
              <>
                <th className="px-4 py-3">x(i-1)</th>
                <th className="px-4 py-3">x(i)</th>
                <th className="px-4 py-3">f(xi)</th>
                <th className="px-4 py-3">x(i+1)</th>
              </>
            ) : (
              <>
                <th className="px-4 py-3">x(i)</th>
                {method === 'newton' && <th className="px-4 py-3">f'(xi)</th>}
                <th className="px-4 py-3">f(xi)</th>
                <th className="px-4 py-3">x(i+1)</th>
              </>
            )}
            <th className="px-4 py-3">Error (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {iterations.map((it) => (
            <tr key={it.i} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2 font-mono">{it.i}</td>
              {isClosed ? (
                <>
                  <td className="px-4 py-2 font-mono text-white/70">{it.a?.toFixed(6)}</td>
                  <td className="px-4 py-2 font-mono text-white/70">{it.b?.toFixed(6)}</td>
                  <td className="px-4 py-2 font-mono text-primary">{it.c?.toFixed(6)}</td>
                  <td className="px-4 py-2 font-mono text-white/70">{it.fc?.toExponential(4)}</td>
                </>
              ) : method === 'secant' ? (
                <>
                  <td className="px-4 py-2 font-mono text-white/70">{it.xi_minus_1?.toFixed(6)}</td>
                  <td className="px-4 py-2 font-mono text-white/70">{it.xi?.toFixed(6)}</td>
                  <td className="px-4 py-2 font-mono text-white/70">{it.fxi?.toExponential(4)}</td>
                  <td className="px-4 py-2 font-mono text-primary">{it.xNext?.toFixed(6)}</td>
                </>
              ) : (
                <>
                  <td className="px-4 py-2 font-mono text-white/70">{it.xi?.toFixed(6)}</td>
                  {method === 'newton' && <td className="px-4 py-2 font-mono text-white/70">{it.dfxi?.toFixed(4)}</td>}
                  <td className="px-4 py-2 font-mono text-white/70">{it.fxi?.toExponential(4)}</td>
                  <td className="px-4 py-2 font-mono text-primary">{it.xNext?.toFixed(6)}</td>
                </>
              )}
              <td className="px-4 py-2 font-mono text-secondary">
                {it.i === 0 ? "—" : `${it.error.toFixed(4)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
