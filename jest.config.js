export default {
  testEnvironment: "node",
  transform: {},
  testMatch: [
    "**/tests/unit/**/*.test.js",
    "**/tests/integration/**/*.test.js"
  ],
  moduleFileExtensions: ["js", "json"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};