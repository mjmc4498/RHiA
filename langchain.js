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
