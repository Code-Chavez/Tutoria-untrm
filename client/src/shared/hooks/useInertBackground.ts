import { useEffect } from 'react';

/**
 * Mientras un diálogo modal está abierto, deja inertes (sin foco, sin clics, fuera del árbol de
 * accesibilidad) los demás hijos directos de <body>. El diálogo debe estar montado en un portal
 * hijo de <body>. Al cerrar solo se retira `inert` de lo que este hook había marcado.
 */
export function useInertBackground(dialogRoot: HTMLElement | null) {
  useEffect(() => {
    if (!dialogRoot) return;
    const marked: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (child === dialogRoot || !(child instanceof HTMLElement) || child.hasAttribute('inert')) continue;
      child.setAttribute('inert', '');
      marked.push(child);
    }
    return () => marked.forEach((el) => el.removeAttribute('inert'));
  }, [dialogRoot]);
}
