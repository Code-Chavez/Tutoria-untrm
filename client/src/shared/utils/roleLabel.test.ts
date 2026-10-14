import { describe, it, expect } from 'vitest';
import { getRoleLabel, roleDisplayName } from './roleLabel';

describe('nombres visibles de los roles (A11)', () => {
  it.each([
    ['Tutorado', 'Estudiante'],
    ['Docente Tutor', 'Docente'],
    ['Administrador DBU', 'Administrador'],
    ['Coordinador', 'Coordinador'],
    ['Vicerrectorado', 'Vicerrectorado'],
  ])('«%s» se muestra como «%s»', (role, label) => {
    expect(roleDisplayName(role)).toBe(label);
    expect(getRoleLabel(role)).toBe(label);
  });

  it('el Profesional de Servicio muestra su especialidad', () => {
    expect(getRoleLabel('Profesional de Servicio', 'PSICOLOGIA')).toBe('Profesional de Psicología');
    expect(getRoleLabel('Profesional de Servicio', 'ASISTENCIA_SOCIAL')).toBe('Profesional de Asistencia Social');
    expect(getRoleLabel('Profesional de Servicio', 'SALUD')).toBe('Profesional de Salud');
  });

  it('sin especialidad conocida muestra el nombre genérico', () => {
    expect(getRoleLabel('Profesional de Servicio')).toBe('Profesional de servicio');
    expect(getRoleLabel('Profesional de Servicio', 'OTRO')).toBe('Profesional de servicio');
  });

  it('un rol desconocido se muestra tal cual, y el servicio solo afecta al Profesional de Servicio', () => {
    expect(roleDisplayName('Rol Nuevo')).toBe('Rol Nuevo');
    expect(getRoleLabel('Docente Tutor', 'PSICOLOGIA')).toBe('Docente');
  });
});
