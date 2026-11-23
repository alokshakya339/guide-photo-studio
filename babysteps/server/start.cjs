// CommonJS start file for hosts whose Node runner loads apps with require() (e.g. Hostinger / LiteSpeed / Passenger).
// It simply loads the real (ES module) server. Use this as the "Entry file": server/start.cjs
import('./src/index.js').catch((err) => {
  console.error('Failed to start BabySteps server:', err);
  process.exit(1);
});
