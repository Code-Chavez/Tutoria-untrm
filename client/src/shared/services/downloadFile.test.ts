import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@shared/services/apiClient';
import { downloadFile } from './downloadFile';

vi.mock('@shared/services/apiClient', () => ({ apiClient: { get: vi.fn() } }));

const mocked = vi.mocked(apiClient.get);

describe('downloadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.mockResolvedValue({ data: new Blob(['x']) });
    window.URL.createObjectURL = vi.fn(() => 'blob:fake');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('pide el archivo como blob con los filtros presentes y omite los vacíos', async () => {
    await downloadFile('/indicators/pdf', 'x.pdf', { facultyId: 'f1', schoolId: undefined, tutorId: '' });

    expect(mocked).toHaveBeenCalledWith('/indicators/pdf?facultyId=f1', { responseType: 'blob' });
  });

  it('sin filtros no agrega query string y dispara la descarga con el nombre indicado', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await downloadFile('/students/s1/record/pdf', 'expediente.pdf');

    expect(mocked).toHaveBeenCalledWith('/students/s1/record/pdf', { responseType: 'blob' });
    expect(click).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    click.mockRestore();
  });

  it('propaga el error de la API para que quien llama lo muestre', async () => {
    mocked.mockRejectedValue(new Error('403'));

    await expect(downloadFile('/indicators/pdf', 'x.pdf')).rejects.toThrow('403');
  });
});
