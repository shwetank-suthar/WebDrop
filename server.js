const express = require('express');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const os = require('os');
const cors = require('cors');

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

// Set up PeerJS server with more detailed configuration
const peerServer = ExpressPeerServer(server, {
    debug: true,
    allow_discovery: true,
    path: '/',
    port: port,
    proxied: true,
    ssl: false,
    host: localIP
});

// Mount PeerJS server
app.use('/', peerServer);

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