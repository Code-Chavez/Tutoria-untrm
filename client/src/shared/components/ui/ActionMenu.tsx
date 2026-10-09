import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontalIcon } from '@shared/components/icons';
import styles from './ActionMenu.module.css';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger' | 'success';
  /** Encabezado de la sección en la que se agrupa; las secciones siguen el orden de los elementos. */
  group?: string;
}

interface ActionMenuProps {
  /** Nombre accesible del botón, p. ej. «Más acciones de Ana Torres». */
  label: string;
  items: ActionMenuItem[];
}

const MENU_WIDTH = 248;

// Menú de acciones («Más acciones»): con etiquetas visibles, navegable con teclado
// (flechas, Inicio/Fin, Escape) y sin recortarse dentro de tablas con scroll (se dibuja en un portal).
export const ActionMenu: React.FC<ActionMenuProps> = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }, []);

  // Posición bajo el botón, alineada a su borde derecho; si no cabe abajo, se abre hacia arriba.
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const height = menu.current?.offsetHeight ?? 0;
    const below = rect.bottom + 6;
    const preferred = below + height > window.innerHeight && rect.top - 6 - height > 0 ? rect.top - 6 - height : below;
    // Si no cabe ni arriba ni abajo, se ajusta al borde de la ventana (el menú hace scroll interno).
    const top = Math.max(8, Math.min(preferred, window.innerHeight - height - 8));
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) close(false);
    };
    const onScroll = () => close(false);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const entries = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = entries.indexOf(document.activeElement as HTMLElement);
    const move = (next: number) => {
      event.preventDefault();
      entries[(next + entries.length) % entries.length]?.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        move(index + 1);
        break;
      case 'ArrowUp':
        move(index - 1);
        break;
      case 'Home':
        move(0);
        break;
      case 'End':
        move(entries.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  const select = (item: ActionMenuItem) => {
    // El foco vuelve al botón antes de ejecutar la acción: si abre un diálogo, al cerrarlo regresa aquí.
    close();
    item.onSelect();
  };

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <MoreHorizontalIcon size={16} />
        <span className={styles.triggerText}>Más</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label={label}
            className={styles.menu}
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            onKeyDown={onMenuKeyDown}
          >
            {items.map((item, index) => {
              const heading = item.group && item.group !== items[index - 1]?.group ? item.group : null;
              return (
                <React.Fragment key={item.label}>
                  {heading && (
                    <div role="presentation" className={styles.group}>
                      {heading}
                    </div>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className={`${styles.item} ${item.tone ? styles[item.tone] : ''}`}
                    onClick={() => select(item)}
                  >
                    {item.icon && <span className={styles.icon}>{item.icon}</span>}
                    {item.label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};
