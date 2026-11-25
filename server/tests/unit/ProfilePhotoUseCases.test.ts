import {
  GetProfilePhotoFileUseCase,
  ProfilePhotoNotFoundError,
  ProfilePhotoValidationError,
  RemoveProfilePhotoUseCase,
  UploadProfilePhotoUseCase,
} from '../../src/application/use-cases/profile/ProfilePhotoUseCases';

const user = { id: 'u1', photoStorageKey: 'cld:sit/old.png', photoUrl: 'https://old.example/p.png' };
const file = { buffer: Buffer.from('x'), fileName: 'yo.png', mimeType: 'image/png', fileSize: 10 };

function setup(current: Record<string, unknown> | null = user) {
  const users = { findById: jest.fn().mockResolvedValue(current), update: jest.fn().mockResolvedValue({}) };
  const storage = { save: jest.fn().mockResolvedValue('cld:sit/new.png'), resolvePath: jest.fn().mockReturnValue('https://signed'), delete: jest.fn().mockResolvedValue(undefined) };
  return { users, storage };
}

describe('profile photo', () => {
  it('stores the new photo, clears the old link and deletes the previous file', async () => {
    const { users, storage } = setup();
    await new UploadProfilePhotoUseCase(users as never, storage as never).execute('u1', file);
    expect(users.update).toHaveBeenCalledWith('u1', { photoStorageKey: 'cld:sit/new.png', photoUrl: null });
    expect(storage.delete).toHaveBeenCalledWith('cld:sit/old.png');
  });

  it('rejects a non-image or oversized photo before storing anything', async () => {
    const { users, storage } = setup();
    const useCase = new UploadProfilePhotoUseCase(users as never, storage as never);
    await expect(useCase.execute('u1', { ...file, mimeType: 'application/pdf' })).rejects.toBeInstanceOf(ProfilePhotoValidationError);
    await expect(useCase.execute('u1', { ...file, fileSize: 1024 * 1024 + 1 })).rejects.toBeInstanceOf(ProfilePhotoValidationError);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('removes the photo and its file', async () => {
    const { users, storage } = setup();
    await new RemoveProfilePhotoUseCase(users as never, storage as never).execute('u1');
    expect(users.update).toHaveBeenCalledWith('u1', { photoStorageKey: null });
    expect(storage.delete).toHaveBeenCalledWith('cld:sit/old.png');
  });

  it('serves only the own photo and reports when there is none', async () => {
    const { users, storage } = setup();
    expect(await new GetProfilePhotoFileUseCase(users as never, storage as never).execute('u1')).toEqual({ location: 'https://signed', mimeType: 'image/png' });
    const none = setup({ id: 'u1', photoStorageKey: null });
    await expect(new GetProfilePhotoFileUseCase(none.users as never, none.storage as never).execute('u1')).rejects.toBeInstanceOf(ProfilePhotoNotFoundError);
  });
});
