// Shared notation for the lesson. Numeric coefficients always come from the solver.
export function texNumber(v) {
  if (Math.abs(v) < 1e-10) return '0';
  return Number(v.toPrecision(5)).toString().replace(/e([+-]?\d+)/, '\\cdot10^{$1}');
}
export const texMatrix = a => `\\begin{bmatrix}${a.map(row => row.map(texNumber).join('&')).join('\\\\')}\\end{bmatrix}`;
export const texVector = a => texMatrix(a.map(x => [x]));
export const symbolVector = ids => `\\begin{bmatrix}${ids.map(i => `u_{${i + 1}}`).join('\\\\')}\\end{bmatrix}`;
export const signedNumber = v => v < 0 ? `(${texNumber(v)})` : texNumber(v);

// Keep substituted zero terms visible: the student can see what was eliminated.
export function rowTerms(values, ids = values.map((_, i) => i), prescribed = new Map(), boxed = true) {
  return values.flatMap((value, a) => {
    if (value === 0) return [];
    const j = ids[a];
    const displacement = prescribed.has(j)
      ? boxed ? `\\underbrace{\\boxed{${texNumber(prescribed.get(j))}}}_{u_{${j + 1}}}` : signedNumber(prescribed.get(j))
      : `u_{${j + 1}}`;
    return `${value < 0 ? '-' : '+'}${texNumber(Math.abs(value))}${prescribed.has(j) ? '\\cdot ' : ''}${displacement}`;
  }).join('').replace(/^\+/, '') || '0';
}

export function nodeContributions(assembly, node) {
  return assembly.elements.filter(e => e.nodes.includes(node)).map(e => {
    const local = e.nodes.indexOf(node);
    return { element: e, local, coefficients: e.k[local], load: e.load[local] };
  });
}
