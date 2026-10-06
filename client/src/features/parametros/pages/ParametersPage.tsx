import { useState } from 'react';
import { PageHeader, Card, Button, Badge, EmptyState, TableSkeleton } from '@shared/components/ui';
import { SettingsIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useParameters, useUpdateParameter } from '../hooks/useParameters';
import type { SystemParameter } from '../services/parameterService';
import styles from './ParametersPage.module.css';

// Parámetros del sistema (HU-49): duración y número de sesiones, plazos y
// umbrales de alerta. Cada cambio rige de inmediato y queda en la bitácora.
function ParameterRow({ parameter }: { parameter: SystemParameter }) {
  const update = useUpdateParameter();
  // El borrador se parte del valor vigente; se remonta con `key` si el servidor lo cambia.
  const [draft, setDraft] = useState(String(parameter.value));
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const dirty = draft !== String(parameter.value);
  const number = Number(draft);
  const valid = draft.trim() !== '' && Number.isInteger(number) && number >= parameter.min && number <= parameter.max;

  const save = async (value: number) => {
    setMessage(null);
    try {
      await update.mutateAsync({ key: parameter.key, value });
      setDraft(String(value));
      setMessage({ type: 'ok', text: 'Guardado' });
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err) });
    }
  };

  const inputId = `param-${parameter.key}`;
  return (
    <li className={styles.row}>
      <div className={styles.info}>
        <label htmlFor={inputId} className={styles.label}>
          {parameter.label}
          {parameter.isDefault && <Badge tone="neutral">Predeterminado</Badge>}
        </label>
        <p className={styles.description}>{parameter.description}</p>
        <p className={styles.range}>
          Entre {parameter.min} y {parameter.max} {parameter.unit} · predeterminado {parameter.defaultValue}
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.inputWrap}>
          <input
            id={inputId}
            type="number"
            min={parameter.min}
            max={parameter.max}
            step={1}
            value={draft}
            aria-invalid={dirty && !valid}
            onChange={(e) => {
              setDraft(e.target.value);
              setMessage(null);
            }}
          />
          <span className={styles.unit}>{parameter.unit}</span>
        </div>
        <Button size="sm" disabled={!dirty || !valid} loading={update.isPending} onClick={() => save(number)}>
          Guardar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={parameter.value === parameter.defaultValue}
          onClick={() => save(parameter.defaultValue)}
          aria-label={`Restablecer ${parameter.label}`}
        >
          Restablecer
        </Button>
      </div>

      {dirty && !valid && (
        <p role="alert" className={styles.error}>
          Ingresa un número entero entre {parameter.min} y {parameter.max}.
        </p>
      )}
      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className={message.type === 'error' ? styles.error : styles.ok}>
          {message.text}
        </p>
      )}
    </li>
  );
}

export function ParametersPage() {
  const { parameters, loading, error, refresh } = useParameters();
  const groups = [...new Set(parameters.map((p) => p.group))];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Parámetros del sistema"
        subtitle="Ajusta la duración y el número de sesiones y los plazos de alerta. Los cambios rigen de inmediato y quedan en la bitácora de auditoría."
        icon={<SettingsIcon size={22} />}
      />

      {loading ? (
        <TableSkeleton rows={4} columns={2} />
      ) : error ? (
        <EmptyState
          variant="error"
          icon={<SettingsIcon size={26} />}
          title="No se pudieron cargar los parámetros"
          description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : (
        groups.map((group) => (
          <Card key={group} padded className={styles.group}>
            <h3>{group}</h3>
            <ul className={styles.list}>
              {parameters
                .filter((p) => p.group === group)
                .map((p) => (
                  <ParameterRow key={`${p.key}-${p.value}`} parameter={p} />
                ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
