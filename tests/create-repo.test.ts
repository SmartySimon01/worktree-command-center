import { describe, it, expect } from 'vitest';
import { repoDirName } from '../src/create-repo';

describe('repoDirName', () => {
	it('keeps a clean name unchanged', () => {
		expect(repoDirName('my-project')).toBe('my-project');
		expect(repoDirName('App_v2.0')).toBe('App_v2.0');
	});
	it('replaces spaces and unsafe chars with hyphens', () => {
		expect(repoDirName('My New Repo')).toBe('My-New-Repo');
		expect(repoDirName('foo/bar:baz')).toBe('foo-bar-baz');
	});
	it('trims leading/trailing separators and whitespace', () => {
		expect(repoDirName('  spaced  ')).toBe('spaced');
		expect(repoDirName('--edge--')).toBe('edge');
	});
	it('returns empty string when nothing usable remains', () => {
		expect(repoDirName('')).toBe('');
		expect(repoDirName('///')).toBe('');
		expect(repoDirName('   ')).toBe('');
	});
	it('caps very long names', () => {
		expect(repoDirName('a'.repeat(200)).length).toBe(80);
	});
});
