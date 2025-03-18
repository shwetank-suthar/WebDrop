function setupUI() {
    const dropZone = document.getElementById('dropZone');
    const connectButton = document.getElementById('connectButton');
    const peerInput = document.getElementById('peerInput');
    const copyNetworkUrl = document.getElementById('copyNetworkUrl');

    // Get network information
    fetch('/network-info')
        .then(response => response.json())
        .then(info => {
            const networkUrl = 'https://webdrop.in';
            document.getElementById('networkUrl').textContent = networkUrl;
            
             // Setup network URL copy button
             if (copyNetworkUrl) {
                copyNetworkUrl.addEventListener('click', async () => {
                    const networkUrlElement = document.getElementById('networkUrl');
                    const currentUrl = networkUrlElement ? networkUrlElement.textContent : '';
                    
                    if (!currentUrl) {
                        console.error('No network URL available');
                        const notification = document.getElementById('notification');
                        notification.textContent = 'No network URL available to copy';
                        notification.className = 'notification show error';
                        setTimeout(() => notification.classList.remove('show'), 3000);
                        return;
                    }

                    try {
                        // Create a temporary textarea
                        const textarea = document.createElement('textarea');
                        textarea.value = currentUrl;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        
                        // Try to copy
                        document.execCommand('copy');
                        document.body.removeChild(textarea);

                        // Update icon
                        const icon = copyNetworkUrl.querySelector('i.fas');
                        if (icon) {
                            const originalClass = icon.className;
                            icon.className = 'fas fa-check';
                            setTimeout(() => {
                                icon.className = originalClass;
                            }, 2000);
                        }
                        
                        // Show success notification
                        const notification = document.getElementById('notification');
                        notification.textContent = 'Network link copied to clipboard!';
                        notification.className = 'notification show success';
                        setTimeout(() => notification.classList.remove('show'), 3000);
                    } catch (err) {
                        console.error('Failed to copy:', err);
                        const notification = document.getElementById('notification');
                        notification.textContent = 'Failed to copy network link';
                        notification.className = 'notification show error';
                        setTimeout(() => notification.classList.remove('show'), 3000);
                    }
                });
            }

            // Create custom QR code with gradient effect
            createQRCode(networkUrl);
        })
        .catch(err => {
            console.error('Failed to get network info:', err);
            document.querySelector('.network-info').style.display = 'none';
        });

    // Connect button handler
    connectButton.addEventListener('click', () => {
        const peerId = peerInput.value.trim();
        if (peerId) {
            connectButton.disabled = true;
            connectButton.textContent = 'Connecting...';
            connectToPeer(peerId);
        }
    });

    // Enter key handler for peer input
    peerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            connectButton.click();
        }
    });

    // Drag and drop visual feedback
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    // File transfer events
    window.addEventListener('transfer-start', (e) => {
        showNotification(`Starting transfer of ${e.detail.fileName}`, 'info');
    });

    window.addEventListener('transfer-complete', (e) => {
        showNotification(`Successfully transferred ${e.detail.fileName}!`, 'success');
    });

    window.addEventListener('transfer-error', (e) => {
        showNotification(`Failed to transfer ${e.detail.fileName}`, 'error');
    });

    // Connection events
    window.addEventListener('connection-status', (e) => {
        if (e.detail.connected) {
            showNotification('Successfully connected to peer!', 'success');
        }
        connectButton.disabled = e.detail.connected;
        connectButton.textContent = e.detail.connected ? 'Connected' : 'Connect';
        peerInput.disabled = e.detail.connected;
    });

    window.addEventListener('connection-error', () => {
        showNotification('Connection failed. Please try again.', 'error');
        connectButton.disabled = false;
        connectButton.textContent = 'Connect';
    });

    // Show file transfer progress
    window.addEventListener('transfer-progress', (e) => {
        updateTransferProgress(e.detail.progress);
    });
}

// Create QR code with connection info
function createQRCode(baseUrl) {
    const peerId = document.getElementById('peerId').textContent;
    if (!peerId) {
        setTimeout(() => createQRCode(baseUrl), 500); // Retry if peer ID not yet available
        return;
    }

    // Create connection URL with peer ID
    const connectionUrl = 'https://webdrop.in?connect=' + encodeURIComponent(peerId);

    const qrContainer = document.getElementById('qrRoot');
    qrContainer.innerHTML = '';

    // Create QR wrapper
    const qrWrapper = document.createElement('div');
    qrWrapper.className = 'qr-wrapper';
    qrContainer.appendChild(qrWrapper);

    // Create gradient overlay
    const gradientOverlay = document.createElement('div');
    gradientOverlay.className = 'qr-gradient-overlay';
    qrWrapper.appendChild(gradientOverlay);

    // Create QR code container
    const qrCodeContainer = document.createElement('div');
    qrCodeContainer.className = 'qr-code';
    qrWrapper.appendChild(qrCodeContainer);

    // Generate QR Code with connection URL
    new QRCode(qrCodeContainer, {
        text: connectionUrl,
        width: 250,
        height: 250,
        colorDark: "#FFFFFF",
        colorLight: "rgba(0, 0, 0, 0)",
        correctLevel: QRCode.CorrectLevel.H,
    });

    // Add decorative elements container
    const effectsContainer = document.createElement('div');
    effectsContainer.className = 'qr-effects';
    qrWrapper.appendChild(effectsContainer);

    // Add animated circles
    for (let i = 0; i < 5; i++) {
        const circle = document.createElement('div');
        circle.className = 'qr-circle';
        circle.style.setProperty('--delay', `${i * 0.5}s`);
        effectsContainer.appendChild(circle);
    }

    // Add floating dots
    for (let i = 0; i < 20; i++) {
        const dot = document.createElement('div');
        dot.className = 'qr-dot';
        dot.style.setProperty('--x', `${Math.random() * 100}%`);
        dot.style.setProperty('--y', `${Math.random() * 100}%`);
        dot.style.setProperty('--delay', `${Math.random() * 3}s`);
        effectsContainer.appendChild(dot);
    }

    // Add WebDrop logo in the center
    const logoContainer = document.createElement('div');
    logoContainer.className = 'qr-logo';
    logoContainer.innerHTML = `
        <div class="logo-content">
            <i class="fas fa-satellite-dish"></i>
            <span>WebDrop</span>
        </div>
    `;
    qrWrapper.appendChild(logoContainer);
}

function updateTransferProgress(progress) {
    const progressBar = document.querySelector('.progress-bar-fill');
    const transferProgress = document.querySelector('.transfer-progress');
    
    if (progress === 0 || progress === 100) {
        transferProgress.style.display = 'none';
        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 300);
    } else {
        transferProgress.style.display = 'block';
        progressBar.style.width = `${progress}%`;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Handle connection parameters from URL
function handleConnectionParams() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('?connect=')) {
        const peerId = decodeURIComponent(hash.substring(9));
        if (peerId) {
            // Clear the hash to avoid reconnection on refresh
            window.location.hash = '';
            
            // Small delay to ensure peer connection is initialized
            setTimeout(() => {
                const connectButton = document.getElementById('connectButton');
                const peerInput = document.getElementById('peerInput');
                if (peerInput && connectButton) {
                    peerInput.value = peerId;
                    // connectButton.click();
                    connectToPeer(peerId);
                }
            }, 1000);
        }
    }
}

// Add connection parameter handler to window load
window.addEventListener('load', handleConnectionParams);

// Initialize UI
window.addEventListener('load', setupUI);