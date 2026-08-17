import { describe, it, expect } from 'vitest';
import { isSessionSecretSafe } from './auth';

describe('isSessionSecretSafe', () => {
	it('rejects missing and default secret in production', () => {
		expect(isSessionSecretSafe('production', undefined)).toBe(false);
		expect(
			isSessionSecretSafe('production', 'casan-erp-development-secret-change-in-production')
		).toBe(false);
		expect(isSessionSecretSafe('production', 'a-long-random-secret')).toBe(true);
		expect(isSessionSecretSafe('development', undefined)).toBe(true);
	});
});
