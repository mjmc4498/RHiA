// =================================================================================
//  CONTROLADOR (Orquestador de la Aplicación)
// =================================================================================

const Controller = {
    init: function() {
        // --- INICIALIZACIÓN DE LA APLICACIÓN ---
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEventListeners();
            this.initializeModels();
        });
    },

    initializeModels: async function() {
        const result = await Model.initializeModels((progress) => {
            View.updateStatus(progress.status, progress.progress);
        });

        if (result.success) {
            View.setModelsLoaded(result.message);
        } else {
            View.updateStatus(result.message);
        }
    },

    // --- MANEJO DE EVENTOS ---
    bindEventListeners: function() {
        View.ui.fileUpload.addEventListener('change', this.handleFileUpload);
        View.ui.sendButton.addEventListener('click', this.handleUserQuery);
        View.ui.userInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleUserQuery();
        });
        View.ui.chatContainer.addEventListener('click', this.handleChatInteraction);
        View.ui.exportChatBtn.addEventListener('click', this.handleExportChat);
    },

    handleFileUpload: async function(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        View.updateStatus(`Procesando ${files.length} documento(s)...`);
        for (const file of files) {
            const newDoc = await Model.processAndEmbedFile(file);
            if (newDoc) {
                View.addDocumentToList(newDoc.fileName);
            }
        }
        View.updateStatus('Documentos procesados y listos para la consulta.');
    },

    handleUserQuery: async function() {
        const query = View.getUserInput();
        if (!query || !Model.state.modelReady) return;
        if (Model.state.knowledgeBase.length === 0) {
            View.appendMessage('Por favor, sube al menos un documento antes de preguntar.', 'bot');
            return;
        }

        View.appendMessage(query, 'user');
        View.clearUserInput();
        View.toggleSendButton(true);
        View.appendMessage('...', 'bot', true);

        const relevantChunks = await Model.AI.findTopKRelevantChunks(query);
        if (relevantChunks.length === 0) {
            View.updateBotMessage('No he encontrado información relevante en los documentos para responder a tu pregunta.');
            View.toggleSendButton(false);
            return;
        }

        const context = relevantChunks.map(c => c.chunk).join('\n\n');
        const answer = await Model.AI.answerQuestion(query, context);

        const stats = Model.updateStats('questions');
        View.updateStats(stats);

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
        View.updateBotMessage(botResponseHTML);
        View.toggleSendButton(false);
    },

    handleChatInteraction: function(event) {
        const target = event.target;

        // Botón de Copiar
        if (target.classList.contains('copy-btn')) {
            const botResponseContainer = target.closest('.bg-gray-200');
            const answerText = botResponseContainer.querySelector('p').textContent;
            navigator.clipboard.writeText(answerText).then(() => {
                target.textContent = '¡Copiado!';
                setTimeout(() => { target.textContent = 'Copiar'; }, 2000);
            });
        }

        // Botones de Feedback
        if (target.classList.contains('feedback-btn')) {
            const feedback = target.dataset.feedback;
            const stats = Model.updateStats(feedback === 'util' ? 'useful' : 'notUseful');
            View.updateStats(stats);

            const feedbackButtons = target.parentElement.querySelectorAll('.feedback-btn');
            feedbackButtons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-50');
            });
            target.style.backgroundColor = feedback === 'util' ? '#a7f3d0' : '#fecaca';
        }
    },

    handleExportChat: function() {
        let chatContent = "Historial de Conversación - Chatbot RRHH\n";
        chatContent += "========================================\n\n";

        View.ui.chatContainer.querySelectorAll('.mb-2').forEach(messageWrapper => {
            const isUser = messageWrapper.classList.contains('justify-end');
            const sender = isUser ? 'Usuario' : 'Bot';
            // Clonamos el nodo para no modificar el original
            const bubbleClone = messageWrapper.querySelector('.rounded-lg').cloneNode(true);
            // Eliminamos los botones del clon para obtener solo el texto
            const buttons = bubbleClone.querySelector('.flex.gap-2');
            if (buttons) {
                buttons.remove();
            }
            const textContent = bubbleClone.textContent.trim();
            chatContent += `${sender}:\n${textContent}\n\n`;
        });

        View.downloadChat(chatContent);
    }
};

// Iniciar la aplicación
Controller.init();
