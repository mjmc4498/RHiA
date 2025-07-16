// =================================================================================
//  Arquitectura Inspirada en LangChain (Retriever y Chain)
// =================================================================================

// --- El Retriever ---
// Su único trabajo es obtener documentos relevantes desde una fuente (en este caso, un VectorStore).
class Retriever {
    constructor(vectorStore) {
        this.vectorStore = vectorStore;
    }

    getRelevantDocuments(query) {
        return this.vectorStore.similaritySearch(query, 3);
    }
}

// --- La Cadena de Recuperación ---
// Orquesta el flujo: toma una pregunta, usa el Retriever para obtener documentos
// y luego formatea esos documentos en una respuesta final.
class RetrievalChain {
    constructor(retriever) {
        this.retriever = retriever;
    }

    // El método principal de la cadena.
    call(input) {
        const query = input.query;
        if (!query) {
            throw new Error("Se requiere una 'query' en el input.");
        }

        // 1. Usar el Retriever para obtener documentos
        const relevantDocs = this.retriever.getRelevantDocuments(query);

        // 2. Formatear la respuesta
        if (relevantDocs.length === 0) {
            return {
                answer: 'No he encontrado información relevante en los documentos para responder a tu pregunta.',
                sources: [],
            };
        }

        const combinedText = relevantDocs.map(doc => doc.pageContent).join("\n\n---\n\n");
        const sources = [...new Set(relevantDocs.map(doc => doc.metadata.source))];

        return {
            answer: combinedText,
            sources: sources,
        };
    }
}

// --- La Cadena Conversacional con LLM ---
class ConversationalRetrievalChain {
    constructor(retriever, llm) {
        this.retriever = retriever;
        this.llm = llm;
    }

    // Construir el prompt para el LLM
    _createPrompt(context, query) {
        return `
            Eres un asistente de Recursos Humanos amable y servicial.
            Basándote únicamente en el siguiente contexto extraído de los documentos de la empresa, responde a la pregunta del usuario.
            Si la respuesta no se encuentra en el contexto, di amablemente que no tienes la información.
            No inventes información.

            Contexto:
            ---
            ${context}
            ---

            Pregunta del usuario:
            ${query}

            Respuesta:
        `;
    }

    // El método principal de la cadena
    async call(input, streamCallback) {
        const { query } = input;
        if (!query) throw new Error("Se requiere una 'query'.");

        // 1. Obtener contexto con el Retriever
        const relevantDocs = this.retriever.getRelevantDocuments(query);
        if (relevantDocs.length === 0) {
            return {
                answer: 'No he encontrado información relevante en los documentos para responder a tu pregunta.',
                sources: [],
            };
        }

        const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");
        const sources = [...new Set(relevantDocs.map(doc => doc.metadata.source))];

        // 2. Construir el prompt y generar respuesta con el LLM
        const prompt = this._createPrompt(context, query);
        const answer = await this.llm.generate(prompt, streamCallback);

        return { answer, sources };
    }
}

export { Retriever, ConversationalRetrievalChain };
