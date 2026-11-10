import { CertificateForbiddenError, CertificateScopeResolver } from './CertificateQueryUseCases';
import { InvalidCertificateInputError } from './CertificateWorkflowUseCases';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { CertificateTemplateRepository } from '@domain/repositories/CertificateTemplateRepository';
import { CertificateSchoolSettings, CertificateSchoolSettingsRepository } from '@domain/repositories/CertificateSchoolSettingsRepository';
import { DEMO_TEMPLATE } from '@domain/certification/certificateDocument';

export interface CertificateTextSettingsView {
  template: { title: string; bodyText: string; editable: boolean };
  school: CertificateSchoolSettings & { editable: boolean };
  /** Lo que se imprime mientras un dato no esté configurado: la pantalla lo muestra como ayuda. */
  defaults: { title: string; bodyText: string; department: string; signatoryName: string; signatoryRole: string };
  variables: string[];
}

const VARIABLES = ['{escuela}', '{facultad}', '{departamento}', '{resolucion}', '{periodo}'];

/** Una línea de texto: espacios colapsados vacíos = sin dato; sin caracteres de control y con un máximo. */
function cleanLine(value: unknown, label: string, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new InvalidCertificateInputError(`${label} no es válido`);
  const text = value.trim().replace(/\s+/g, ' ');
  if (text === '') return null;
  if (text.length > max || /\p{Cc}/u.test(text)) throw new InvalidCertificateInputError(`${label} debe tener hasta ${max} caracteres y no puede incluir caracteres de control`);
  return text;
}

function requiredText(value: unknown, label: string, min: number, max: number): string {
  const text = cleanLine(value, label, max);
  if (text === null || text.length < min) throw new InvalidCertificateInputError(`${label} debe tener entre ${min} y ${max} caracteres`);
  return text;
}

/**
 * Textos del certificado que se editan desde la pantalla: el título y el cuerpo (plantilla, valen para toda la universidad) y, por
 * escuela, el departamento académico y la autoridad que firma. Lo ya generado no cambia: el PDF guarda en su instantánea lo que imprimió.
 */
export class CertificateTextSettings {
  constructor(
    private readonly scope: CertificateScopeResolver,
    private readonly schools: SchoolRepository,
    private readonly templates: CertificateTemplateRepository,
    private readonly settings: CertificateSchoolSettingsRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  private async access(actor: string, schoolId: string, permissions: string[]) {
    const scope = await this.scope.resolve(actor);
    const school = await this.schools.findById(schoolId);
    if (!school || (scope.kind === 'SCHOOLS' && !scope.schoolIds.includes(schoolId))) throw new CertificateForbiddenError();
    const branding = scope.kind === 'ALL' && permissions.includes('branding:manage');
    return { school, templateEditable: branding, schoolEditable: branding || permissions.includes('certificados:emitir') };
  }

  async view(actor: string, schoolId: string, permissions: string[]): Promise<CertificateTextSettingsView> {
    const { school, templateEditable, schoolEditable } = await this.access(actor, schoolId, permissions);
    const template = await this.templates.ensure({ ...DEMO_TEMPLATE, isDemo: true });
    const values = (await this.settings.find(schoolId)) ?? { department: null, signatoryName: null, signatoryRole: null };
    return {
      template: { title: template.title, bodyText: template.bodyText, editable: templateEditable },
      school: { ...values, editable: schoolEditable },
      defaults: {
        title: DEMO_TEMPLATE.title,
        bodyText: DEMO_TEMPLATE.bodyText,
        department: school.name,
        signatoryName: '[Nombre y grado de la autoridad firmante]',
        signatoryRole: `Director de Escuela de ${school.name}`,
      },
      variables: VARIABLES,
    };
  }

  async saveTemplate(actor: string, schoolId: string, permissions: string[], input: { title: unknown; bodyText: unknown }, ip?: string | null) {
    const { templateEditable } = await this.access(actor, schoolId, permissions);
    if (!templateEditable) throw new CertificateForbiddenError();
    const title = requiredText(input.title, 'El título', 3, 60);
    const bodyText = requiredText(input.bodyText, 'El texto del certificado', 20, 2000);
    const template = await this.templates.ensure({ ...DEMO_TEMPLATE, isDemo: true });
    await this.templates.update(template.id, { title, bodyText });
    await this.audit.create({ userId: actor, action: 'CERTIFICATE_TEXT_SAVED', entity: 'CertificateTemplate', entityId: template.id, details: `Título «${title}» y texto del certificado actualizados`, ipAddress: ip ?? null });
  }

  async saveSchool(
    actor: string,
    schoolId: string,
    permissions: string[],
    input: { department: unknown; signatoryName: unknown; signatoryRole: unknown },
    ip?: string | null,
  ) {
    const { school, schoolEditable } = await this.access(actor, schoolId, permissions);
    if (!schoolEditable) throw new CertificateForbiddenError();
    const values = {
      department: cleanLine(input.department, 'El departamento académico', 120),
      signatoryName: cleanLine(input.signatoryName, 'El nombre de la autoridad', 120),
      signatoryRole: cleanLine(input.signatoryRole, 'El cargo de la autoridad', 120),
    };
    await this.settings.save(schoolId, values);
    await this.audit.create({
      userId: actor,
      action: 'CERTIFICATE_TEXT_SAVED',
      entity: 'CertificateSchoolSettings',
      entityId: schoolId,
      details: `«${school.name}»: departamento ${values.department ?? 'predeterminado'}, firma ${values.signatoryName ?? 'marcador'}`,
      ipAddress: ip ?? null,
    });
  }
}
