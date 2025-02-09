import express from "express";
import { renderToString } from "@vue/server-renderer";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";
import { createApp } from "vue";

const app = express();
const port = 3000;
app.use(express.json());

const ViewportDefaults = {
  width: 800,
  height: 0,
  padding: 0,
  timeout: 1000,
  backgroundColor: "transparent",
};

class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.queue = [];
    this.isProcessing = false;
    this.initialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      console.log("Starting browser initialization...");
      this.browser = await puppeteer.launch();
      this.page = await this.browser.newPage();
      this.initialized = true;
      console.log("Browser and page fully initialized");
    } catch (error) {
      console.error("Browser initialization failed:", error);
      setTimeout(() => this.initialize(), 5000);
    }

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
    this.processQueue();
  }

  async addToQueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task(this.page));
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
}

const browserManager = new BrowserManager();
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

function parseQueryStringProps(query) {
  const props = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("props-")) {
      const propKey = key.replace("props-", "");
      try {
        props[propKey] = JSON.parse(value);
      } catch {
        props[propKey] = value;
      }
    }
  }
  return props;
}

function getHandler(req) {
  return {
    component: req.query.component,
    type: req.query.type,
    props: parseQueryStringProps(req.query),
    viewport: {
      width: req.query["viewport-width"],
      height: req.query["viewport-height"],
      padding: req.query["viewport-padding"],
      timeout: req.query["viewport-timeout"],
      backgroundColor: req.query["viewport-backgroundColor"],
    },
  };
}

function postHandler(req) {
  return {
    component: req.body.component,
    type: req.body.type,
    props: req.body.props || {},
    viewport: req.body.viewport || {},
  };
}

async function sharedHandler({
  component = "MyView",
  type = "www",
  props,
  viewport,
}) {
  const finalViewport = {
    width: parseInt(viewport.width) || ViewportDefaults.width,
    height: parseInt(viewport.height) || ViewportDefaults.height,
    padding: parseInt(viewport.padding) || ViewportDefaults.padding,
    timeout: parseFloat(viewport.timeout) || ViewportDefaults.timeout,
    backgroundColor:
      viewport.backgroundColor || ViewportDefaults.backgroundColor,
  };

  const componentPath = `/src/views/${component}.vue`;
  const { default: Component } = await vite.ssrLoadModule(componentPath);
  const { default: Viewport } = await vite.ssrLoadModule(
    "/src/components/Viewport.vue"
  );

  const app = createApp(
    {
      components: { Viewport, Component },
      props: { componentProps: Object, viewportProps: Object },
      template: `
      <Viewport 
        :width="viewportProps.width"
        :height="viewportProps.height"
        :padding="viewportProps.padding"
        :backgroundColor="viewportProps.backgroundColor"
      >
        <Component v-bind="componentProps" />
      </Viewport>
    `,
    },
    { componentProps: props, viewportProps: finalViewport }
  );

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${component}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <base href="http://localhost:${port}/" />
      </head>
      <body><div>${await renderToString(app)}</div></body>
    </html>
  `;

  return { fullHtml, type, viewport: finalViewport };
}

async function renderHandler(req, res) {
  try {
    const requestData =
      req.method === "POST" ? postHandler(req) : getHandler(req);
    const { fullHtml, type, viewport } = await sharedHandler(requestData);
    if (type === "www") {
      res.setHeader("Content-Type", "text/html");
      return res.send(fullHtml);
    }
    if (type === "png") {
      console.log("Starting PNG screenshot process...");
      const screenshot = await browserManager.addToQueue(async (page) => {
        console.log("Setting viewport...");
        await page.setViewport({
          width: viewport.width,
          height: 10000,
        });
        console.log("Setting page content...");
        await page.setContent(fullHtml, {
          waitUntil: ["load", "networkidle0"],
        });

        await page.waitForTimeout(viewport.timeout);

        // Get the actual height of the viewport content
        const viewportElement = await page.$("#main-screenshot-viewport");
        const boundingBox = await viewportElement.boundingBox();

        // Reset viewport with actual height
        await page.setViewport({
          width: viewport.width,
          height: Math.ceil(boundingBox.height),
        });

        console.log("Taking screenshot...");
        return page.screenshot({
          type: "png",
          clip: {
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height,
          },
          omitBackground: viewport.backgroundColor === "transparent",
        });
      });
      console.log("Screenshot captured, sending response...");
      res.setHeader("Content-Type", "image/png");
      return res.send(screenshot);
    }
    throw new Error(`Unsupported render type: ${type}`);
  } catch (error) {
    console.error("Render error:", error);
    res.status(500).json({ error: error.message });
  }
}

app.get("/render", renderHandler);
app.post("/render", renderHandler);

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
