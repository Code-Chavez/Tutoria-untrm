import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButtons } from './ExportButtons';

describe('ExportButtons', () => {
  it('muestra PDF y Excel por defecto y descarga en el formato elegido', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    render(<ExportButtons onExport={onExport} />);

    await userEvent.click(screen.getByRole('button', { name: /Excel/ }));
    await userEvent.click(screen.getByRole('button', { name: /PDF/ }));

    expect(onExport).toHaveBeenNthCalledWith(1, 'excel');
    expect(onExport).toHaveBeenNthCalledWith(2, 'pdf');
  });

  it('permite limitar los formatos (p. ej. solo PDF para fichas)', () => {
    render(<ExportButtons formats={['pdf']} onExport={vi.fn()} />);

    expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excel/ })).not.toBeInTheDocument();
  });

  it('avisa del error si la descarga falla y vuelve a habilitar el botón', async () => {
    const onExport = vi.fn().mockRejectedValue(new Error('boom'));
    render(<ExportButtons onExport={onExport} />);

    await userEvent.click(screen.getByRole('button', { name: /PDF/ }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF/ })).toBeEnabled();
  });

  it('no permite exportar mientras esté deshabilitado', () => {
    render(<ExportButtons onExport={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: /PDF/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Excel/ })).toBeDisabled();
  });
});
