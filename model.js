// =================================================================================
//  MODELO (Manejo de Datos y Estado)
// =================================================================================

const Model = {
    state: {
        modelReady: false,
        knowledgeBase: [], // Almacena los documentos procesados: { fileName, chunks, embeddings }
        models: {
            extractor: null,
            qaModel: null,
        },
        stats: {
            questions: 0,
            useful: 0,
            notUseful: 0,
        },
    },

    // --- INICIALIZACIÓN DE MODELOS DE IA ---
    async initializeModels(progressCallback) {
        try {
            const modelsToLoad = [
                { name: 'sentence-transformers/all-MiniLM-L6-v2', type: 'extractor', label: 'Embeddings' },
                { name: 'distilbert-base-cased-distilled-squad', type: 'qaModel', label: 'Question-Answering' },
            ];

            for (const modelInfo of modelsToLoad) {
                progressCallback({ status: `Cargando modelo de ${modelInfo.label}...` });
                this.state.models[modelInfo.type] = await AutoModel.load(modelInfo.name, {
                    progress_callback: (progress) => {
                        progressCallback({ progress: progress.progress });
                    },
                });
            }

            this.state.modelReady = true;
            return { success: true, message: '¡Modelos cargados! Sube documentos para empezar.' };
        } catch (error) {
            console.error('Error loading models:', error);
            return { success: false, message: 'Error fatal al cargar los modelos de IA.' };
        }
    },

    // --- PROCESAMIENTO DE ARCHIVOS ---
    async processAndEmbedFile(file) {
        try {
            let text = '';
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (fileExtension === 'pdf') {
                text = await this.FileProcessors.extractPdfText(file);
            } else if (fileExtension === 'docx') {
                text = await this.FileProcessors.extractDocxText(file);
            } else if (fileExtension === 'xlsx') {
                text = await this.FileProcessors.extractXlsxText(file);
            } else {
                console.warn(`Formato no soportado: ${file.name}`);
                return null;
            }

            const chunks = this.TextUtils.chunkText(text, 512, 128);
            const embeddings = await this.AI.generateEmbeddings(chunks);

            const newDocument = {
                fileName: file.name,
                chunks: chunks,
                embeddings: embeddings,
            };
            this.state.knowledgeBase.push(newDocument);
            return newDocument;

        } catch (error) {
            console.error(`Error procesando el archivo ${file.name}:`, error);
            return null;
        }
    },

    FileProcessors: {
        extractPdfText: async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ');
            }
            return text;
        },
        extractDocxText: async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            const { value } = await mammoth.extractRawText({ arrayBuffer });
            return value;
        },
        extractXlsxText: async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            let text = '';
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                text += XLSX.utils.sheet_to_csv(worksheet);
            });
            return text;
        },
    },

    TextUtils: {
        chunkText: (text, chunkSize, overlap) => {
            const chunks = [];
            let i = 0;
            while (i < text.length) {
                chunks.push(text.substring(i, i + chunkSize));
                i += chunkSize - overlap;
            }
            return chunks;
        },
    },

    // --- LÓGICA DE IA: EMBEDDINGS, BÚSQUEDA Y QA ---
    AI: {
        generateEmbeddings: async (chunks) => {
            const embeddings = await Model.state.models.extractor(chunks, { pooling: 'mean', normalize: true });
            return embeddings.tolist();
        },
        findTopKRelevantChunks: async (query, k = 3) => {
            if (Model.state.knowledgeBase.length === 0) return [];

            const queryEmbedding = await Model.state.models.extractor(query, { pooling: 'mean', normalize: true });
            const similarities = [];

            for (const doc of Model.state.knowledgeBase) {
                for (let i = 0; i < doc.chunks.length; i++) {
                    const chunkEmbedding = doc.embeddings[i];
                    const similarity = Model.AI.cosineSimilarity(queryEmbedding.data, chunkEmbedding);
                    similarities.push({
                        chunk: doc.chunks[i],
                        fileName: doc.fileName,
                        similarity: similarity,
                    });
                }
            }

            similarities.sort((a, b) => b.similarity - a.similarity);
            return similarities.slice(0, k);
        },
        cosineSimilarity: (vecA, vecB) => {
            let dotProduct = 0.0;
            let normA = 0.0;
            let normB = 0.0;
            for (let i = 0; i < vecA.length; i++) {
                dotProduct += vecA[i] * vecB[i];
                normB += vecB[i] * vecB[i];
            }
            return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        },
        answerQuestion: async (question, context) => {
            const result = await Model.state.models.qaModel(question, context);
            return result.answer;
        },
    },

    // --- ESTADÍSTICAS ---
    updateStats: function(type) {
        if (type in this.state.stats) {
            this.state.stats[type]++;
        }
        return this.state.stats;
    }
};
