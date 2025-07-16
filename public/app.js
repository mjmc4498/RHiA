// =================================================================================
// Chatbot de RRHH - Lógica del Cliente (Frontend)
// Arquitectura sin servidor con @xenova/transformers.js
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // -----------------------------------------------------------------------------
    //  ELEMENTOS DE LA UI Y ESTADO GLOBAL
    // -----------------------------------------------------------------------------
    const ui = {
        statusMessage: document.getElementById('status-message'),
        loadingProgress: document.getElementById('loading-progress'),
        fileUpload: document.getElementById('file-upload'),
        documentList: document.getElementById('document-list'),
        userInput: document.getElementById('user-input'),
        sendButton: document.getElementById('send-button'),
        chatContainer: document.getElementById('chat-container'),
        statusContainer: document.getElementById('status-container'),
        exportChatBtn: document.getElementById('export-chat-btn'),
        statsQuestions: document.getElementById('stats-questions'),
        statsUseful: document.getElementById('stats-useful'),
        statsNotUseful: document.getElementById('stats-not-useful'),
    };

    const state = {
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
    };

    // -----------------------------------------------------------------------------
    //  INICIALIZACIÓN DE MODELOS DE IA
    // -----------------------------------------------------------------------------
    async function initializeModels() {
        try {
            const modelsToLoad = [
                { name: 'sentence-transformers/all-MiniLM-L6-v2', type: 'extractor', label: 'Embeddings' },
                { name: 'distilbert-base-cased-distilled-squad', type: 'qaModel', label: 'Question-Answering' },
            ];

            for (const modelInfo of modelsToLoad) {
                ui.statusMessage.textContent = `Cargando modelo de ${modelInfo.label}...`;
                state.models[modelInfo.type] = await AutoModel.load(modelInfo.name, {
                    progress_callback: (progress) => {
                        ui.loadingProgress.style.width = `${progress.progress}%`;
                    },
                });
            }

            ui.statusMessage.textContent = '¡Modelos cargados! Sube documentos para empezar.';
            ui.statusContainer.classList.replace('bg-blue-100', 'bg-green-100');
            ui.statusContainer.classList.replace('text-blue-800', 'text-green-800');
            ui.userInput.disabled = false;
            ui.sendButton.disabled = false;
            state.modelReady = true;

        } catch (error) {
            ui.statusMessage.textContent = 'Error fatal al cargar los modelos de IA.';
            console.error('Error loading models:', error);
        }
    }

    // -----------------------------------------------------------------------------
    //  PROCESAMIENTO DE ARCHIVOS
    // -----------------------------------------------------------------------------
    ui.fileUpload.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;

        ui.statusMessage.textContent = `Procesando ${files.length} documento(s)...`;
        for (const file of files) {
            await processAndEmbedFile(file);
        }
        ui.statusMessage.textContent = 'Documentos procesados y listos para la consulta.';
    });

    async function processAndEmbedFile(file) {
        try {
            let text = '';
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (fileExtension === 'pdf') {
                text = await FileProcessors.extractPdfText(file);
            } else if (fileExtension === 'docx') {
                text = await FileProcessors.extractDocxText(file);
            } else if (fileExtension === 'xlsx') {
                text = await FileProcessors.extractXlsxText(file);
            } else {
                console.warn(`Formato no soportado: ${file.name}`);
                return;
            }

            const chunks = TextUtils.chunkText(text, 512, 128);
            const embeddings = await AI.generateEmbeddings(chunks);

            state.knowledgeBase.push({
                fileName: file.name,
                chunks: chunks,
                embeddings: embeddings,
            });

            const listItem = document.createElement('div');
            listItem.textContent = `✓ ${file.name}`;
            ui.documentList.appendChild(listItem);

        } catch (error) {
            console.error(`Error procesando el archivo ${file.name}:`, error);
        }
    }

    const FileProcessors = {
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
    };

    const TextUtils = {
        chunkText: (text, chunkSize, overlap) => {
            const chunks = [];
            let i = 0;
            while (i < text.length) {
                chunks.push(text.substring(i, i + chunkSize));
                i += chunkSize - overlap;
            }
            return chunks;
        },
    };

    // -----------------------------------------------------------------------------
    //  LÓGICA DE IA: EMBEDDINGS, BÚSQUEDA Y QA
    // -----------------------------------------------------------------------------
    const AI = {
        generateEmbeddings: async (chunks) => {
            const embeddings = await state.models.extractor(chunks, { pooling: 'mean', normalize: true });
            return embeddings.tolist(); // Convertir tensor a un array anidado
        },
        findTopKRelevantChunks: async (query, k = 3) => {
            if (state.knowledgeBase.length === 0) return [];

            const queryEmbedding = await state.models.extractor(query, { pooling: 'mean', normalize: true });
            const similarities = [];

            for (const doc of state.knowledgeBase) {
                for (let i = 0; i < doc.chunks.length; i++) {
                    const chunkEmbedding = doc.embeddings[i];
                    const similarity = AI.cosineSimilarity(queryEmbedding.data, chunkEmbedding);
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
                normA += vecA[i] * vecA[i];
                normB += vecB[i] * vecB[i];
            }
            return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        },
        answerQuestion: async (question, context) => {
            const result = await state.models.qaModel(question, context);
            return result.answer;
        },
    };

    // -----------------------------------------------------------------------------
    //  MANEJO DE LA INTERFAZ DE USUARIO DEL CHAT
    // -----------------------------------------------------------------------------
    ui.sendButton.addEventListener('click', handleUserQuery);
    ui.userInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') handleUserQuery();
    });

    async function handleUserQuery() {
        const query = ui.userInput.value.trim();
        if (!query || !state.modelReady) return;
        if (state.knowledgeBase.length === 0) {
            UIUtils.appendMessage('Por favor, sube al menos un documento antes de preguntar.', 'bot');
            return;
        }

        UIUtils.appendMessage(query, 'user');
        ui.userInput.value = '';
        ui.sendButton.disabled = true;
        UIUtils.appendMessage('...', 'bot', true); // Indicador de "pensando"

        const relevantChunks = await AI.findTopKRelevantChunks(query);
        if (relevantChunks.length === 0) {
            UIUtils.updateBotMessage('No he encontrado información relevante en los documentos para responder a tu pregunta.');
            ui.sendButton.disabled = false;
            return;
        }

        const context = relevantChunks.map(c => c.chunk).join('\n\n');
        const answer = await AI.answerQuestion(query, context);

        state.stats.questions++;
        updateStats();

        const sourceFile = relevantChunks[0].fileName;
        const sourceText = relevantChunks[0].chunk;

        const botResponseHTML = `
            <p>${answer}</p>
            <div class="mt-2 p-2 bg-gray-100 rounded text-xs">
                <p><strong>Fuente:</strong> ${sourceFile}</p>
                <p class="italic"><strong>Contexto:</strong> "${sourceText}"</p>
            </div>
            <div class="mt-2 flex gap-2">
                <button class="copy-btn text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1 px-2 rounded">Copiar</button>
                <button class="feedback-btn text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1 px-2 rounded" data-feedback="util">👍</button>
                <button class="feedback-btn text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1 px-2 rounded" data-feedback="no-util">👎</button>
            </div>
        `;
        UIUtils.updateBotMessage(botResponseHTML);
        ui.sendButton.disabled = false;
    }

    const UIUtils = {
        appendMessage: (html, sender, isThinking = false) => {
            const messageWrapper = document.createElement('div');
            messageWrapper.classList.add('mb-2', 'flex', sender === 'user' ? 'justify-end' : 'justify-start');

            const messageBubble = document.createElement('div');
            messageBubble.classList.add('rounded-lg', 'p-2', 'max-w-lg', 'text-sm',
                sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800');

            if (isThinking) {
                messageBubble.id = 'thinking-indicator';
                messageBubble.innerHTML = `<div class="flex items-center space-x-1"><div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div><div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div><div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div></div>`;
            } else {
                messageBubble.innerHTML = html;
            }

            messageWrapper.appendChild(messageBubble);
            ui.chatContainer.appendChild(messageWrapper);
            ui.chatContainer.scrollTop = ui.chatContainer.scrollHeight;
        },
        updateBotMessage: (newHTML) => {
            const thinkingIndicator = document.getElementById('thinking-indicator');
            if (thinkingIndicator) {
                thinkingIndicator.innerHTML = newHTML;
                thinkingIndicator.removeAttribute('id');
            } else {
                UIUtils.appendMessage(newHTML, 'bot');
            }
        },
    };

    // --- MANEJO DE EVENTOS DINÁMICOS (COPIAR, FEEDBACK) ---
    ui.chatContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('copy-btn')) {
            const botResponseContainer = target.closest('.bg-gray-200');
            const answerText = botResponseContainer.querySelector('p').textContent;
            navigator.clipboard.writeText(answerText).then(() => {
                target.textContent = '¡Copiado!';
                setTimeout(() => { target.textContent = 'Copiar'; }, 2000);
            });
        }

        if (target.classList.contains('feedback-btn')) {
            const feedback = target.dataset.feedback;
            if (feedback === 'util') {
                state.stats.useful++;
            } else {
                state.stats.notUseful++;
            }
            updateStats();

            console.log(`Feedback recibido: ${feedback}.`);
            const feedbackButtons = target.parentElement.querySelectorAll('.feedback-btn');
            feedbackButtons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-50');
            });
            target.style.backgroundColor = feedback === 'util' ? '#a7f3d0' : '#fecaca'; // verde o rojo claro
        }
    });

    // --- FUNCIONALIDADES DE EXPORTACIÓN Y SEGUIMIENTO ---
    ui.exportChatBtn.addEventListener('click', () => {
        let chatContent = "Historial de Conversación - Chatbot RRHH\n";
        chatContent += "========================================\n\n";

        ui.chatContainer.querySelectorAll('.mb-2').forEach(messageWrapper => {
            const isUser = messageWrapper.classList.contains('justify-end');
            const sender = isUser ? 'Usuario' : 'Bot';
            const textContent = messageWrapper.querySelector('.rounded-lg').textContent.trim();
            chatContent += `${sender}:\n${textContent}\n\n`;
        });

        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_rrhh_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    function updateStats() {
        ui.statsQuestions.textContent = state.stats.questions;
        ui.statsUseful.textContent = state.stats.useful;
        ui.statsNotUseful.textContent = state.stats.notUseful;
    }

    // --- INICIO DE LA APLICACIÓN ---
    initializeModels();
});
