import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /auth/complete', () => {
  it('redirects to the requested internal page', () => {
    const response = GET(
      new Request(
        'https://tm-stats.com/auth/complete?next=%2Fprofile',
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://tm-stats.com/profile',
    );
  });

  it('falls back to profile for an unsafe destination', () => {
    const response = GET(
      new Request(
        'https://tm-stats.com/auth/complete?next=https%3A%2F%2Fevil.example',
      ),
    );

    expect(response.headers.get('location')).toBe(
      'https://tm-stats.com/profile',
    );
  });
});
