import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { UserFormModal } from './UserFormModal';
import type { Role } from '../services/roleService';
import type { User } from '../services/userService';

// La política de dominio (RF-01) llega del servidor; aquí es la institucional.
vi.mock('../services/userService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/userService')>();
  return { ...actual, userService: { ...actual.userService, getEmailPolicy: vi.fn().mockResolvedValue(['untrm.edu.pe']) } };
});

const roles = [
  { id: 'r-tutor', name: 'Docente Tutor' },
  { id: 'r-service', name: 'Profesional de Servicio' },
  { id: 'r-dean', name: 'Decano' },
] as Role[];

const faculties = [{ id: 'fac-1', name: 'Facultad de Ingeniería' }];
const schools = [
  { id: 'sch-1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true },
  { id: 'sch-2', name: 'Ingeniería Mecánica Eléctrica', facultyId: 'f1', isActive: true },
];

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <QueryClientTestWrapper>
      <UserFormModal onClose={vi.fn()} onSubmit={onSubmit} userToEdit={null} roles={roles} schools={schools} faculties={faculties} />
    </QueryClientTestWrapper>,
  );
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
    fireEvent.change(screen.getByLabelText('Escuela profesional'), { target: { value: 'sch-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ roleId: 'r-tutor', service: null }));
  });
});

describe('UserFormModal: errores al guardar', () => {
  it('muestra el motivo que envía la API y no cierra el formulario', async () => {
    const apiError = Object.assign(new Error('409'), {
      isAxiosError: true,
      response: { data: { message: 'El correo ya está registrado' } },
    });
    const onSubmit = setup(vi.fn().mockRejectedValue(apiError));
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-tutor' } });
    fireEvent.change(screen.getByLabelText('Escuela profesional'), { target: { value: 'sch-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El correo ya está registrado');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('UserFormModal: escuela del docente tutor', () => {
  it('solo pide la escuela cuando el rol es Docente Tutor, y es obligatoria', () => {
    setup();
    expect(screen.queryByLabelText('Escuela profesional')).toBeNull();

    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-tutor' } });
    const field = screen.getByLabelText('Escuela profesional') as HTMLSelectElement;
    expect(field).toBeRequired();
    expect(Array.from(field.options).map((o) => o.value)).toEqual(['', 'sch-1', 'sch-2']);

    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-service' } });
    expect(screen.queryByLabelText('Escuela profesional')).toBeNull();
  });

  it('envía la escuela elegida; en otro rol no envía escuela aunque se hubiera elegido antes', async () => {
    const onSubmit = setup();
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-tutor' } });
    fireEvent.change(screen.getByLabelText('Escuela profesional'), { target: { value: 'sch-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ roleId: 'r-tutor', schoolId: 'sch-2' })));

    onSubmit.mockClear();
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-service' } });
    fireEvent.change(screen.getByLabelText('Servicio al que pertenece'), { target: { value: 'SALUD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ roleId: 'r-service', schoolId: null })));
  });
});

describe('UserFormModal: facultad del Decano', () => {
  it('solo pide la facultad cuando el rol es Decano, y es obligatoria', () => {
    setup();
    expect(screen.queryByLabelText('Facultad')).toBeNull();

    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-dean' } });
    expect(screen.getByLabelText('Facultad')).toBeRequired();
    expect(screen.queryByLabelText('Escuela profesional')).toBeNull();
  });

  it('envía la facultad elegida y no envía escuela', async () => {
    const onSubmit = setup();
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-dean' } });
    fireEvent.change(screen.getByLabelText('Facultad'), { target: { value: 'fac-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ roleId: 'r-dean', facultyId: 'fac-1', schoolId: null })));
  });
});

describe('UserFormModal: correo institucional (RF-01)', () => {
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  const chooseTutor = () => {
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'r-tutor' } });
    fireEvent.change(screen.getByLabelText('Escuela profesional'), { target: { value: 'sch-1' } });
  };

  it('dice qué dominio se espera, con la misma política que aplica el servidor', async () => {
    setup();
    expect(await screen.findByText('Correo institucional (@untrm.edu.pe)')).toBeInTheDocument();
  });

  it('un correo de otro dominio se rechaza al instante, sin llegar a enviarse', async () => {
    const onSubmit = setup();
    await screen.findByText('Correo institucional (@untrm.edu.pe)');
    fireEvent.change(screen.getByLabelText('Correo Electrónico'), { target: { value: 'lucia@gmail.com' } });
    chooseTutor();
    save();

    expect(await screen.findByRole('alert')).toHaveTextContent('El correo debe ser institucional (@untrm.edu.pe)');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía el correo en su forma única (sin espacios y en minúsculas)', async () => {
    const onSubmit = setup();
    await screen.findByText('Correo institucional (@untrm.edu.pe)');
    fireEvent.change(screen.getByLabelText('Correo Electrónico'), { target: { value: '  Lucia.Flores@UNTRM.edu.pe ' } });
    chooseTutor();
    save();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'lucia.flores@untrm.edu.pe' })));
  });

  it('una cuenta anterior a la regla (otro dominio) se edita sin tocar su correo; cambiarlo a otro dominio no se permite', async () => {
    const legacy = { id: 'u1', email: 'antigua@gmail.com', firstName: 'Ana', lastName: 'Ruiz', roleId: 'r-service', service: 'SALUD', phone: '' } as User;
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QueryClientTestWrapper>
        <UserFormModal onClose={vi.fn()} onSubmit={onSubmit} userToEdit={legacy} roles={roles} schools={schools} faculties={faculties} />
      </QueryClientTestWrapper>,
    );
    await screen.findByText('Correo institucional (@untrm.edu.pe)');

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana María' } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Ana María', email: 'antigua@gmail.com' })));

    onSubmit.mockClear();
    fireEvent.change(screen.getByLabelText('Correo Electrónico'), { target: { value: 'otra@hotmail.com' } });
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('institucional');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
