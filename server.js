const express = require('express');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const os = require('os');
const cors = require('cors');
const WebSocket = require('ws');
const url = require('url');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        // Look specifically for Wi-Fi adapter
        if (name.toLowerCase().includes('wi-fi')) {
            for (const iface of interfaces[name]) {
                // Skip non-IPv4 and internal addresses
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    }
    // Fallback to first available non-internal IPv4 address
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
console.log('Using network interface:', localIP);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at:`);
    console.log(`- Local: http://localhost:${port}`);
    console.log(`- Network: http://${localIP}:${port}`);
    console.log(`\nTo access from other devices:`);
    console.log(`1. Make sure all devices are on the same WiFi network`);
    console.log(`2. Open http://${localIP}:${port} in the browser`);
    console.log(`3. If not working, check firewall settings for port ${port}`);
});

// Configure WebSocket server
const wss = new WebSocket.Server({ 
    noServer: true,
    clientTracking: true,
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        threshold: 1024,
        concurrencyLimit: 10
    }
});

// Add keepalive ping every 30 seconds
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000);

wss.on('connection', (ws) => {
    ws.isAlive = true;
    console.log('New WebSocket connection from:', ws._socket.remoteAddress);
    
    // Broadcast messages to all connected clients
    ws.on('message', (message) => {
        console.log('WebSocket message received:', message.toString());
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
    
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    
    ws.on('close', () => console.log('WebSocket connection closed from:', ws._socket.remoteAddress));
    ws.on('error', (err) => console.error('WebSocket error:', err));
});

// Set up PeerJS server
const peerServer = ExpressPeerServer(server, {
    debug: 3, // Increased verbosity
    allow_discovery: true,
    path: '/peerjs',
    proxied: true
});

// Attach PeerJS as Express middleware
app.use('/peerjs', peerServer);

console.log('PeerJS server configured at:', {
    path: '/peerjs',
    port: port,
    host: localIP
});

// Handle HTTP upgrade requests ONLY for /messaging
server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;
    if (pathname === '/messaging') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        // Let Express/PeerJS handle all other upgrades
        socket.destroy();
    }
});

// Mount PeerJS server
app.use('/peerjs', peerServer);

// PeerJS server events for debugging
peerServer.on('connection', (client) => {
    console.log('Client connected:', client.getId());
});

peerServer.on('disconnect', (client) => {
    console.log('Client disconnected:', client.getId());
});

// Serve the local IP to clients
app.get('/network-info', (req, res) => {
    res.json({
        localIP,
        port
    });
});

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});