// =================================================================================
//  MODELO (Contiene el VectorStore y los procesadores de archivos)
// =================================================================================

// --- VectorStore (Inspirado en LangChain) ---
// Encapsula toda la lógica de almacenamiento, vectorización y búsqueda.
const VectorStore = {
    documents: [],     // { pageContent: string, metadata: { source: string } }
    vocabulary: [],
    idf: {},
    vectors: [],
    stopWords: new Set(['de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'ha', 'me', 'si', 'sin', 'sobre', 'este', 'entre']),

    // 1. Añadir documentos y construir el modelo TF-IDF
    addDocuments(docs) {
        this.documents.push(...docs);
        this._buildVocabularyAndIDF();
        this._generateVectors();
    },

    // 2. Búsqueda de similitud
    similaritySearch(query, k = 3) {
        if (this.vectors.length === 0) return [];

        const queryTokens = this._tokenize(query);
        const queryVector = this._vectorize(queryTokens);

        const similarities = this.vectors.map((docVector, i) => ({
            document: this.documents[i],
            similarity: this._cosineSimilarity(queryVector, docVector),
        }));

        return similarities
            .filter(item => item.similarity > 0.01)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k)
            .map(item => item.document); // Devolver solo los documentos
    },

    // --- Métodos Privados ---
    _tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word && !this.stopWords.has(word));
    },

    _buildVocabularyAndIDF() {
        const docFrequencies = {};
        const totalDocs = this.documents.length;

        this.documents.forEach(doc => {
            const tokens = new Set(this._tokenize(doc.pageContent));
            tokens.forEach(token => {
                docFrequencies[token] = (docFrequencies[token] || 0) + 1;
            });
        });

        this.vocabulary = Object.keys(docFrequencies);
        this.idf = {};
        this.vocabulary.forEach(term => {
            this.idf[term] = Math.log(totalDocs / (docFrequencies[term] || 1));
        });
    },

    _vectorize(tokens) {
        const vector = new Array(this.vocabulary.length).fill(0);
        const tf = {};
        const tokenCount = tokens.length;
        if (tokenCount === 0) return vector;

        tokens.forEach(token => tf[token] = (tf[token] || 0) + 1);

        this.vocabulary.forEach((term, i) => {
            if (tf[term]) {
                const tfValue = tf[term] / tokenCount;
                vector[i] = tfValue * (this.idf[term] || 0);
            }
        });
        return vector;
    },

    _generateVectors() {
        this.vectors = this.documents.map(doc => this._vectorize(this._tokenize(doc.pageContent)));
    },

    _cosineSimilarity(vecA, vecB) {
        let dotProduct = 0.0, normA = 0.0, normB = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    },
};

// --- Modelo Principal ---
const Model = {
    vectorStore: VectorStore,
    state: {
        stats: { questions: 0, useful: 0, notUseful: 0 },
    },

    // --- PROCESAMIENTO DE ARCHIVOS ---
    async processFiles(files) {
        let allChunks = [];
        for (const file of files) {
            let text = '';
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (fileExtension === 'pdf') text = await this.FileProcessors.extractPdfText(file);
            else if (fileExtension === 'docx') text = await this.FileProcessors.extractDocxText(file);
            else if (fileExtension === 'xlsx') text = await this.FileProcessors.extractXlsxText(file);
            else continue;

            const chunks = this.TextUtils.chunkText(text, 200, 50);
            const chunksWithMetadata = chunks.map(chunk => ({
                pageContent: chunk,
                metadata: { source: file.name }
            }));
            allChunks.push(...chunksWithMetadata);
        }
        return allChunks;
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

export default Model;
