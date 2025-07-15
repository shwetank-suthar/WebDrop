let peer;
let conn;

// Initialize PeerJS
function initializePeer() {
    peer = new Peer({
        host: window.location.hostname,
        port: window.location.port,
        path: '/peerjs'
    });

    peer.on('open', (id) => {
        document.getElementById('peerId').textContent = id;
        generateQRCode(`${window.location.href}?connect=${id}`);
        updateStatus(true);
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
        updateStatus(true);
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        updateStatus(false);
    });
}

function setupConnection() {
    conn.on('data', (data) => {
        if (data.type === 'file') {
            handleReceivedFile(data);
        }
    });

    conn.on('close', () => updateStatus(false));
}

function handleReceivedFile(fileData) {
    const link = document.createElement('a');
    link.href = fileData.data;
    link.download = fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function generateQRCode(text) {
    const qrcode = new QRCode(document.getElementById('qrCode'), {
        text: text,
        width: 160,
        height: 160,
        colorDark: "#2196F3",
        colorLight: "#ffffff"
    });
}

function updateStatus(connected) {
    const status = document.getElementById('connectionStatus');
    status.className = connected ? 'status connected' : 'status disconnected';
    status.textContent = connected ? 'Connected' : 'Disconnected';
}

function setupEventListeners() {
    // File input handling
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // Click handler
    dropZone.addEventListener('click', () => fileInput.click());
    
    // File selection handler
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    // Drag & drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#e3f2fd';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = 'white';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = 'white';
        handleFiles(e.dataTransfer.files);
    });
    
    // Connection handler
    document.getElementById('connectButton').addEventListener('click', () => {
        const peerId = document.getElementById('peerInput').value;
        if (peerId) {
            conn = peer.connect(peerId);
            conn.on('open', () => {
                setupConnection();
                updateStatus(true);
            });
        }
    });
}

function handleFiles(files) {
    if (!conn) {
        alert('Not connected to any peer!');
        return;
    }

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            conn.send({
                type: 'file',
                name: file.name,
                size: file.size,
                data: e.target.result
            });
        };
        reader.readAsDataURL(file);
    });
}

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const peerId = params.get('connect');
    if (peerId) {
        conn = peer.connect(peerId);
        conn.on('open', () => {
            setupConnection();
            updateStatus(true);
        });
    }
}

// Initialize application
function init() {
    initializePeer();
    setupEventListeners();
    checkUrlParams();
}

// Start the app
window.addEventListener('load', init);