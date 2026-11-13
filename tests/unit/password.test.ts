import { comparePassword, hashPassword } from '../../src/utils/password';

describe('Password Utility', () => {
  it('should hash a password and verify it correctly', async () => {
    const rawPassword = 'SecurePassword@123';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toEqual(rawPassword);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const rawPassword = 'CorrectPassword@123';
    const wrongPassword = 'WrongPassword@123';
    const hash = await hashPassword(rawPassword);

    const isMatch = await comparePassword(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });
});

