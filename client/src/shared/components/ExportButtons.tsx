import { useState } from 'react';
import { Button } from '@shared/components/ui';
import { DownloadIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';

export type ExportFormat = 'pdf' | 'excel';

const LABEL: Record<ExportFormat, string> = { pdf: 'PDF', excel: 'Excel' };

interface ExportButtonsProps {
  formats?: ExportFormat[];
  /** Descarga el archivo en el formato pedido; si falla, el mensaje se muestra aquí. */
  onExport: (format: ExportFormat) => Promise<void>;
  disabled?: boolean;
}

// Botones de exportación comunes a reportes y fichas (HU-46).
export function ExportButtons({ formats = ['pdf', 'excel'], onExport, disabled }: ExportButtonsProps) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState('');

  const run = async (format: ExportFormat) => {
    setBusy(format);
    setError('');
    try {
      await onExport(format);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
        {formats.map((format) => (
          <Button
            key={format}
            variant="secondary"
            icon={<DownloadIcon size={16} />}
            disabled={disabled}
            loading={busy === format}
            onClick={() => run(format)}
          >
            {LABEL[format]}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" style={{ margin: 'var(--s2) 0 0', color: 'var(--peligro)', fontSize: 'var(--fs-xs)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
