let peer;
let conn;

function initializePeer() {
    if (peer) {
        peer.destroy();
    }

    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'https' ? 443 : 80);

    function generateRandomId(length) {
        // const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const characters = '0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    peer = new Peer(generateRandomId(6), {
        host: host,
        port: port,
        path: '/',
        debug: 3,
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    console.log('Initializing peer connection...', {
        host: host,
        port: port,
        path: '/'
    });

    peer.on('open', handlePeerOpen);
    peer.on('connection', handleIncomingConnection);
    peer.on('error', handlePeerError);

    // Check for connection parameters after peer is initialized
    if (typeof handleConnectionParams === 'function') {
        handleConnectionParams();
    }
}

function handlePeerOpen(id) {
    console.log('Connected to server with ID:', id);
    document.getElementById('peerId').textContent = id;
    generateQRCode();
    updateConnectionStatus(false);
    
    // Setup copy ID button
    const copyButton = document.getElementById('copyId');
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(id)
            .then(() => {
                copyButton.textContent = '✓';
                setTimeout(() => copyButton.textContent = '📋', 2000);
            })
            .catch(console.error);
    });
    
    checkUrlParams();
}

function handleIncomingConnection(connection) {
    console.log('Incoming connection from:', connection.peer);
    conn = connection;
    setupConnection();
}

function handlePeerError(err) {
    console.error('Peer error:', err);
    updateConnectionStatus(false);
    window.dispatchEvent(new Event('connection-error'));

    // Attempt to reinitialize on error
    setTimeout(() => {
        console.log('Attempting to reinitialize peer connection...');
        initializePeer();
    }, 5000);
}

function setupConnection() {
    if (!conn) {
        console.error('No connection to setup');
        return;
    }

    conn.on('open', () => {
        console.log('Connected to peer:', conn.peer);
        updateConnectionStatus(true);
    });

    conn.on('data', handleIncomingData);
    
    conn.on('close', () => {
        console.log('Connection closed');
        updateConnectionStatus(false);
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        updateConnectionStatus(false);
    });
}

function connectToPeer(peerId) {
    if (!peer) {
        console.error('Peer not initialized');
        return;
    }

    if (conn) {
        conn.close();
    }

    try {
        console.log('Attempting to connect to:', peerId);
        conn = peer.connect(peerId, {
            reliable: true
        });
        setupConnection();
    } catch (err) {
        console.error('Failed to connect:', err);
        window.dispatchEvent(new Event('connection-error'));
    }
}

function updateConnectionStatus(connected) {
    const statusText = document.getElementById('statusText');
    const indicator = document.getElementById('statusIndicator');
    
    if (connected) {
        statusText.textContent = 'Connected';
        indicator.classList.add('connected');
    } else {
        statusText.textContent = 'Disconnected';
        indicator.classList.remove('connected');
    }

    window.dispatchEvent(new CustomEvent('connection-status', {
        detail: { connected }
    }));
}

function generateQRCode() {
    if (!peer || !peer.id) {
        console.error('Peer ID not available');
        return;
    }

    const qrContainer = document.getElementById('qrRoot');
    qrContainer.innerHTML = '';
    
    // Get the full URL for the QR code
    const url = new URL(window.location.href);
    url.searchParams.set('connect', peer.id);
    
    new QRCode(qrContainer, {
        text: url.toString(),
        width: 128,
        height: 128,
        colorDark: '#2196F3',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const connectId = urlParams.get('connect');
    
    if (connectId) {
        console.log('Found connect ID in URL:', connectId);
        document.getElementById('peerInput').value = connectId;
        setTimeout(() => {
            document.getElementById('connectButton').click();
        }, 1000);
    }
}

function setupCopyButton() {
    const copyButton = document.getElementById('copyId');
    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            const peerIdElement = document.getElementById('peerId');
            const currentId = peerIdElement ? peerIdElement.textContent : '';
            
            if (!currentId) {
                console.error('No peer ID available');
                const notification = document.getElementById('notification');
                notification.textContent = 'No peer ID available to copy';
                notification.className = 'notification show error';
                setTimeout(() => notification.classList.remove('show'), 3000);
                return;
            }

            try {
                // Create a temporary textarea
                const textarea = document.createElement('textarea');
                textarea.value = currentId;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                
                // Try to copy
                document.execCommand('copy');
                document.body.removeChild(textarea);

                // Update icon
                const icon = copyButton.querySelector('i.fas');
                if (icon) {
                    const originalClass = icon.className;
                    icon.className = 'fas fa-check';
                    setTimeout(() => {
                        icon.className = originalClass;
                    }, 2000);
                }
                
                // Show success notification
                const notification = document.getElementById('notification');
                notification.textContent = 'ID copied to clipboard!';
                notification.className = 'notification show success';
                setTimeout(() => notification.classList.remove('show'), 3000);
            } catch (err) {
                console.error('Failed to copy:', err);
                const notification = document.getElementById('notification');
                notification.textContent = 'Failed to copy ID';
                notification.className = 'notification show error';
                setTimeout(() => notification.classList.remove('show'), 3000);
            }
        });
    }
}

// Initialize connection and UI when page loads
window.addEventListener('load', () => {
    initializePeer();
    setupCopyButton();
});