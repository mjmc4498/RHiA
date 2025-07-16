// =================================================================================
//  Arquitectura Inspirada en LangChain (Retriever y Chain)
// =================================================================================

// --- El Retriever ---
class Retriever {
    constructor(vectorStore) {
        this.vectorStore = vectorStore;
    }

    getRelevantDocuments(query) {
        return this.vectorStore.similaritySearch(query, 3);
    }
}

// --- La Cadena Conversacional con LLM ---
class ConversationalRetrievalChain {
    constructor(retriever, llm) {
        this.retriever = retriever;
        this.llm = llm;
    }

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

    async call(input, streamCallback) {
        const { query } = input;
        if (!query) throw new Error("Se requiere una 'query'.");

        const relevantDocs = this.retriever.getRelevantDocuments(query);
        if (relevantDocs.length === 0) {
            return {
                answer: 'No he encontrado información relevante en los documentos para responder a tu pregunta.',
                sources: [],
            };
        }

        const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");
        const sources = [...new Set(relevantDocs.map(doc => doc.metadata.source))];

        const prompt = this._createPrompt(context, query);
        const answer = await this.llm.generate(prompt, streamCallback);

        return { answer, sources };
    }
}

export { Retriever, ConversationalRetrievalChain };
