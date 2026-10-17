import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequestListBanner } from './RequestListBanner';

const renderBanner = (kind: 'ESTUDIANTES' | 'DOCENTES') =>
  render(
    <MemoryRouter>
      <RequestListBanner kind={kind} />
    </MemoryRouter>,
  );

describe('RequestListBanner', () => {
  it('en la carga de estudiantes lleva a «Pedir listas» con la lista de estudiantes elegida', () => {
    renderBanner('ESTUDIANTES');

    expect(screen.getByRole('heading', { name: /lista de estudiantes\? Pídela primero/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir a «Pedir listas»/ })).toHaveAttribute('href', '/pedir-listas?lista=estudiantes');
  });

  it('en la carga de docentes lleva a «Pedir listas» con la lista de docentes elegida', () => {
    renderBanner('DOCENTES');

    expect(screen.getByRole('heading', { name: /lista de docentes tutores\? Pídela primero/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir a «Pedir listas»/ })).toHaveAttribute('href', '/pedir-listas?lista=docentes');
  });

  it('no pide nada ni pide configurar un correo: solo es un camino', () => {
    renderBanner('ESTUDIANTES');

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
