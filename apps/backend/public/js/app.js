class JapaneseLawSearchApp {
    constructor() {
        this.currentConversationId = null;
        this.conversations = new Map();
        this.isLoading = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.createNewConversation();
    }

    initializeElements() {
        this.elements = {
            queryInput: document.getElementById('queryInput'),
            sendButton: document.getElementById('sendButton'),
            conversationHistory: document.getElementById('conversationHistory'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            conversationList: document.getElementById('conversationList'),
            newConversationButton: document.getElementById('newConversationButton'),
            categoryFilter: document.getElementById('categoryFilter'),
            eraFilter: document.getElementById('eraFilter')
        };
    }

    attachEventListeners() {
        // 送信ボタンクリック
        this.elements.sendButton.addEventListener('click', () => this.handleSendQuery());
        
        // Enterキーで送信（Shift+Enterで改行）
        this.elements.queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendQuery();
            }
        });

        // 新しい会話ボタン
        this.elements.newConversationButton.addEventListener('click', () => this.createNewConversation());

        // 入力値の変更監視
        this.elements.queryInput.addEventListener('input', () => this.updateSendButtonState());
    }

    updateSendButtonState() {
        const hasQuery = this.elements.queryInput.value.trim().length > 0;
        this.elements.sendButton.disabled = !hasQuery || this.isLoading;
    }

    async handleSendQuery() {
        const query = this.elements.queryInput.value.trim();
        if (!query || this.isLoading) return;

        this.setLoading(true);
        this.addUserMessage(query);
        this.elements.queryInput.value = '';
        this.updateSendButtonState();

        try {
            const filters = this.getSearchFilters();
            const response = await this.sendSearchRequest(query, filters);
            
            if (response.success) {
                this.handleSearchResponse(response.data);
            } else {
                this.addErrorMessage('検索中にエラーが発生しました。もう一度お試しください。');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.addErrorMessage('接続エラーが発生しました。しばらく待ってからお試しください。');
        } finally {
            this.setLoading(false);
        }
    }

    getSearchFilters() {
        return {
            filters: {
                category: this.elements.categoryFilter.value || undefined,
                era: this.elements.eraFilter.value || undefined
            }
        };
    }

    async sendSearchRequest(query, filters) {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                conversationId: this.currentConversationId,
                language: 'ja',
                ...filters
            })
        });

        return await response.json();
    }

    handleSearchResponse(data) {
        this.currentConversationId = data.conversationId;
        this.addAssistantMessage(data.answer, data.sources, data.relatedQuestions);
        this.updateConversationList();
    }

    addUserMessage(message) {
        const messageElement = this.createMessageElement('user', message);
        this.appendMessage(messageElement);
    }

    addAssistantMessage(message, sources = [], relatedQuestions = []) {
        const messageElement = this.createMessageElement('assistant', message, sources, relatedQuestions);
        this.appendMessage(messageElement);
    }

    addErrorMessage(message) {
        const messageElement = this.createMessageElement('assistant', `❌ ${message}`);
        messageElement.classList.add('error-message');
        this.appendMessage(messageElement);
    }

    createMessageElement(role, content, sources = [], relatedQuestions = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        messageDiv.appendChild(contentDiv);

        // ソース情報を追加
        if (sources && sources.length > 0) {
            const sourcesDiv = this.createSourcesElement(sources);
            messageDiv.appendChild(sourcesDiv);
        }

        // 関連質問を追加
        if (relatedQuestions && relatedQuestions.length > 0) {
            const relatedDiv = this.createRelatedQuestionsElement(relatedQuestions);
            messageDiv.appendChild(relatedDiv);
        }

        return messageDiv;
    }

    createSourcesElement(sources) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';

        const title = document.createElement('h4');
        title.textContent = '📚 参照文書';
        sourcesDiv.appendChild(title);

        sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';

            const titleSpan = document.createElement('div');
            titleSpan.className = 'source-title';
            titleSpan.textContent = source.title;

            const excerptSpan = document.createElement('div');
            excerptSpan.className = 'source-excerpt';
            excerptSpan.textContent = source.excerpt;

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'source-score';
            scoreSpan.textContent = `関連度: ${(source.score * 100).toFixed(1)}%`;

            sourceItem.appendChild(titleSpan);
            sourceItem.appendChild(excerptSpan);
            sourceItem.appendChild(scoreSpan);
            sourcesDiv.appendChild(sourceItem);
        });

        return sourcesDiv;
    }

    createRelatedQuestionsElement(questions) {
        const relatedDiv = document.createElement('div');
        relatedDiv.className = 'related-questions';

        const title = document.createElement('h4');
        title.textContent = '💡 関連する質問';
        relatedDiv.appendChild(title);

        questions.forEach(question => {
            const questionLink = document.createElement('a');
            questionLink.className = 'related-question';
            questionLink.href = '#';
            questionLink.textContent = question;
            questionLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.elements.queryInput.value = question;
                this.elements.queryInput.focus();
            });
            relatedDiv.appendChild(questionLink);
        });

        return relatedDiv;
    }

    appendMessage(messageElement) {
        // ウェルカムメッセージを削除
        const welcomeMessage = this.elements.conversationHistory.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.elements.conversationHistory.appendChild(messageElement);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.elements.conversationHistory.scrollTop = this.elements.conversationHistory.scrollHeight;
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.elements.loadingOverlay.classList.toggle('active', loading);
        this.updateSendButtonState();
    }

    createNewConversation() {
        this.currentConversationId = null;
        this.elements.conversationHistory.innerHTML = `
            <div class="welcome-message">
                <div class="message assistant-message">
                    <div class="message-content">
                        こんにちは！日本の法律文書について質問してください。
                        例：「憲法第9条について教えて」「民法の契約に関する条文は？」
                    </div>
                </div>
            </div>
        `;
        this.elements.queryInput.focus();
        this.updateConversationList();
    }

    updateConversationList() {
        // 簡単な実装として、現在の会話IDを表示
        if (this.currentConversationId && !this.conversations.has(this.currentConversationId)) {
            const conversationTitle = `会話 ${new Date().toLocaleTimeString()}`;
            const firstMessage = this.elements.conversationHistory.querySelector('.user-message .message-content');
            const preview = firstMessage ? firstMessage.textContent.substring(0, 30) + '...' : '新しい会話';
            
            this.conversations.set(this.currentConversationId, {
                title: conversationTitle,
                preview: preview,
                timestamp: new Date()
            });

            this.renderConversationList();
        }
    }

    renderConversationList() {
        this.elements.conversationList.innerHTML = '';

        Array.from(this.conversations.entries())
            .sort(([,a], [,b]) => b.timestamp - a.timestamp)
            .forEach(([id, conversation]) => {
                const item = document.createElement('div');
                item.className = 'conversation-item';
                if (id === this.currentConversationId) {
                    item.classList.add('active');
                }

                const title = document.createElement('div');
                title.className = 'conversation-title';
                title.textContent = conversation.title;

                const preview = document.createElement('div');
                preview.className = 'conversation-preview';
                preview.textContent = conversation.preview;

                item.appendChild(title);
                item.appendChild(preview);

                item.addEventListener('click', () => {
                    // 実際の実装では、会話履歴を読み込んで表示
                    this.loadConversation(id);
                });

                this.elements.conversationList.appendChild(item);
            });
    }

    async loadConversation(conversationId) {
        if (conversationId === this.currentConversationId) return;

        try {
            this.setLoading(true);
            const response = await fetch(`/api/conversations/${conversationId}`);
            
            if (response.ok) {
                const data = await response.json();
                this.currentConversationId = conversationId;
                this.renderConversationHistory(data.data.messages);
                this.renderConversationList();
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        } finally {
            this.setLoading(false);
        }
    }

    renderConversationHistory(messages) {
        this.elements.conversationHistory.innerHTML = '';
        
        messages.forEach(message => {
            if (message.role === 'user') {
                this.addUserMessage(message.content);
            } else {
                this.addAssistantMessage(message.content, message.sources || []);
            }
        });
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new JapaneseLawSearchApp();
});