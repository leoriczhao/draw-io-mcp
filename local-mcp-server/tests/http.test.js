import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from '../lib/server.js';

describe('HTTP Server', () => {
    let server;
    let baseUrl;

    beforeEach(async () => {
        server = createServer({ port: 0 });
        const { port } = await server.start();
        baseUrl = `http://localhost:${port}`;
    });

    afterEach(async () => {
        await server.stop();
    });

    describe('GET /health', () => {
        it('returns status ok with no client connected', async () => {
            const response = await fetch(`${baseUrl}/health`);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({
                status: 'ok',
                wsConnected: false,
                pendingCommands: 0
            });
        });
    });

    describe('GET /poll', () => {
        it('returns null for backward compatibility', async () => {
            const response = await fetch(`${baseUrl}/poll`);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toBe(null);
        });
    });

    describe('POST /result', () => {
        it('returns received confirmation', async () => {
            const response = await fetch(`${baseUrl}/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: 'data' })
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({ received: true });
        });
    });

    describe('POST /focus', () => {
        it('returns ok confirmation', async () => {
            const response = await fetch(`${baseUrl}/focus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toEqual({ ok: true });
        });
    });
});
