import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@shared/services/apiClient';
import { profileService } from './profileService';

vi.mock('@shared/services/apiClient', () => ({
  apiClient: { put: vi.fn().mockResolvedValue({}), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

describe('profileService.uploadPhoto', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the file as multipart form data (the client default is JSON, which hides the file from the server)', async () => {
    const file = new File(['x'], 'yo.png', { type: 'image/png' });
    await profileService.uploadPhoto(file);

    const [url, body, config] = vi.mocked(apiClient.put).mock.calls[0];
    expect(url).toBe('/profile/photo');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });
});
