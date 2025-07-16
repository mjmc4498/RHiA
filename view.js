// =================================================================================
//  VISTA (Manejo del DOM)
// =================================================================================

const View = {
    ui: {
        statusMessage: document.getElementById('status-message'),
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
    updateStatus(message) {
        if (message) {
            this.ui.statusMessage.textContent = message;
        }
    },

    setReadyState(message) {
        this.ui.statusMessage.textContent = message;
        this.ui.statusContainer.classList.replace('bg-blue-100', 'bg-green-100');
        this.ui.statusContainer.classList.replace('text-blue-800', 'text-green-800');
        this.ui.userInput.disabled = false;
        // El botón de enviar solo se activa si hay texto
        this.ui.sendButton.disabled = this.getUserInput().length === 0;
    },

    addDocumentToList(fileName) {
        const listItem = document.createElement('div');
        listItem.textContent = `✓ ${fileName}`;
        this.ui.documentList.appendChild(listItem);
    },

    // --- ICONOS SVG (LUCIDE) ---
    icons: {
        user: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        bot: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-rhia-accent"><path d="m12 8-2 4 2 4 2-4-2-4z"></path><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.9 4.9 1.4 1.4"></path><path d="m17.7 17.7 1.4 1.4"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m4.9 19.1 1.4-1.4"></path><path d="m17.7 6.3 1.4-1.4"></path></svg>`,
        copy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
        thumbUp: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M7 10v12"></path><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3z"></path></svg>`,
        thumbDown: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M7 14v-8"></path><path d="M15 22.12 14 18H8.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 10.5 6H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3z"></path></svg>`,
    },

    appendMessage(html, sender, isThinking = false) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('py-6', 'px-4', 'max-w-3xl', 'mx-auto', 'transition-opacity', 'duration-300', 'opacity-0');

        const content = `
            <div class="flex items-start space-x-4">
                <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${sender === 'user' ? 'bg-gray-600' : 'bg-white dark:bg-rhia-light-gray'}">
                    ${sender === 'user' ? this.icons.user : this.icons.bot}
                </div>
                <div class="flex-grow prose prose-sm dark:prose-invert max-w-full">
                    ${html}
                </div>
            </div>
        `;

        if (isThinking) {
            messageWrapper.id = 'thinking-indicator';
            messageWrapper.innerHTML = `
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-rhia-light-gray">
                        ${this.icons.bot}
                    </div>
                    <div class="pt-1.5 flex items-center space-x-1">
                        <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                        <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style="animation-delay: 0.2s;"></div>
                        <div class="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style="animation-delay: 0.4s;"></div>
                    </div>
                </div>
            `;
        } else {
            messageWrapper.innerHTML = content;
        }

        this.ui.chatContainer.appendChild(messageWrapper);
        // Trigger the animation
        setTimeout(() => messageWrapper.classList.remove('opacity-0'), 10);
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
