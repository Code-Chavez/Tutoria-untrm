// PR DESECHABLE (no fusionar): falla a propósito para observar cómo se comportan los checks obligatorios.
describe('probe desechable', () => {
  it('falla a propósito', () => {
    expect(1).toBe(2);
  });
});
