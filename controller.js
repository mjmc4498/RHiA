// =================================================================================
//  CONTROLADOR (Orquestador de la Aplicación)
// =================================================================================

const Controller = {
    chain: null, // Nuestra cadena de recuperación

    init: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupChain();
            this.bindEventListeners();
            View.setReadyState('Listo para procesar documentos.');
        });
    },

    // 1. Configurar la cadena de recuperación
    setupChain: function() {
        const vectorStore = Model.vectorStore;
        const retriever = new Retriever(vectorStore);
        this.chain = new RetrievalChain(retriever);
    },

    setFavicon: function() {
        const logoSVG = document.getElementById('rhia-logo').outerHTML;
        const favicon = document.getElementById('favicon');
        const faviconURL = 'data:image/svg+xml,' + encodeURIComponent(logoSVG);
        favicon.setAttribute('href', faviconURL);
    },

    bindEventListeners: function() {
        const ui = View.ui;
        ui.fileUploadEmpresa.addEventListener('change', (e) => this.handleFileUpload(e));
        ui.fileUploadGeneral.addEventListener('change', (e) => this.handleFileUpload(e));
        ui.sendButton.addEventListener('click', () => this.handleUserQuery());
        ui.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserQuery();
            }
        });
        ui.userInput.addEventListener('input', () => {
            const el = ui.userInput;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
            View.toggleSendButton(el.value.trim().length === 0);
        });
        ui.chatContainer.addEventListener('click', (e) => this.handleChatInteraction(e));
        ui.exportChatBtn.addEventListener('click', () => this.handleExportChat());

        const sidebar = document.getElementById('sidebar');
        const openSidebarBtn = document.getElementById('open-sidebar-btn');
        const closeSidebarBtn = document.getElementById('close-sidebar-btn');
        if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
        if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
    },

    // 2. Manejar la carga de archivos y añadirlos al VectorStore
    handleFileUpload: async function(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        View.updateStatus(`Procesando ${files.length} documento(s)...`);
        const documents = await Model.processFiles(files);
        this.chain.retriever.vectorStore.addDocuments(documents);

        // Actualizar la UI
        Array.from(files).forEach(file => View.addDocumentToList(file.name, event.target.dataset.type));
        View.updateStatus('Documentos procesados y listos para la consulta.');
    },

    // 3. Manejar la consulta del usuario usando la cadena
    handleUserQuery: async function() {
        const query = View.getUserInput();
        if (!query) return;
        if (this.chain.retriever.vectorStore.documents.length === 0) {
            View.appendMessage('Por favor, sube al menos un documento antes de preguntar.', 'bot');
            return;
        }

        View.appendMessage(query, 'user');
        View.clearUserInput();
        View.toggleSendButton(true);
        View.appendMessage('...', 'bot', true);

        // ¡La magia de la cadena!
        const result = this.chain.call({ query });

        const stats = Model.updateStats('questions');
        View.updateStats(stats);

        const botResponseHTML = `
            <div class="space-y-4">
                <div>${this.formatAnswer(result.answer)}</div>
                <div class="p-3 bg-gray-100 dark:bg-rhia-light-gray rounded-lg text-xs text-gray-600 dark:text-gray-400">
                    <p><strong>Fuentes consultadas:</strong> ${result.sources.join(', ')}</p>
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
