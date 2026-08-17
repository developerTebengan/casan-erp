import { describe, it, expect } from 'vitest';
import { validatePasswordChange } from './user.service';

describe('validatePasswordChange', () => {
	it('requires 8+ and matching confirm', () => {
		expect(validatePasswordChange('old', 'short', 'short').valid).toBe(false);
		expect(validatePasswordChange('old', 'newpassword', 'other').valid).toBe(false);
		expect(validatePasswordChange('old', 'newpassword', 'newpassword').valid).toBe(true);
	});
});
