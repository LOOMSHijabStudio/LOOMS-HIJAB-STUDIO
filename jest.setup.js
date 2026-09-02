// Jest setup file
// This file runs before all tests

// Set up environment variables for testing if not already set
if (!process.env.TEST_API_URL) {
  process.env.TEST_API_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Suppress console errors during tests (optional)
// Uncomment if you want to reduce noise in test output
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (
//       typeof args[0] === "string" &&
//       args[0].includes("Warning: useLayoutEffect")
//     ) {
//       return;
//     }
//     originalError.call(console, ...args);
//   };
// });
