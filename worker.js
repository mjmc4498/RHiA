// worker.js
import { WebWorkerMLCEngineHandler } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2/dist/web-llm.js";

// Adjuntar el manejador al worker.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = msg => {
  handler.onmessage(msg);
};
