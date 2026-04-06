import { evaluate, derivative } from 'mathjs';

export type MethodType = 'bisection' | 'falsePosition' | 'newton' | 'secant' | 'fixedPoint';

export interface IterationState {
  i: number;
  // Bisection & False Position
  a?: number;
  b?: number;
  c?: number;
  fa?: number;
  fb?: number;
  fc?: number;
  
  // History tracking for visualization
  a_prev?: number;
  b_prev?: number;
  
  // Newton, Secant, Fixed Point
  xi?: number;
  xi_minus_1?: number; // for secant
  xi_prev?: number; // track previous xi
  xi_minus_1_prev?: number;
  xNext?: number;
  fxi?: number;
  fxi_minus_1?: number; // for secant
  dfxi?: number; // for newton
  gxi?: number; // for fixed point

  error: number;
  diverging?: boolean;
  message?: string;
}

export interface MathParams {
  f: string;
  g?: string; // used for fixed point
  method: MethodType;
  a?: number;
  b?: number;
  x0?: number;
  x1?: number;
  tolerance: number;
}

function safeEvaluate(expr: string, x: number): number {
  try {
    return evaluate(expr, { x });
  } catch (e) {
    throw new Error(`Error al evaluar la función: ${expr}`);
  }
}

export function calculateNextStep(
  params: MathParams,
  history: IterationState[]
): IterationState {
  const i = history.length;
  const last = i > 0 ? history[i - 1] : null;

  switch (params.method) {
    case 'bisection': {
      let a = i === 0 ? params.a! : last!.a!;
      let b = i === 0 ? params.b! : last!.b!;
      const a_prev = last?.a;
      const b_prev = last?.b;
      
      if (i > 0) {
        const fa = safeEvaluate(params.f, last!.a!);
        const fc = safeEvaluate(params.f, last!.c!);
        if (fa * fc < 0) {
          b = last!.c!;
        } else {
          a = last!.c!;
        }
      }

      const c = (a + b) / 2;
      const fa = safeEvaluate(params.f, a);
      const fb = safeEvaluate(params.f, b);
      const fc = safeEvaluate(params.f, c);
      
      const error = i === 0 ? 100 : Math.abs((c - last!.c!) / c) * 100;

      return { i, a, b, c, fa, fb, fc, a_prev, b_prev, error };
    }

    case 'falsePosition': {
      let a = i === 0 ? params.a! : last!.a!;
      let b = i === 0 ? params.b! : last!.b!;
      const a_prev = last?.a;
      const b_prev = last?.b;
      
      if (i > 0) {
        const fa = safeEvaluate(params.f, last!.a!);
        const fc = safeEvaluate(params.f, last!.c!);
        if (fa * fc < 0) {
          b = last!.c!;
        } else {
          a = last!.c!;
        }
      }

      const fa = safeEvaluate(params.f, a);
      const fb = safeEvaluate(params.f, b);
      const c = b - (fb * (a - b)) / (fa - fb);
      const fc = safeEvaluate(params.f, c);
      
      const error = i === 0 ? 100 : Math.abs((c - last!.c!) / c) * 100;

      return { i, a, b, c, fa, fb, fc, a_prev, b_prev, error };
    }

    case 'newton': {
      let xi = i === 0 ? params.x0! : last!.xNext!;
      const xi_prev = last?.xi;
      const fxi = safeEvaluate(params.f, xi);
      
      let dfxi;
      try {
        dfxi = derivative(params.f, 'x').evaluate({ x: xi });
      } catch (e) {
        throw new Error(`Error al derivar la función: ${params.f}`);
      }

      if (Math.abs(dfxi) < 1e-10) {
        return { i, xi, xi_prev, fxi, dfxi, error: i === 0 ? 100 : last!.error, diverging: true, message: "Derivada cero. El método diverge." };
      }

      const xNext = xi - (fxi / dfxi);
      const error = i === 0 ? 100 : Math.abs((xNext - xi) / xNext) * 100;

      return { i, xi, xi_prev, fxi, dfxi, xNext, error };
    }

    case 'secant': {
      let xi = i === 0 ? params.x1! : last!.xNext!;
      let xi_minus_1 = i === 0 ? params.x0! : last!.xi!;
      const xi_prev = last?.xi;
      const xi_minus_1_prev = last?.xi_minus_1;
      
      const fxi = safeEvaluate(params.f, xi);
      const fxi_minus_1 = safeEvaluate(params.f, xi_minus_1);
      
      const denominator = fxi_minus_1 - fxi;
      if (Math.abs(denominator) < 1e-10) {
         return { i, xi, xi_minus_1, xi_prev, xi_minus_1_prev, fxi, fxi_minus_1, error: i===0?100:last!.error, diverging: true, message: "División por cero. El método diverge." };
      }

      const xNext = xi - (fxi * (xi_minus_1 - xi)) / denominator;
      const error = i === 0 ? 100 : Math.abs((xNext - xi) / xNext) * 100;

      return { i, xi, xi_minus_1, xi_prev, xi_minus_1_prev, fxi, fxi_minus_1, xNext, error };
    }

    case 'fixedPoint': {
      if (!params.g) throw new Error("Falta la función g(x)");
      let xi = i === 0 ? params.x0! : last!.xNext!;
      const xi_prev = last?.xi;
      
      const gxi = safeEvaluate(params.g, xi);
      const fxi = safeEvaluate(params.f, xi); // mainly to see the actual root
      const xNext = gxi;
      
      const error = i === 0 ? 100 : Math.abs((xNext - xi) / xNext) * 100;
      
      // Divergence check
      const diverging = i > 5 && error > last!.error && error > 100;

      return { i, xi, xi_prev, gxi, fxi, xNext, error, diverging, message: diverging ? "El método parece estar divergiendo." : undefined };
    }
    
    default:
      throw new Error("Método desconocido");
  }
}
