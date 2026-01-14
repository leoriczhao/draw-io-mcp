import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        testTimeout: 10000,
        hookTimeout: 10000,
        include: ['tests/**/*.test.js'],
        coverage: {
            provider: 'v8',
            include: ['lib/**/*.js', 'index.js'],
            exclude: ['tests/**']
        }
    }
});
