import express from "express";
import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";
import { createApp } from "vue";

const app = express();
const port = 3000;

// Add JSON body parser
app.use(express.json());

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

// Add this utility function before the route handlers
function parseQueryStringProps(query) {
  const props = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("props-")) {
      const propKey = key.replace("props-", "");
      // Try to parse as JSON if it's a complex value
      try {
        props[propKey] = JSON.parse(value);
      } catch {
        props[propKey] = value;
      }
    }
  }
  return props;
}

async function handleRender(component, type, props, view) {
  // Dynamically import the component
  const componentPath = `/src/views/${component}.vue`;
  const { default: Component } = await vite.ssrLoadModule(componentPath);

  // Create a Vue app instance
  const app = createApp(Component, props);

  // Render the app to HTML
  const html = await renderToString(app);

  // Wrap in full HTML document
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${component}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { margin: 0; }
          #app { width: ${view.width}px; height: ${view.height}px; }
        </style>
      </head>
      <body>
        <div id="app">${html}</div>
      </body>
    </html>
  `;

  return { fullHtml };
}

// Replace the existing POST route with these two routes
app.get("/render", async (req, res) => {
  try {
    const { component = "MyView", type = "www" } = req.query;
    const props = parseQueryStringProps(req.query);
    const view = {
      width: parseInt(req.query["view-width"] || 800),
      height: parseInt(req.query["view-height"] || 600),
      padding: parseInt(req.query["view-padding"] || 0),
      timeout: parseInt(req.query["view-timeout"] || 300),
    };

    const { fullHtml } = await handleRender(component, type, props, view);

    if (type === "www") {
      res.setHeader("Content-Type", "text/html");
      return res.send(fullHtml);
    }

    if (type === "png") {
      const screenshot = await browserManager.addToQueue(async (page) => {
        await page.setViewport({
          width: Math.max(view.width, 800),
          height: Math.max(view.height, 600),
        });
        await page.setContent(fullHtml);
        await page.waitForNetworkIdle();

        // Wait for any animations to complete (adjust timeout as needed)
        await page.waitForTimeout(300);

        // Wait for any dynamic content to stabilize
        await page.waitForFunction(() => {
          const app = document.getElementById("app");
          const rect = app.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        const dimensions = await page.evaluate(() => {
          const app = document.getElementById("app");
          const rect = app.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        });

        return page.screenshot({
          type: "png",
          clip: dimensions,
        });
      });

      res.setHeader("Content-Type", "image/png");
      return res.send(screenshot);
    }

    throw new Error(`Unsupported render type: ${type}`);
  } catch (error) {
    console.error("Render error:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

app.post("/render", async (req, res) => {
  try {
    const { component = "MyView", type = "www" } = req.query;
    const { props = {}, view = { width: 800, height: 600 } } = req.body;

    const { fullHtml } = await handleRender(component, type, props, view);

    if (type === "www") {
      res.setHeader("Content-Type", "text/html");
      return res.send(fullHtml);
    }

    if (type === "png") {
      const screenshot = await browserManager.addToQueue(async (page) => {
        await page.setViewport({
          width: Math.max(view.width, 800),
          height: Math.max(view.height, 600),
        });
        await page.setContent(fullHtml);
        await page.waitForNetworkIdle();

        // Wait for any animations to complete (adjust timeout as needed)
        await page.waitForTimeout(300);

        // Wait for any dynamic content to stabilize
        await page.waitForFunction(() => {
          const app = document.getElementById("app");
          const rect = app.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        const dimensions = await page.evaluate(() => {
          const app = document.getElementById("app");
          const rect = app.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        });

        return page.screenshot({
          type: "png",
          clip: dimensions,
        });
      });

      res.setHeader("Content-Type", "image/png");
      return res.send(screenshot);
    }

    throw new Error(`Unsupported render type: ${type}`);
  } catch (error) {
    console.error("Render error:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
