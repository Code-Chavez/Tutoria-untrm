import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserFormModal } from './UserFormModal';
import type { Role } from '../services/roleService';

const roles = [
  { id: 'r-tutor', name: 'Docente Tutor' },
  { id: 'r-service', name: 'Profesional de Servicio' },
] as Role[];

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<UserFormModal onClose={vi.fn()} onSubmit={onSubmit} userToEdit={null} roles={roles} />);
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Lucía' } });
  fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Flores' } });
  fireEvent.change(screen.getByLabelText('Correo Electrónico'), { target: { value: 'lucia@untrm.edu.pe' } });
  return onSubmit;
}

describe('UserFormModal: servicio del Profesional de Servicio', () => {
  it('solo pide el servicio cuando el rol es Profesional de Servicio', () => {
    setup();
    expect(screen.queryByLabelText('Servicio al que pertenece')).toBeNull();

    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-service' } });
    const options = Array.from((screen.getByLabelText('Servicio al que pertenece') as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toEqual(['', 'ESCUELA', 'PSICOPEDAGOGIA', 'PSICOLOGIA', 'ASISTENCIA_SOCIAL', 'SALUD']);
    expect(screen.getByLabelText('Servicio al que pertenece')).toBeRequired();

    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-tutor' } });
    expect(screen.queryByLabelText('Servicio al que pertenece')).toBeNull();
  });

  it('envía el servicio elegido junto con el rol', async () => {
    const onSubmit = setup();
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-service' } });
    fireEvent.change(screen.getByLabelText('Servicio al que pertenece'), { target: { value: 'PSICOLOGIA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ roleId: 'r-service', service: 'PSICOLOGIA' }));
  });

  it('en otro rol no envía servicio, aunque se hubiera elegido antes', async () => {
    const onSubmit = setup();
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-service' } });
    fireEvent.change(screen.getByLabelText('Servicio al que pertenece'), { target: { value: 'SALUD' } });
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-tutor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ roleId: 'r-tutor', service: null }));
  });
});
