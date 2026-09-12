import { describe, expect, it } from 'vitest';
import { destinationAfterLogin } from './authNavigation';

describe('destinationAfterLogin', () => {
  it('keeps the classroom QR code through authentication', () => {
    expect(destinationAfterLogin('student', '/aluno?code=1234')).toBe('/aluno?code=1234');
  });
  it('rejects external URLs and destinations from another role', () => {
    for (const from of ['https://example.com', '//example.com', '/aluno-extra', '/professor', undefined]) {
      expect(destinationAfterLogin('student', from)).toBe('/aluno');
    }
  });
});
