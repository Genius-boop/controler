const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

let clients = {};

server.on('connection', (ws) => {
    let deviceId = null;
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            console.log('📨 Reçu:', msg);
            
            if (msg.type === 'register') {
                deviceId = msg.deviceId;
                clients[deviceId] = ws;
                console.log(`✅ Client enregistré: ${deviceId}`);
                
                // Envoyer la liste des appareils connectés
                broadcastList();
            }
            
            if (msg.type === 'get_devices') {
                sendDeviceList(ws);
            }
            
            if (msg.type === 'ring') {
                const targetWs = clients[msg.targetId];
                if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(JSON.stringify({
                        type: 'ring',
                        fromId: msg.fromId
                    }));
                    ws.send(JSON.stringify({ status: 'sent', message: 'Sonnerie envoyée' }));
                    console.log(`🔔 Sonnerie envoyée à ${msg.targetId}`);
                } else {
                    ws.send(JSON.stringify({ status: 'offline', message: 'Téléphone hors ligne' }));
                }
            }
        } catch(e) {
            console.error('Erreur:', e);
        }
    });
    
    ws.on('close', () => {
        if (deviceId && clients[deviceId]) {
            delete clients[deviceId];
            console.log(`❌ Client déconnecté: ${deviceId}`);
            broadcastList();
        }
    });
});

function broadcastList() {
    const deviceList = Object.keys(clients);
    const message = JSON.stringify({ type: 'device_list', devices: deviceList });
    Object.values(clients).forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function sendDeviceList(ws) {
    ws.send(JSON.stringify({ type: 'device_list', devices: Object.keys(clients) }));
}

console.log('🚀 Serveur WebSocket démarré sur le port', process.env.PORT || 8080);