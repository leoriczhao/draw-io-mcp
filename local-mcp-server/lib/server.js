import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import http from 'http';

export const DEFAULT_COMMAND_TIMEOUT = 30000;
export const DEFAULT_HTTP_PORT = 3000;

export function createCommandManager() {
    const pendingResults = new Map();

    return {
        get size() {
            return pendingResults.size;
        },

        add(commandId, resolve, timeout) {
            pendingResults.set(commandId, { resolve, timeout });
        },

        resolve(commandId, result) {
            const pending = pendingResults.get(commandId);
            if (pending) {
                clearTimeout(pending.timeout);
                pending.resolve(result);
                pendingResults.delete(commandId);
                return true;
            }
            return false;
        },

        remove(commandId) {
            const pending = pendingResults.get(commandId);
            if (pending) {
                clearTimeout(pending.timeout);
                pendingResults.delete(commandId);
                return true;
            }
            return false;
        },

        has(commandId) {
            return pendingResults.has(commandId);
        },

        clear() {
            for (const [, pending] of pendingResults) {
                clearTimeout(pending.timeout);
            }
            pendingResults.clear();
        }
    };
}

export function createClientManager() {
    let activeClient = null;

    return {
        get client() {
            return activeClient;
        },

        get isConnected() {
            return activeClient !== null && activeClient.readyState === 1;
        },

        setClient(ws) {
            activeClient = ws;
        },

        clearClient(ws) {
            if (activeClient === ws) {
                activeClient = null;
            }
        },

        send(data) {
            if (!this.isConnected) {
                return false;
            }
            try {
                activeClient.send(typeof data === 'string' ? data : JSON.stringify(data));
                return true;
            } catch (e) {
                return false;
            }
        }
    };
}

export function createCommandSender(clientManager, commandManager, timeout = DEFAULT_COMMAND_TIMEOUT) {
    return function sendCommand(action, params) {
        return new Promise((resolve) => {
            if (!clientManager.isConnected) {
                resolve({ success: false, error: 'No WebSocket client connected - is Draw.io open?' });
                return;
            }

            const commandId = uuidv4();
            const cmd = { id: commandId, action, ...params };

            const timeoutHandle = setTimeout(() => {
                commandManager.remove(commandId);
                resolve({ success: false, error: 'Command timeout' });
            }, timeout);

            commandManager.add(commandId, resolve, timeoutHandle);

            const sent = clientManager.send(cmd);
            if (!sent) {
                commandManager.remove(commandId);
                resolve({ success: false, error: 'Failed to send command' });
            }
        });
    };
}

export function createHttpApp(clientManager, commandManager) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            wsConnected: clientManager.isConnected,
            pendingCommands: commandManager.size
        });
    });

    app.get('/poll', (req, res) => res.json(null));
    app.post('/result', (req, res) => res.json({ received: true }));
    app.post('/focus', (req, res) => res.json({ ok: true }));

    return app;
}

export function setupWebSocket(httpServer, clientManager, commandManager, options = {}) {
    const { onConnect, onDisconnect, onError } = options;
    const wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', (ws) => {
        clientManager.setClient(ws);
        if (onConnect) onConnect(ws);

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'result' && msg.commandId) {
                    commandManager.resolve(msg.commandId, msg.result);
                }
            } catch (e) {
            }
        });

        ws.on('close', () => {
            clientManager.clearClient(ws);
            if (onDisconnect) onDisconnect(ws);
        });

        ws.on('error', (err) => {
            if (onError) onError(err, ws);
        });
    });

    return wss;
}

export function createServer(options = {}) {
    const {
        port = DEFAULT_HTTP_PORT,
        commandTimeout = DEFAULT_COMMAND_TIMEOUT,
        onConnect,
        onDisconnect,
        onError
    } = options;

    const commandManager = createCommandManager();
    const clientManager = createClientManager();
    const app = createHttpApp(clientManager, commandManager);
    const httpServer = http.createServer(app);
    const wss = setupWebSocket(httpServer, clientManager, commandManager, {
        onConnect,
        onDisconnect,
        onError
    });
    const sendCommand = createCommandSender(clientManager, commandManager, commandTimeout);

    return {
        app,
        httpServer,
        wss,
        clientManager,
        commandManager,
        sendCommand,
        start() {
            return new Promise((resolve) => {
                httpServer.listen(port, '0.0.0.0', () => {
                    const actualPort = httpServer.address().port;
                    resolve({ port: actualPort });
                });
            });
        },
        stop() {
            return new Promise((resolve) => {
                commandManager.clear();
                wss.close();
                httpServer.close(resolve);
            });
        }
    };
}
