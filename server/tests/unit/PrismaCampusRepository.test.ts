import { PrismaClient } from '@prisma/client';
import { PrismaCampusRepository } from '@infrastructure/repositories/PrismaCampusRepository';

function repoWith(links: { campusId: string }[], school: { campusId: string | null } | null) {
  const prisma = {
    schoolCampus: { findMany: jest.fn().mockResolvedValue(links) },
    school: { findUnique: jest.fn().mockResolvedValue(school) },
  };
  return { repo: new PrismaCampusRepository(prisma as unknown as PrismaClient), prisma };
}

describe('PrismaCampusRepository.campusIdsOf (issue #277)', () => {
  it('devuelve las sedes vinculadas a la escuela', async () => {
    const { repo, prisma } = repoWith([{ campusId: 'c1' }, { campusId: 'c2' }], { campusId: 'c1' });
    await expect(repo.campusIdsOf('s1')).resolves.toEqual(['c1', 'c2']);
    expect(prisma.school.findUnique).not.toHaveBeenCalled();
  });

  it('sin vínculos usa la sede principal de la escuela', async () => {
    const { repo, prisma } = repoWith([], { campusId: 'c1' });
    await expect(repo.campusIdsOf('s1')).resolves.toEqual(['c1']);
    expect(prisma.school.findUnique).toHaveBeenCalledWith({ where: { id: 's1' }, select: { campusId: true } });
  });

  it('sin vínculos y sin sede principal, o con una escuela inexistente, devuelve una lista vacía', async () => {
    await expect(repoWith([], { campusId: null }).repo.campusIdsOf('s1')).resolves.toEqual([]);
    await expect(repoWith([], null).repo.campusIdsOf('x')).resolves.toEqual([]);
  });
});
