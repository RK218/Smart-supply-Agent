/**
 * api.js — All HTTP calls to the FastAPI backend (http://localhost:8000)
 * The "proxy": "http://localhost:8000" in package.json means you can use
 * relative paths like "/api/..." and they automatically hit the backend.
 */

const BASE = ""; // proxy handles routing to http://localhost:8000

export async function fetchAllData() {
  const [smart, base, metrics, training] = await Promise.all([
    fetch(`${BASE}/api/results/smart`).then(r => {
      if (!r.ok) throw new Error(`smart: ${r.status}`);
      return r.json();
    }),
    fetch(`${BASE}/api/results/baseline`).then(r => {
      if (!r.ok) throw new Error(`baseline: ${r.status}`);
      return r.json();
    }),
    fetch(`${BASE}/api/results/metrics`).then(r => {
      if (!r.ok) throw new Error(`metrics: ${r.status}`);
      return r.json();
    }),
    fetch(`${BASE}/api/results/training`).then(r => {
      if (!r.ok) throw new Error(`training: ${r.status}`);
      return r.json();
    }),
  ]);
  return { smart, base, metrics, training };
}

export async function runSimulation(store, item) {
  const r = await fetch(`${BASE}/api/simulate?store=${store}&item=${item}`, {
    method: "POST",
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || "Simulation failed");
  }
  return r.json();
}

export async function checkHealth() {
  const r = await fetch(`${BASE}/health`);
  return r.json();
}

export default { fetchAllData, runSimulation, checkHealth };
