// PR desechable: falla a propósito para comprobar que editar la descripción no deja fusionar un PR con la CI en rojo. No se fusiona.
describe('desechable', () => {
  it('falla a propósito', () => {
    expect(1).toBe(2);
  });
});
