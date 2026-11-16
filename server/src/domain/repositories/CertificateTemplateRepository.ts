export interface CertificateTemplateRecord {
  id: string;
  name: string;
  version: number;
  isDemo: boolean;
  title: string;
  bodyText: string;
}

export interface CertificateTemplateRepository {
  /** Cambia el título y el texto de la plantilla (lo ya generado conserva su instantánea). */
  update(id: string, values: { title: string; bodyText: string }): Promise<void>;
  /** La plantilla con ese nombre y versión; si no existe se crea con los valores dados (el resto de campos no se pisa). */
  ensure(definition: { name: string; version: number; isDemo: boolean; title: string; bodyText: string }): Promise<CertificateTemplateRecord>;
}
