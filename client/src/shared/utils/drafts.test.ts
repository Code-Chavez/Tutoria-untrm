import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllDrafts, clearDraftsExcept, readDraft, removeDraft, writeDraft } from './drafts';

describe('borradores (U07)', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('guarda y recupera lo escrito, por persona', () => {
    writeDraft('u1', 'solicitud', { reason: 'Necesito apoyo' });
    expect(readDraft('u1', 'solicitud')).toEqual({ reason: 'Necesito apoyo' });
    expect(readDraft('u2', 'solicitud')).toBeNull(); // otra persona no ve el borrador de u1
  });

  it('vive en la pestaña (sessionStorage), no en el almacenamiento compartido del navegador', () => {
    writeDraft('u1', 'solicitud', { reason: 'x' });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(1);
  });

  it('quitar un borrador lo borra', () => {
    writeDraft('u1', 'a', 1);
    removeDraft('u1', 'a');
    expect(readDraft('u1', 'a')).toBeNull();
  });

  it('cerrar sesión borra todos los borradores, no los demás datos de la pestaña', () => {
    writeDraft('u1', 'a', 1);
    writeDraft('u2', 'b', 2);
    window.sessionStorage.setItem('otra-cosa', 'x');
    clearAllDrafts();
    expect(readDraft('u1', 'a')).toBeNull();
    expect(readDraft('u2', 'b')).toBeNull();
    expect(window.sessionStorage.getItem('otra-cosa')).toBe('x');
  });

  it('al iniciar sesión se descartan los de cualquier otra persona y se conservan los propios', () => {
    writeDraft('u1', 'a', 1);
    writeDraft('u2', 'b', 2);
    clearDraftsExcept('u1');
    expect(readDraft('u1', 'a')).toBe(1);
    expect(readDraft('u2', 'b')).toBeNull();
  });

  it('un valor dañado se ignora en vez de romper la pantalla', () => {
    window.sessionStorage.setItem('sit.draft.u1.a', '{no es json');
    expect(readDraft('u1', 'a')).toBeNull();
  });
});
