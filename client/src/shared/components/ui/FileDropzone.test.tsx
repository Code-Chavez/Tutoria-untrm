import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropzone } from './FileDropzone';

const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
const exe = new File(['x'], 'virus.exe', { type: 'application/octet-stream' });

describe('FileDropzone', () => {
  it('passes the chosen file with the file picker', async () => {
    const onFile = vi.fn();
    render(<FileDropzone accept=".pdf" ariaLabel="Documento" onFile={onFile} />);
    await userEvent.setup().upload(screen.getByLabelText('Documento'), pdf);
    expect(onFile).toHaveBeenCalledWith(pdf);
  });

  it('accepts a dropped file of an allowed type', () => {
    const onFile = vi.fn();
    render(<FileDropzone accept=".pdf" ariaLabel="Documento" onFile={onFile} />);
    fireEvent.drop(screen.getByText(/elígelo/).closest('label') as HTMLElement, { dataTransfer: { files: [pdf] } });
    expect(onFile).toHaveBeenCalledWith(pdf);
  });

  it('rejects a dropped file of another type', () => {
    const onFile = vi.fn();
    render(<FileDropzone accept=".pdf" ariaLabel="Documento" onFile={onFile} />);
    fireEvent.drop(screen.getByText(/elígelo/).closest('label') as HTMLElement, { dataTransfer: { files: [exe] } });
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('no está permitido');
  });

  it('ignores drops while busy', () => {
    const onFile = vi.fn();
    render(<FileDropzone accept=".pdf" ariaLabel="Documento" busy onFile={onFile} />);
    fireEvent.drop(screen.getByText('Subiendo…').closest('label') as HTMLElement, { dataTransfer: { files: [pdf] } });
    expect(onFile).not.toHaveBeenCalled();
  });
});
