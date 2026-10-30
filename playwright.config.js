// Tests automatiques : un petit serveur sert le site, puis Chromium joue aux jeux
// comme sur un téléphone. Lancer : npm test
const { defineConfig, devices } = require("@playwright/test");

const PORT = 8123;
module.exports = defineConfig({
  testDir: "tests",
  timeout: 60000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    // Les jeux sautent leurs animations dans ce mode : les tests vont plus vite et sans attente
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "telephone", use: { browserName: "chromium" } }],
  webServer: { command: `node tests/serveur.js ${PORT}`, port: PORT, reuseExistingServer: !process.env.CI }
});
