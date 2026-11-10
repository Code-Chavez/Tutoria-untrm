import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { CertificateTextSettings } from './CertificateTextSettings';
import { getCertificateTextSettings, saveCertificateSchoolText, saveCertificateTemplateText, type CertificateTextSettingsView } from '../services/certificateService';

vi.mock('../services/certificateService', () => ({
  getCertificateTextSettings: vi.fn(),
  saveCertificateTemplateText: vi.fn(),
  saveCertificateSchoolText: vi.fn(),
}));
const get = vi.mocked(getCertificateTextSettings);
const saveTemplate = vi.mocked(saveCertificateTemplateText);
const saveSchool = vi.mocked(saveCertificateSchoolText);

const view = (over: Partial<CertificateTextSettingsView> = {}): CertificateTextSettingsView => ({
  template: { title: 'CERTIFICADO', bodyText: 'Texto {escuela} {periodo} {resolucion}', editable: true },
  school: { department: null, signatoryName: null, signatoryRole: null, editable: true },
  defaults: { title: 'CERTIFICADO', bodyText: 'Texto original {escuela}', department: 'Ingeniería de Sistemas', signatoryName: '[Nombre y grado de la autoridad firmante]', signatoryRole: 'Director de Escuela de Ingeniería de Sistemas' },
  variables: ['{escuela}', '{periodo}'],
  ...over,
});

const renderIt = () =>
  render(
    <QueryClientTestWrapper>
      <CertificateTextSettings schoolId="s1" open />
    </QueryClientTestWrapper>,
  );

describe('CertificateTextSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue(view());
  });

  it('muestra los valores predeterminados como ayuda y guarda los datos de la escuela', async () => {
    saveSchool.mockResolvedValue();
    renderIt();

    const name = await screen.findByLabelText('Nombre y grado de la autoridad que firma');
    expect(name).toHaveAttribute('placeholder', '[Nombre y grado de la autoridad firmante]');
    expect(screen.getByLabelText('Departamento académico')).toHaveAttribute('placeholder', 'Ingeniería de Sistemas');
    await userEvent.type(name, 'Dr. Ana Pérez Rojas');
    await userEvent.type(screen.getByLabelText('Cargo de la autoridad'), 'Directora de la Escuela');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos de la escuela' }));

    await waitFor(() => expect(saveSchool).toHaveBeenCalledWith('s1', { department: '', signatoryName: 'Dr. Ana Pérez Rojas', signatoryRole: 'Directora de la Escuela' }));
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
  });

  it('guarda el título y el texto, y permite volver al texto original', async () => {
    saveTemplate.mockResolvedValue();
    renderIt();

    const title = await screen.findByLabelText('Título del documento');
    await userEvent.clear(title);
    await userEvent.type(title, 'CONSTANCIA');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar texto' }));
    await waitFor(() => expect(saveTemplate).toHaveBeenCalledWith('s1', { title: 'CONSTANCIA', bodyText: 'Texto {escuela} {periodo} {resolucion}' }));

    await userEvent.click(screen.getByRole('button', { name: 'Restablecer el texto original' }));
    expect(screen.getByLabelText('Título del documento')).toHaveValue('CERTIFICADO');
    expect(screen.getByLabelText('Texto del certificado')).toHaveValue('Texto original {escuela}');
  });

  it('sin permiso para editar los campos quedan bloqueados y no hay botón de guardar', async () => {
    get.mockResolvedValue(view({ template: { title: 'CERTIFICADO', bodyText: 'Texto', editable: false }, school: { department: null, signatoryName: null, signatoryRole: null, editable: false } }));
    renderIt();

    expect(await screen.findByLabelText('Título del documento')).toBeDisabled();
    expect(screen.getByLabelText('Cargo de la autoridad')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar texto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar datos de la escuela' })).not.toBeInTheDocument();
  });

  it('muestra el mensaje del servidor cuando rechaza un valor', async () => {
    saveSchool.mockRejectedValue({ isAxiosError: true, response: { data: { error: 'El cargo de la autoridad debe tener hasta 120 caracteres' } } });
    renderIt();

    await userEvent.type(await screen.findByLabelText('Cargo de la autoridad'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar datos de la escuela' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/hasta 120 caracteres/);
  });
});
