import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();

function readTemplate(fileName: string) {
  return readFileSync(
    path.join(repositoryRoot, 'supabase', 'templates', fileName),
    'utf8',
  );
}

describe('Supabase Auth email templates', () => {
  it('keeps confirmation and recovery links in Terraforming Mars style', () => {
    for (const fileName of ['confirmation.html', 'recovery.html']) {
      const template = readTemplate(fileName);

      expect(template).toContain('Mission Control');
      expect(template).toContain('Terraforming Mars Stats | tm-stats.com');
      expect(template).toContain('{{ .ConfirmationURL }}');
      expect(template).not.toContain('Â');
    }
  });

  it('keeps the password-changed notification themed and actionable', () => {
    const template = readTemplate('password-changed.html');

    expect(template).toContain('Mission Control');
    expect(template).toContain('Secure My Account');
    expect(template).toContain('{{ .SiteURL }}/forgot-pin');
    expect(template).not.toContain('Â');
  });
});
