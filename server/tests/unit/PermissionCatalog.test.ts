import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { PERMISSION_CATALOG, isPermissionCode } from '@domain/permissionCatalog';
import { RoleController } from '@interfaces/http/controllers/RoleController';
import type { Request, Response } from 'express';

describe('Catálogo de permisos (LEV-R10)', () => {
  it('no permite códigos repetidos, vacíos ni permisos inventados', () => {
    const codes = PERMISSION_CATALOG.map((permission) => permission.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBeGreaterThan(0);
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.code).toMatch(/^[a-z-]+:[a-z-]+$/);
      expect(permission.description.trim()).not.toBe('');
      expect(isPermissionCode(permission.code)).toBe(true);
    }
    expect(isPermissionCode('students:everything')).toBe(false);
    expect(isPermissionCode('')).toBe(false);
  });

  it('todas las rutas declaran permisos registrados; una expresión dinámica exige revisión', () => {
    const directory = path.resolve(__dirname, '../../src/interfaces/http/routes');
    const violations: string[] = [];
    let checked = 0;
    for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.ts'))) {
      const source = ts.createSourceFile(file, fs.readFileSync(path.join(directory, file), 'utf8'), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'authorize') {
          const permissions = node.arguments[0];
          if (!permissions || !ts.isArrayLiteralExpression(permissions)) {
            violations.push(`${file}: lista dinámica`);
          } else {
            for (const entry of permissions.elements) {
              checked++;
              if (!ts.isStringLiteral(entry) || !isPermissionCode(entry.text)) violations.push(`${file}: ${entry.getText(source)}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(checked).toBeGreaterThan(100);
    expect(violations).toEqual([]);
  });

  it('el endpoint entrega el catálogo sin consultar usuarios ni datos personales', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const controller = new RoleController({} as never, {} as never);
    controller.listPermissions({} as Request, { status } as unknown as Response);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ permissions: PERMISSION_CATALOG });
  });
});
