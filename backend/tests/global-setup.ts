// This file runs in the MAIN Vitest process before any test worker is created.
// Setting process.env here does NOT propagate to worker threads; each worker
// gets its own process.env. Use this file only for one-off global preparations
// such as creating the test database.
//
// To inject env overrides into workers, we use the `env` key in vitest.config.ts.
// This file is kept as a placeholder for future global setup tasks (e.g. running
// migrations before the test suite starts, or starting a test server).

export default function globalSetup() {
  // No global side effects needed at this stage. Worker-level env overrides
  // are handled via vitest.config.ts `test.env`.
}
