import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createServer } from '../lib/server.js';

describe('WebSocket Integration', () => {
    let server;
    let wsUrl;

    beforeEach(async () => {
        server = createServer({ port: 0, commandTimeout: 500 });
        const { port } = await server.start();
        wsUrl = `ws://localhost:${port}`;
    });

    afterEach(async () => {
        await server.stop();
    });

    function connectClient() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            ws.on('open', () => resolve(ws));
            ws.on('error', reject);
        });
    }

    describe('connection', () => {
        it('accepts WebSocket connections', async () => {
            const ws = await connectClient();
            expect(ws.readyState).toBe(WebSocket.OPEN);
            ws.close();
        });

        it('updates health status when client connects', async () => {
            const port = wsUrl.split(':').pop();
            const baseUrl = `http://localhost:${port}`;

            let response = await fetch(`${baseUrl}/health`);
            let data = await response.json();
            expect(data.wsConnected).toBe(false);

            const ws = await connectClient();
            await new Promise(r => setTimeout(r, 50));

            response = await fetch(`${baseUrl}/health`);
            data = await response.json();
            expect(data.wsConnected).toBe(true);

            ws.close();
        });
    });

    describe('command handling', () => {
        it('sends command to connected client and receives response', async () => {
            const ws = await connectClient();

            ws.on('message', (data) => {
                const cmd = JSON.parse(data.toString());
                ws.send(JSON.stringify({
                    type: 'result',
                    commandId: cmd.id,
                    result: { success: true, data: 'test response' }
                }));
            });

            await new Promise(r => setTimeout(r, 50));

            const result = await server.sendCommand('test_action', { param: 'value' });

            expect(result).toEqual({ success: true, data: 'test response' });
            ws.close();
        });

        it('times out if client does not respond', async () => {
            const ws = await connectClient();
            await new Promise(r => setTimeout(r, 50));

            const result = await server.sendCommand('test_action', {});

            expect(result).toEqual({ success: false, error: 'Command timeout' });
            ws.close();
        });

        it('handles execute_script action', async () => {
            const ws = await connectClient();

            ws.on('message', (data) => {
                const cmd = JSON.parse(data.toString());
                expect(cmd.action).toBe('execute_script');
                expect(cmd.script).toBe('return 1 + 1');

                ws.send(JSON.stringify({
                    type: 'result',
                    commandId: cmd.id,
                    result: { success: true, result: 2 }
                }));
            });

            await new Promise(r => setTimeout(r, 50));

            const result = await server.sendCommand('execute_script', { script: 'return 1 + 1' });

            expect(result).toEqual({ success: true, result: 2 });
            ws.close();
        });
    });

    describe('disconnect handling', () => {
        it('clears active client on disconnect', async () => {
            const port = wsUrl.split(':').pop();
            const baseUrl = `http://localhost:${port}`;

            const ws = await connectClient();
            await new Promise(r => setTimeout(r, 50));

            let response = await fetch(`${baseUrl}/health`);
            let data = await response.json();
            expect(data.wsConnected).toBe(true);

            ws.close();
            await new Promise(r => setTimeout(r, 50));

            response = await fetch(`${baseUrl}/health`);
            data = await response.json();
            expect(data.wsConnected).toBe(false);
        });

        it('returns error when sending command without client', async () => {
            const result = await server.sendCommand('test_action', {});

            expect(result).toEqual({
                success: false,
                error: 'No WebSocket client connected - is Draw.io open?'
            });
        });
    });
});
