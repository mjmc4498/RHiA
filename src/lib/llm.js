// =================================================================================
//  Módulo del LLM (Wrapper para WebLLM)
// =================================================================================

import { CreateWebWorkerMLCEngine } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2/dist/web-llm.js";

const LLM = {
    engine: null,
    selectedModel: "Llama-2-7b-chat-hf-q4f32_1",

    async init(progressCallback) {
        const initProgressCallback = (report) => {
            progressCallback(report.text, report.progress * 100);
        };

        try {
            this.engine = await CreateWebWorkerMLCEngine(
                new Worker(
                    new URL('./worker.js', import.meta.url),
                    { type: 'module' }
                ),
                this.selectedModel,
                { initProgressCallback: initProgressCallback }
            );
            return true;
        } catch (e) {
            console.error("Error al inicializar el motor de WebLLM:", e);
            progressCallback("Error: No se pudo inicializar el motor de IA. Puede que tu navegador no sea compatible con WebGPU.", 0);
            return false;
        }
    },

    async generate(prompt, streamCallback) {
        if (!this.engine) {
            throw new Error("El motor del LLM no ha sido inicializado.");
        }

        const completion = await this.engine.chat.completions.create({
            stream: true,
            messages: [{ role: "user", content: prompt }],
        });

        let fullResponse = "";
        for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
                fullResponse += delta;
                streamCallback(delta);
            }
        }
        return fullResponse;
    }
};

export default LLM;
