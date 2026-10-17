import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NextSteps } from './NextSteps';

describe('NextSteps', () => {
  it('muestra cada paso como un enlace con su explicación', () => {
    render(
      <MemoryRouter>
        <NextSteps steps={[{ to: '/carga-masiva', label: 'Cargar el Excel', description: 'Cuando ya tengas la lista' }]} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Cargar el Excel/ });
    expect(link).toHaveAttribute('href', '/carga-masiva');
    expect(link).toHaveTextContent('Cuando ya tengas la lista');
    expect(screen.getByRole('navigation', { name: 'Qué sigue' })).toBeInTheDocument();
  });

  it('sin pasos no dibuja nada, y se puede cambiar el título', () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <NextSteps steps={[]} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <MemoryRouter>
        <NextSteps title="Cuando llegue la lista" steps={[{ to: '/x', label: 'A', description: 'b' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: 'Cuando llegue la lista' })).toBeInTheDocument();
  });
});
