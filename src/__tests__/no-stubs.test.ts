import { describe, it, expect } from 'vitest';
// @ts-expect-error - node fs types might be missing
import { readFileSync } from 'fs';
import { globSync } from 'glob';

describe('Stub-proofing', () => {
  it('scans all src files for stubs and alerts', () => {
    // Find all files in src, excluding __tests__ and test files
    const files = globSync('src/**/*', { 
      nodir: true,
      ignore: ['src/**/__tests__/**', 'src/**/*.test.*', 'src/**/*.spec.*']
    });

    const violations: string[] = [];
    const hasStub = (line: string) => {
      if (/TODO|FIXME|coming soon|not implemented/i.test(line)) return true;
      if (/\b(alert|confirm|prompt)\(/i.test(line) && !line.includes('window.confirm') && !line.includes('function Alert')) return true;
      return false;
    };

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (hasStub(lines[i])) {
          violations.push(`${file}:${i + 1}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
