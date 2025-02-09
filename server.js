import express from "express";
import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const app = express();
const port = 3000;

// Add JSON body parser
app.use(express.json());

// Get the equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Puppeteer manager class
class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.queue = [];
    this.isProcessing = false;
    this.initialize();
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch();
      this.page = await this.browser.newPage();
      console.log("Browser initialized");
    } catch (error) {
      console.error("Browser initialization failed:", error);
      // Retry after 5 seconds
      setTimeout(() => this.initialize(), 5000);
    }

    // Watch for disconnection
    this.browser.on("disconnected", () => {
      console.log("Browser disconnected, reinitializing...");
      this.initialize();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const task = this.queue.shift();
    try {
      await task();
    } catch (error) {
      console.error("Task failed:", error);
    }

    this.isProcessing = false;
    this.processQueue(); // Process next item if any
  }

  async addToQueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task(this.page);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
}

const browserManager = new BrowserManager();

// Create Vite server in middleware mode
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});

// Use vite's connect instance as middleware
app.use(vite.middlewares);

// HTML template
const template = `
<!DOCTYPE html>
<html>
  <head>
    <title>Vue SSR Example</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body style="margin:0;padding:0;">
    <!--vue-ssr-outlet-->
  </body>
</html>
`;

async function renderView(props = {}) {
  const MyView = await vite.ssrLoadModule("/src/views/MyView.vue");
  const vueApp = createSSRApp(MyView.default, props);
  const html = await renderToString(vueApp);
  return template.replace("<!--vue-ssr-outlet-->", html);
}

app.get("/my-view", async (req, res) => {
  try {
    const props = {
      username: req.query.username || "default",
      itemCount: parseInt(req.query.itemCount) || 0,
    };
    const html = await renderView(props);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    vite.ssrFixStacktrace(error);
    console.error(error);
    res.status(500).send(error.stack);
  }
});

app.post("/my-view/screenshot", async (req, res) => {
  try {
    const {
      props = {},
      browserWidth = 600, // Default browser width
      browserHeight = 2000, // Tall default to accommodate most content
    } = req.body;

    const html = await renderView(props);

    const screenshot = await browserManager.addToQueue(async (page) => {
      // Set browser viewport
      await page.setViewport({
        width: browserWidth,
        height: browserHeight,
      });

      await page.setContent(html);
      await page.waitForTimeout(1000);

      // Find the content wrapper and get its actual dimensions
      const element = await page.$("#view-content");
      const box = await element.boundingBox();

      if (!box) {
        throw new Error("Could not detect component boundaries");
      }

      // Take screenshot of just the content area
      return page.screenshot({
        type: "png",
        clip: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
        omitBackground: true,
      });
    });

    res.setHeader("Content-Type", "image/png");
    res.send(screenshot);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Serve files from the public directory at the root URL path
app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
