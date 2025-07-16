// =================================================================================
//  MODELO (Manejo de Datos y Lógica de Búsqueda TF-IDF)
// =================================================================================

const Model = {
    state: {
        knowledgeBase: [], // { fileName, chunks: [string], vectors: [Object] }
        vocabulary: [],    // Lista de todas las palabras únicas en los documentos
        idf: {},           // IDF para cada palabra del vocabulario
        stats: {
            questions: 0,
            useful: 0,
            notUseful: 0,
        },
    },

    // --- LÓGICA DE BÚSQUEDA (TF-IDF) ---

    Search: {
        // Palabras comunes en español a ignorar
        stopWords: new Set(['de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'ha', 'me', 'si', 'sin', 'sobre', 'este', 'entre']),

        // 1. Tokenizar texto: convertir a minúsculas, quitar puntuación y stop words
        tokenize(text) {
            return text.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word && !this.stopWords.has(word));
        },

        // 2. Construir el vocabulario y calcular el IDF
        buildVocabularyAndIDF(chunks) {
            const docFrequencies = {};
            const totalDocs = chunks.length;

            chunks.forEach(chunk => {
                const tokens = new Set(this.tokenize(chunk)); // Usar Set para contar cada palabra una vez por documento
                tokens.forEach(token => {
                    docFrequencies[token] = (docFrequencies[token] || 0) + 1;
                });
            });

            Model.state.vocabulary = Object.keys(docFrequencies);
            Model.state.idf = {};
            Model.state.vocabulary.forEach(term => {
                // La fórmula de IDF es log(N / df), donde N es el número total de documentos y df es el número de documentos que contienen el término.
                Model.state.idf[term] = Math.log(totalDocs / docFrequencies[term]);
            });
        },

        // 3. Vectorizar un texto usando TF-IDF
        vectorize(tokens) {
            const vector = new Array(Model.state.vocabulary.length).fill(0);
            const tf = {};
            const tokenCount = tokens.length;

            // Calcular la frecuencia de término (TF)
            tokens.forEach(token => {
                tf[token] = (tf[token] || 0) + 1;
            });

            // Calcular el vector TF-IDF
            Model.state.vocabulary.forEach((term, i) => {
                if (tf[term]) {
                    const tfValue = tf[term] / tokenCount;
                    const idfValue = Model.state.idf[term] || 0;
                    vector[i] = tfValue * idfValue;
                }
            });
            return vector;
        },

        // 4. Encontrar los chunks más relevantes
        findTopKRelevantChunks(query, k = 1) {
            if (Model.state.knowledgeBase.length === 0) return [];

            const queryTokens = this.tokenize(query);
            const queryVector = this.vectorize(queryTokens);

            const similarities = [];
            Model.state.knowledgeBase.forEach(doc => {
                doc.vectors.forEach((docVector, i) => {
                    const similarity = this.cosineSimilarity(queryVector, docVector);
                    if (similarity > 0) { // Solo considerar si hay alguna similitud
                        similarities.push({
                            chunk: doc.chunks[i],
                            fileName: doc.fileName,
                            similarity: similarity,
                        });
                    }
                });
            });

            similarities.sort((a, b) => b.similarity - a.similarity);
            return similarities.slice(0, k);
        },

        cosineSimilarity: (vecA, vecB) => {
            let dotProduct = 0.0;
            let normA = 0.0;
            let normB = 0.0;
            for (let i = 0; i < vecA.length; i++) {
                dotProduct += vecA[i] * vecB[i];
                normA += vecA[i] * vecA[i];
                normB += vecB[i] * vecB[i];
            }
            if (normA === 0 || normB === 0) return 0;
            return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        },
    },

    // --- PROCESAMIENTO DE ARCHIVOS ---
    async processAndVectorizeFile(file) {
        try {
            let text = '';
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (fileExtension === 'pdf') text = await this.FileProcessors.extractPdfText(file);
            else if (fileExtension === 'docx') text = await this.FileProcessors.extractDocxText(file);
            else if (fileExtension === 'xlsx') text = await this.FileProcessors.extractXlsxText(file);
            else {
                console.warn(`Formato no soportado: ${file.name}`);
                return null;
            }

            const chunks = this.TextUtils.chunkText(text, 200, 50); // Chunks más pequeños para TF-IDF

            const newDocument = {
                fileName: file.name,
                chunks: chunks,
                vectors: [], // Se llenará después de construir el vocabulario
            };
            this.state.knowledgeBase.push(newDocument);
            return newDocument;

        } catch (error) {
            console.error(`Error procesando el archivo ${file.name}:`, error);
            return null;
        }
    },

    // Función para construir el modelo TF-IDF global después de cargar todos los archivos
    buildGlobalModel() {
        const allChunks = this.state.knowledgeBase.flatMap(doc => doc.chunks);
        if (allChunks.length > 0) {
            this.Search.buildVocabularyAndIDF(allChunks);

            // Ahora que tenemos el vocabulario y el IDF, vectorizamos cada chunk
            this.state.knowledgeBase.forEach(doc => {
                doc.vectors = doc.chunks.map(chunk => this.Search.vectorize(this.Search.tokenize(chunk)));
            });
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

    // --- ESTADÍSTICAS ---
    updateStats: function(type) {
        if (type in this.state.stats) {
            this.state.stats[type]++;
        }
        return this.state.stats;
    }
};
