// ---- helpers to read current UI values ----
function getVal(id){
  const el = document.getElementById(id);
  if(!el) return NaN;
  return parseFloat(el.value);
}

function currentParams(){
  return {
    p1: getVal("p1Slider"),
    p2: getVal("p2Slider"),
    alpha: getVal("alphaSlider"),
    power: getVal("powerSlider"),
    n1: Math.max(1, Math.floor(getVal("n1Number") || 0)),
    n2: Math.max(1, Math.floor(getVal("n2Number") || 0))
  };
}

// helper to locate delta value from possible element ids (backwards compatible)
function currentDelta(){
  const tryIds = ["deltaSlider", "delta", "deltanum", "deltaNumber"];
  for(const id of tryIds){
    const v = getVal(id);
    if(!isNaN(v)) return v;
  }
  return 0;
}

// Inverse normal (Abramowitz–Stegun)
function inverseNormal(p){
  const a1=-39.6968302866538,a2=220.946098424521,a3=-275.928510446969,a4=138.357751867269,a5=-30.6647980661472,a6=2.50662827745924;
  const b1=-54.4760987982241,b2=161.585836858041,b3=-155.698979859887,b4=66.8013118877197,b5=-13.2806815528857;
  const c1=-0.00778489400243029,c2=-0.322396458041136,c3=-2.40075827716184,c4=-2.54973253934373,c5=4.37466414146497,c6=2.93816398269878;
  const d1=0.00778469570904146,d2=0.32246712907004,d3=2.445134137143,d4=3.75440866190742;
  if(p<=0||p>=1) return NaN; let q,r;
  if(p<0.02425){ q=Math.sqrt(-2*Math.log(p)); return -(((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6)/((((d1*q+d2)*q+d3)*q+d4)*q+1); }
  if(p>1-0.02425){ q=Math.sqrt(-2*Math.log(1-p)); return (((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6)/((((d1*q+d2)*q+d3)*q+d4)*q+1); }
  q=p-0.5; r=q*q;
  return (((((a1*r+a2)*r+a3)*r+a4)*r+a5)*r+a6)*q/(((((b1*r+b2)*r+b3)*r+b4)*r+b5)*r+1);
}

// Approximate error function and normal CDF for p-value calculation
function erf(x){
  const sign = Math.sign(x) || 1;
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const t = 1/(1 + p*Math.abs(x));
  const y = 1 - (((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t)*Math.exp(-x*x);
  return sign * y;
}
function normCdf(x){ return 0.5 * (1 + erf(x / Math.SQRT2)); }

// ---- CI calculators (Wald; simple & transparent for class) ----
// Single-proportion 95% CI using normal approx: p ± z * sqrt(p(1-p)/n)
function ciProp(p, n, z){
  const se = Math.sqrt(Math.max(0, p*(1-p)/n));
  return { lo: p - z*se, hi: p + z*se, se };
}

// Difference CI: (p2-p1) ± z * sqrt(p1(1-p1)/n1 + p2(1-p2)/n2)
function ciDiff(p1, n1, p2, n2, z){
  const se = Math.sqrt(Math.max(0, p1*(1-p1)/n1 + p2*(1-p2)/n2));
  const d  = p2 - p1;
  return { d, lo: d - z*se, hi: d + z*se, se };
}

function pct(x){ return (x*100).toFixed(1) + "%"; }

// ---- rendering ----
function renderCharts(){
  const {p1, p2, alpha, n1, n2} = currentParams();
  const delta = currentDelta();
  if ([p1,p2,alpha,n1,n2].some(x => isNaN(x))) return;

  const z = inverseNormal(1 - alpha/2); // two-sided 95% when alpha=0.05

  // 1) Proportions with 95% CIs
  const c1 = ciProp(p1, n1, z);
  const c2 = ciProp(p2, n2, z);

  const propData = [{
    type: "bar",
    x: ["P₁ (control)", "P₂ (variant)"],
    y: [p1, p2],
    error_y: {
      type: "data",
      array: [c1.hi - p1, c2.hi - p2],     // +err
      arrayminus: [p1 - c1.lo, p2 - c2.lo],// -err
      visible: true
    },
    marker: { line: { width: 1 } },
    name: "Proportion"
  }];

  const propLayout = {
    title: `Proportions with 95% CI (n₁=${n1.toLocaleString()}, n₂=${n2.toLocaleString()}, α=${alpha.toFixed(2)})`,
    yaxis: { title: "Proportion", range: [0, Math.max(c1.hi, c2.hi) * 1.15] },
    margin: { t: 60, l: 60, r: 20, b: 60 },
    showlegend: false
  };

  Plotly.react("propChart", propData, propLayout, {displayModeBar:false});

  // 2) Difference with 95% CI
  const cd = ciDiff(p1, n1, p2, n2, z);
  const diffData = [{
    type: "bar",
    x: ["Δ = P₂ − P₁"],
    y: [cd.d],
    error_y: {
      type: "data",
      array: [cd.hi - cd.d],
      arrayminus: [cd.d - cd.lo],
      visible: true
    },
    marker: { line: { width: 1 } },
    name: "Difference"
  }];

  const maxAbs = Math.max(Math.abs(cd.hi), Math.abs(cd.lo), Math.abs(cd.d), Math.abs(delta));
  const pad = Math.max(0.01, maxAbs * 0.25);

  // z-test against hypothesized delta (unpooled/Wald)
  const se_unpooled = Math.sqrt(Math.max(0, p1*(1-p1)/n1 + p2*(1-p2)/n2));
  const ztest = se_unpooled === 0 ? NaN : (p2 - p1 - delta) / se_unpooled;
  const pval = Number.isFinite(ztest) ? 2 * (1 - normCdf(Math.abs(ztest))) : NaN;

  const diffLayout = {
    title: `Difference with 95% CI (H₀: Δ = ${ (delta*100).toFixed(2) } pct.pts)`,
    yaxis: { title: "Δ (proportion points)", range: [-(maxAbs+pad), (maxAbs+pad)] },
    shapes: [{
      // horizontal reference at hypothesized delta
      type: "line", x0: -0.5, x1: 1.5, y0: delta, y1: delta, line: { width: 1, dash: "dot" }
    }],
    margin: { t: 60, l: 60, r: 20, b: 60 },
    showlegend: false
  };

  Plotly.react("diffChart", diffData, diffLayout, {displayModeBar:false});
}

// ---- wire up events (reuse your existing listeners; just call renderCharts) ----
function attachCiListeners(){
  const ids = [
    "p1Slider","p1Number","p2Slider","p2Number",
    "alphaSlider","alphaNumber","n1Number","n2Number",
    // include delta controls if present
    "deltaSlider","deltaNumber","delta","deltanum"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      // keep your existing sync logic & displays if you have them
      if (typeof syncInputs === "function") syncInputs();
      if (typeof updateDisplays === "function") updateDisplays();
      renderCharts();
    });
  });
}

// initialize on first load
document.addEventListener("DOMContentLoaded", () => {
  attachCiListeners();
  renderCharts();
});
