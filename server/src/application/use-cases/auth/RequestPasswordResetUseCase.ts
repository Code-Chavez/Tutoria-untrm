import { UserRepository, PasswordResetTokenRepository } from '../../../domain/repositories';
import crypto from 'crypto';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: PasswordResetTokenRepository
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      // Por seguridad, no revelamos si el usuario existe o no.
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expira en 1 hora

    await this.tokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
      used: false,
    });

    // Simulación de envío de correo
    console.log(`\n======================================================`);
    console.log(`[SIMULACIÓN DE CORREO] Enviado a: ${user.email}`);
    console.log(`Asunto: Recuperación de contraseña`);
    console.log(`Cuerpo: Para recuperar tu contraseña, haz clic en el siguiente enlace:`);
    console.log(`http://localhost:5173/reset-password/${token}`);
    console.log(`(Este enlace expira en 1 hora)`);
    console.log(`======================================================\n`);
  }
}
