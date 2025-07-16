// =================================================================================
//  CONTROLADOR (Orquestador de la Aplicación)
// =================================================================================

const Controller = {
    init: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setFavicon();
            this.bindEventListeners();
            View.setReadyState('Listo para procesar documentos.');
            View.ui.userInput.disabled = false; // Habilitar explícitamente
        });
    },

    setFavicon: function() {
        const logoSVG = document.getElementById('rhia-logo').outerHTML;
        const favicon = document.getElementById('favicon');
        const faviconURL = 'data:image/svg+xml,' + encodeURIComponent(logoSVG);
        favicon.setAttribute('href', faviconURL);
    },

    bindEventListeners: function() {
        const ui = View.ui;
        ui.fileUpload.addEventListener('change', this.handleFileUpload.bind(this));
        ui.sendButton.addEventListener('click', this.handleUserQuery.bind(this));
        ui.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserQuery();
            }
        });
        ui.userInput.addEventListener('input', () => {
            const el = ui.userInput;
            // Ajustar altura
            el.style.height = 'auto';
            el.style.height = (el.scrollHeight) + 'px';
            // Habilitar/deshabilitar botón de envío
            View.toggleSendButton(el.value.trim().length === 0);
        });
        ui.chatContainer.addEventListener('click', this.handleChatInteraction.bind(this));
        ui.exportChatBtn.addEventListener('click', this.handleExportChat.bind(this));

        const sidebar = document.getElementById('sidebar');
        const openSidebarBtn = document.getElementById('open-sidebar-btn');
        const closeSidebarBtn = document.getElementById('close-sidebar-btn');
        if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
        if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
    },

    handleFileUpload: async function(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        View.updateStatus(`Procesando ${files.length} documento(s)...`);
        for (const file of files) {
            const newDoc = await Model.processAndVectorizeFile(file);
            if (newDoc) {
                View.addDocumentToList(newDoc.fileName);
            }
        }

        // Construir el modelo TF-IDF global una vez que todos los archivos han sido procesados
        Model.buildGlobalModel();
        View.updateStatus('Documentos procesados y listos para la consulta.');
    },

    handleUserQuery: async function() {
        const query = View.getUserInput();
        if (!query) return;
        if (Model.state.knowledgeBase.length === 0) {
            View.appendMessage('Por favor, sube al menos un documento antes de preguntar.', 'bot');
            return;
        }

        View.appendMessage(query, 'user');
        View.clearUserInput();
        View.toggleSendButton(true);
        View.appendMessage('...', 'bot', true);

        const relevantChunks = Model.Search.findTopKRelevantChunks(query);

        if (relevantChunks.length === 0) {
            View.updateBotMessage('No he encontrado información relevante en los documentos para responder a tu pregunta.');
            View.toggleSendButton(false);
            return;
        }

        const answerChunk = relevantChunks[0];
        const stats = Model.updateStats('questions');
        View.updateStats(stats);

        const botResponseHTML = `
            <div class="space-y-4">
                <div>${this.formatAnswer(answerChunk.chunk)}</div>
                <div class="p-3 bg-gray-100 dark:bg-rhia-light-gray rounded-lg text-xs text-gray-600 dark:text-gray-400">
                    <p><strong>Fuente:</strong> ${answerChunk.fileName}</p>
                </div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <button class="copy-btn p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors" aria-label="Copiar respuesta">${View.icons.copy}</button>
                    <button class="feedback-btn p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors" data-feedback="util" aria-label="Marcar como útil">${View.icons.thumbUp}</button>
                    <button class="feedback-btn p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors" data-feedback="no-util" aria-label="Marcar como no útil">${View.icons.thumbDown}</button>
                </div>
            </div>
        `;
        View.updateBotMessage(botResponseHTML);
        View.toggleSendButton(false);
    },

    formatAnswer: function(text) {
        // Escapar HTML para seguridad y luego formatear
        const escapedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return escapedText.replace(/\n/g, '<br>');
    },

    handleChatInteraction: function(event) {
        const target = event.target.closest('button');
        if (!target) return;

        if (target.classList.contains('copy-btn')) {
            const botResponseContainer = target.closest('.space-y-4');
            const answerText = botResponseContainer.querySelector('div:first-child').textContent;
            navigator.clipboard.writeText(answerText).then(() => {
                target.innerHTML = '¡Copiado!';
                setTimeout(() => { target.innerHTML = View.icons.copy; }, 2000);
            });
        }

        if (target.classList.contains('feedback-btn')) {
            const feedback = target.dataset.feedback;
            const stats = Model.updateStats(feedback === 'util' ? 'useful' : 'notUseful');
            View.updateStats(stats);

            const feedbackButtons = target.parentElement.querySelectorAll('.feedback-btn');
            feedbackButtons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-50');
            });
            target.classList.add(feedback === 'util' ? 'text-green-500' : 'text-red-500');
        }
    },

    handleExportChat: function() {
        let chatContent = "Historial de Conversación - Chatbot RRHH\n";
        chatContent += "========================================\n\n";

        View.ui.chatContainer.querySelectorAll('.py-6').forEach(messageWrapper => {
            const isUser = messageWrapper.querySelector('.bg-gray-600') !== null;
            const sender = isUser ? 'Usuario' : 'Bot';
            const textContent = messageWrapper.querySelector('.prose').textContent.trim();
            chatContent += `${sender}:\n${textContent}\n\n`;
        });

        View.downloadChat(chatContent);
    }
};

Controller.init();
