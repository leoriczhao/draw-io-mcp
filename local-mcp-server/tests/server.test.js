import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCommandManager, createClientManager, createCommandSender } from '../lib/server.js';

describe('createCommandManager', () => {
    let manager;

    beforeEach(() => {
        manager = createCommandManager();
    });

    describe('size', () => {
        it('returns 0 when empty', () => {
            expect(manager.size).toBe(0);
        });

        it('returns count of pending commands', () => {
            manager.add('cmd-1', vi.fn(), null);
            manager.add('cmd-2', vi.fn(), null);
            expect(manager.size).toBe(2);
        });
    });

    describe('add', () => {
        it('adds a pending command', () => {
            const resolve = vi.fn();
            manager.add('cmd-1', resolve, null);
            expect(manager.has('cmd-1')).toBe(true);
        });
    });

    describe('resolve', () => {
        it('calls resolve function with result and removes command', () => {
            const resolve = vi.fn();
            const timeout = setTimeout(() => {}, 10000);
            manager.add('cmd-1', resolve, timeout);

            const resolved = manager.resolve('cmd-1', { data: 'test' });

            expect(resolved).toBe(true);
            expect(resolve).toHaveBeenCalledWith({ data: 'test' });
            expect(manager.has('cmd-1')).toBe(false);
        });

        it('clears timeout when resolving', () => {
            vi.useFakeTimers();
            const resolve = vi.fn();
            const timeout = setTimeout(() => {}, 10000);
            manager.add('cmd-1', resolve, timeout);

            manager.resolve('cmd-1', { data: 'test' });

            vi.advanceTimersByTime(15000);
            vi.useRealTimers();
        });

        it('returns false for non-existent command', () => {
            expect(manager.resolve('non-existent', {})).toBe(false);
        });
    });

    describe('remove', () => {
        it('removes a pending command without resolving', () => {
            const resolve = vi.fn();
            manager.add('cmd-1', resolve, null);

            const removed = manager.remove('cmd-1');

            expect(removed).toBe(true);
            expect(manager.has('cmd-1')).toBe(false);
            expect(resolve).not.toHaveBeenCalled();
        });

        it('returns false for non-existent command', () => {
            expect(manager.remove('non-existent')).toBe(false);
        });
    });

    describe('has', () => {
        it('returns true for existing command', () => {
            manager.add('cmd-1', vi.fn(), null);
            expect(manager.has('cmd-1')).toBe(true);
        });

        it('returns false for non-existent command', () => {
            expect(manager.has('non-existent')).toBe(false);
        });
    });

    describe('clear', () => {
        it('removes all pending commands', () => {
            manager.add('cmd-1', vi.fn(), null);
            manager.add('cmd-2', vi.fn(), null);

            manager.clear();

            expect(manager.size).toBe(0);
        });
    });
});

describe('createClientManager', () => {
    let manager;

    beforeEach(() => {
        manager = createClientManager();
    });

    describe('client', () => {
        it('returns null initially', () => {
            expect(manager.client).toBe(null);
        });

        it('returns active client after setClient', () => {
            const mockWs = { readyState: 1 };
            manager.setClient(mockWs);
            expect(manager.client).toBe(mockWs);
        });
    });

    describe('isConnected', () => {
        it('returns false when no client', () => {
            expect(manager.isConnected).toBe(false);
        });

        it('returns false when client readyState is not OPEN', () => {
            manager.setClient({ readyState: 0 });
            expect(manager.isConnected).toBe(false);
        });

        it('returns true when client readyState is OPEN (1)', () => {
            manager.setClient({ readyState: 1 });
            expect(manager.isConnected).toBe(true);
        });
    });

    describe('setClient', () => {
        it('sets the active client', () => {
            const mockWs = { readyState: 1 };
            manager.setClient(mockWs);
            expect(manager.client).toBe(mockWs);
        });
    });

    describe('clearClient', () => {
        it('clears client if it matches', () => {
            const mockWs = { readyState: 1 };
            manager.setClient(mockWs);
            manager.clearClient(mockWs);
            expect(manager.client).toBe(null);
        });

        it('does not clear client if it does not match', () => {
            const mockWs1 = { readyState: 1 };
            const mockWs2 = { readyState: 1 };
            manager.setClient(mockWs1);
            manager.clearClient(mockWs2);
            expect(manager.client).toBe(mockWs1);
        });
    });

    describe('send', () => {
        it('returns false when not connected', () => {
            expect(manager.send({ data: 'test' })).toBe(false);
        });

        it('sends JSON stringified data to client', () => {
            const mockWs = {
                readyState: 1,
                send: vi.fn()
            };
            manager.setClient(mockWs);

            const result = manager.send({ data: 'test' });

            expect(result).toBe(true);
            expect(mockWs.send).toHaveBeenCalledWith('{"data":"test"}');
        });

        it('sends string data as-is', () => {
            const mockWs = {
                readyState: 1,
                send: vi.fn()
            };
            manager.setClient(mockWs);

            manager.send('raw string');

            expect(mockWs.send).toHaveBeenCalledWith('raw string');
        });

        it('returns false if send throws', () => {
            const mockWs = {
                readyState: 1,
                send: vi.fn().mockImplementation(() => {
                    throw new Error('Send failed');
                })
            };
            manager.setClient(mockWs);

            expect(manager.send({ data: 'test' })).toBe(false);
        });
    });
});

describe('createCommandSender', () => {
    let clientManager;
    let commandManager;
    let sendCommand;

    beforeEach(() => {
        clientManager = createClientManager();
        commandManager = createCommandManager();
        sendCommand = createCommandSender(clientManager, commandManager, 100);
    });

    it('returns error when no client connected', async () => {
        const result = await sendCommand('test_action', {});
        expect(result).toEqual({
            success: false,
            error: 'No WebSocket client connected - is Draw.io open?'
        });
    });

    it('sends command to client when connected', async () => {
        const mockWs = {
            readyState: 1,
            send: vi.fn()
        };
        clientManager.setClient(mockWs);

        const resultPromise = sendCommand('test_action', { param: 'value' });

        expect(mockWs.send).toHaveBeenCalled();
        const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
        expect(sentData.action).toBe('test_action');
        expect(sentData.param).toBe('value');
        expect(sentData.id).toBeDefined();

        commandManager.resolve(sentData.id, { success: true });
        const result = await resultPromise;
        expect(result).toEqual({ success: true });
    });

    it('times out if no response', async () => {
        vi.useFakeTimers();
        const mockWs = {
            readyState: 1,
            send: vi.fn()
        };
        clientManager.setClient(mockWs);

        const resultPromise = sendCommand('test_action', {});

        vi.advanceTimersByTime(150);

        const result = await resultPromise;
        expect(result).toEqual({ success: false, error: 'Command timeout' });
        vi.useRealTimers();
    });

    it('returns error if send fails', async () => {
        const mockWs = {
            readyState: 1,
            send: vi.fn().mockImplementation(() => {
                throw new Error('Send failed');
            })
        };
        clientManager.setClient(mockWs);

        const result = await sendCommand('test_action', {});
        expect(result).toEqual({ success: false, error: 'Failed to send command' });
    });
});
