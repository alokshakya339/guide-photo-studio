// CommonJS start file for hosts whose Node runner loads apps with require() (Hostinger / LiteSpeed / Passenger).
// It simply loads the real (ES module) server. Use this as the "Entry file": server/start.cjs
import('./src/index.js').catch((err) => {
  console.error('Failed to start Guide Photo Studio server:', err);
  process.exit(1);
});
