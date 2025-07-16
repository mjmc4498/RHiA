import Model from './model.js';
import View from './view.js';
import LLM from './llm.js';
import { Retriever, ConversationalRetrievalChain } from './langchain.js';

// =================================================================================
//  CONTROLADOR (Orquestador de la Aplicación)
// =================================================================================

const Controller = {
    chain: null,

    init: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEventListeners();
            this.setupApplication();
        });
    },

    // 1. Configuración inicial de la aplicación
    setupApplication: async function() {
        this.setFavicon();

        // Inicializar el LLM y mostrar el progreso
        const llmReady = await LLM.init((status, progress) => {
            View.updateStatus(status, progress);
        });

        if (llmReady) {
            // Configurar la cadena una vez que el LLM esté listo
            const retriever = new Retriever(Model.vectorStore);
            this.chain = new ConversationalRetrievalChain(retriever, LLM);
            View.setReadyState('IA lista. Sube tus documentos para comenzar.');
        } else {
            View.setReadyState('Error al cargar la IA. Funcionalidad limitada.');
        }
    },

    setFavicon: function() {
        const logoSVG = document.getElementById('rhia-logo').outerHTML;
        const favicon = document.getElementById('favicon');
        favicon.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(logoSVG)}`);
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

        // Manejo de la barra lateral móvil
        const sidebar = document.getElementById('sidebar');
        const openSidebarBtn = document.getElementById('open-sidebar-btn');
        const closeSidebarBtn = document.getElementById('close-sidebar-btn');
        if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
        if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
    },

    // 2. Manejar la carga de archivos
    handleFileUpload: async function(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        View.updateStatus(`Procesando ${files.length} documento(s)...`, 0);
        const documents = await Model.processFiles(files);
        Model.vectorStore.addDocuments(documents);

        Array.from(files).forEach(file => View.addDocumentToList(file.name, event.target.dataset.type));
        View.updateStatus('Documentos procesados y listos para la consulta.', 100);
    },

    // 3. Manejar la consulta del usuario con la nueva cadena
    handleUserQuery: async function() {
        const query = View.getUserInput();
        if (!query || !this.chain) return;
        if (Model.vectorStore.documents.length === 0) {
            View.appendMessage('Por favor, sube al menos un documento antes de preguntar.', 'bot');
            return;
        }

        View.appendMessage(query, 'user');
        View.clearUserInput();
        View.toggleSendButton(true);

        const messageId = `bot-response-${Date.now()}`;
        View.appendMessage('', 'bot', true, messageId); // Crear un contenedor vacío para el streaming

        // Llamar a la cadena y pasar el callback de streaming a la Vista
        const result = await this.chain.call({ query }, (token) => {
            View.streamMessage(messageId, token);
        });

        // Actualizar el mensaje final con los botones y las fuentes
        View.finalizeMessage(messageId, result.sources);

        const stats = Model.updateStats('questions');
        View.updateStats(stats);
        View.toggleSendButton(false);
    },

    handleChatInteraction: function(event) {
        const target = event.target.closest('button');
        if (!target) return;

        if (target.classList.contains('copy-btn')) {
            const botResponseContainer = target.closest('.space-y-4');
            const answerText = botResponseContainer.querySelector('.prose > div').textContent;
            navigator.clipboard.writeText(answerText).then(() => {
                target.innerHTML = '¡Copiado!';
                setTimeout(() => { target.innerHTML = View.icons.copy; }, 2000);
            });
        }

        if (target.classList.contains('feedback-btn')) {
            const feedback = target.dataset.feedback;
            Model.updateStats(feedback === 'util' ? 'useful' : 'notUseful');
            View.updateStats(Model.state.stats);

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
