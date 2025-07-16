// =================================================================================
//  VISTA (Manejo del DOM)
// =================================================================================

const View = {
    ui: {
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
    },

    // --- MÉTODOS DE RENDERIZADO ---
    updateStatus(message, progress) {
        if (message) {
            this.ui.statusMessage.textContent = message;
        }
        if (progress !== undefined) {
            this.ui.loadingProgress.style.width = `${progress}%`;
        }
    },

    setModelsLoaded(message) {
        this.ui.statusMessage.textContent = message;
        this.ui.statusContainer.classList.replace('bg-blue-100', 'bg-green-100');
        this.ui.statusContainer.classList.replace('text-blue-800', 'text-green-800');
        this.ui.userInput.disabled = false;
        this.ui.sendButton.disabled = false;
    },

    addDocumentToList(fileName) {
        const listItem = document.createElement('div');
        listItem.textContent = `✓ ${fileName}`;
        this.ui.documentList.appendChild(listItem);
    },

    appendMessage(html, sender, isThinking = false) {
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
        this.ui.chatContainer.appendChild(messageWrapper);
        this.ui.chatContainer.scrollTop = this.ui.chatContainer.scrollHeight;
    },

    updateBotMessage(newHTML) {
        const thinkingIndicator = document.getElementById('thinking-indicator');
        if (thinkingIndicator) {
            thinkingIndicator.innerHTML = newHTML;
            thinkingIndicator.removeAttribute('id');
        } else {
            this.appendMessage(newHTML, 'bot');
        }
    },

    updateStats(stats) {
        this.ui.statsQuestions.textContent = stats.questions;
        this.ui.statsUseful.textContent = stats.useful;
        this.ui.statsNotUseful.textContent = stats.notUseful;
    },

    getUserInput() {
        return this.ui.userInput.value.trim();
    },

    clearUserInput() {
        this.ui.userInput.value = '';
    },

    toggleSendButton(disabled) {
        this.ui.sendButton.disabled = disabled;
    },

    downloadChat(chatContent) {
        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_rrhh_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
