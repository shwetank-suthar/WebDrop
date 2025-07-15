// WebSocket messaging functionality
class Messaging {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.messageHistory = [];
    }

    // Initialize WebSocket connection
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.ws = new WebSocket(`${protocol}//${host}/messaging`);

        this.ws.onopen = () => {
            this.connected = true;
            console.log('Messaging WebSocket connected');
            this.updateStatus(true);
            this.notify('Connected to chat');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.messageHistory.push(message);
            this.displayMessage(message);
        };

        this.ws.onclose = () => {
            this.connected = false;
            console.log('Messaging WebSocket disconnected');
            this.updateStatus(false);
            this.notify('Disconnected from chat');
            // Attempt to reconnect after 3 seconds
            setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('Messaging WebSocket error:', error);
            this.notify('Connection error', 'error');
        };
    }

    // Send a message through WebSocket
    sendMessage(content) {
        if (!this.connected || !this.ws) {
            this.notify('Not connected to chat', 'error');
            return;
        }

        const message = {
            sender: 'You',
            content: content,
            timestamp: new Date().toLocaleTimeString(),
            type: 'text'
        };

        this.ws.send(JSON.stringify(message));
        this.messageHistory.push(message);
        this.displayMessage(message);
    }

    // Display message in UI
    displayMessage(message) {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender === 'You' ? 'sent' : 'received'}`;
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="sender">${message.sender}</span>
                <span class="timestamp">${message.timestamp}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Update connection status UI
    updateStatus(connected) {
        const statusElement = document.getElementById('chatStatus');
        if (!statusElement) return;
        
        statusElement.textContent = connected ? 'Online' : 'Offline';
        statusElement.className = connected ? 'status online' : 'status offline';
    }

    // Show notification
    notify(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const notificationsContainer = document.getElementById('notifications');
        if (notificationsContainer) {
            notificationsContainer.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    }

    // Initialize messaging UI and event listeners
    init() {
        const messageForm = document.getElementById('messageForm');
        const messageInput = document.getElementById('messageInput');
        const copyButton = document.getElementById('copyMessage');

        if (messageForm) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const content = messageInput.value.trim();
                if (content) {
                    this.sendMessage(content);
                    messageInput.value = '';
                }
            });
        }

        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const lastMessage = this.messageHistory[this.messageHistory.length - 1];
                if (lastMessage && lastMessage.content) {
                    navigator.clipboard.writeText(lastMessage.content)
                        .then(() => this.notify('Message copied!'))
                        .catch(err => console.error('Failed to copy:', err));
                }
            });
        }

        this.connect();
    }
}

// Initialize messaging when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const messaging = new Messaging();
    messaging.init();
});
