import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node', // Simulates a browser-like environment
		setupFiles: './src/tests/setup.js', // Load our mock setup before tests
		mockReset: true, // Ensures each test starts fresh
		globals: true // Allows using describe(), it(), expect() globally
	}
});
