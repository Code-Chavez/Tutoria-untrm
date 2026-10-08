import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignedDocumentsPanel } from './SignedDocumentsPanel';
import { signedDocumentService, type SignedDocument } from '../services/signedDocumentService';

vi.mock('../services/signedDocumentService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/signedDocumentService')>();
  return { ...actual, signedDocumentService: { download: vi.fn() } };
});
const mocked = vi.mocked(signedDocumentService);

const doc: SignedDocument = {
  id: 'd1',
  kind: 'REFERRAL_CONSTANCIA',
  fileName: 'constancia-firmada.pdf',
  mimeType: 'application/pdf',
  fileSize: 2048,
  sha256: 'a'.repeat(64),
  uploadedByName: 'Elena Ramírez',
  createdAt: '2026-10-08T15:30:00.000Z',
};

const setup = (over: Partial<React.ComponentProps<typeof SignedDocumentsPanel>> = {}) =>
  render(
    <SignedDocumentsPanel
      title="Constancia firmada"
      hint="Imprima, firme y adjunte."
      documents={[]}
      canUpload
      onUpload={vi.fn().mockResolvedValue(undefined)}
      {...over}
    />,
  );

describe('SignedDocumentsPanel (A14)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin documentos lo dice; con documentos muestra quién, cuándo y la huella', () => {
    const { unmount } = setup();
    expect(screen.getByText('Aún no hay un documento firmado adjunto.')).toBeInTheDocument();
    unmount();

    setup({ documents: [doc] });
    expect(screen.getByText('constancia-firmada.pdf')).toBeInTheDocument();
    expect(screen.getByText(/adjuntado por Elena Ramírez/)).toBeInTheDocument();
    expect(screen.getByText(/Huella SHA-256: aaaaaaaaaaaaaaaa…/)).toBeInTheDocument();
  });

  it('adjunta un PDF válido', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    setup({ onUpload });
    const file = new File(['%PDF'], 'firmado.pdf', { type: 'application/pdf' });
    await userEvent.setup().upload(screen.getByLabelText(/Archivo firmado/), file);
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
  });

  it('rechaza archivos que no son PDF o imagen, sin llamar a la API', async () => {
    const onUpload = vi.fn();
    setup({ onUpload });
    fireEvent.change(screen.getByLabelText(/Archivo firmado/), { target: { files: [new File(['x'], 'macro.exe', { type: 'application/x-msdownload' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('PDF o una imagen');
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('quien no puede adjuntar solo consulta y descarga', async () => {
    setup({ documents: [doc], canUpload: false });
    expect(screen.queryByRole('button', { name: /Adjuntar documento firmado/ })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /Descargar/ }));
    expect(mocked.download).toHaveBeenCalledWith(doc);
  });

  it('muestra el error de la API al adjuntar', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('x'));
    setup({ onUpload });
    await userEvent.setup().upload(screen.getByLabelText(/Archivo firmado/), new File(['%PDF'], 'f.pdf', { type: 'application/pdf' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
