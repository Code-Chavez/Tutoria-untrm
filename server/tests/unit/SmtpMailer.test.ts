import net from 'net';
import { MailMessage, MailSendError } from '../../src/application/ports/Mailer';
import { SmtpMailer } from '../../src/infrastructure/services/SmtpMailer';
import { classifySmtpError, redactMailText } from '../../src/infrastructure/services/smtpOutcome';

/**
 * Clasificación del resultado de un envío SMTP con un servidor SMTP real en el proceso (net.createServer), no con errores
 * armados a mano: nodemailer informa `command: 'CONN'` en los cortes de conexión y los tiempos agotados aunque el cuerpo ya se
 * haya enviado, y la clasificación depende de la fase observada por el transporte. Todo ocurre en 127.0.0.1; no sale nada a la red.
 */
type Scenario = {
  /** Qué hace el servidor falso en cada fase. */
  greeting?: 'normal' | 'silent' | 'close';
  rcpt?: 'ok' | 'reject' | 'reject-echoing-address' | 'silent';
  data?: 'ok' | 'close-before-354';
  afterBody?: 'accept' | 'close' | 'silent' | 'reject' | 'keep-alive-no-reply';
};

const message: MailMessage = { to: 'destino@example.com', subject: 'Prueba', text: 'cuerpo' };
const open: net.Server[] = [];

function startFakeSmtp(scenario: Scenario): Promise<number> {
  const timers: NodeJS.Timeout[] = [];
  const server = net.createServer((socket) => {
    let inData = false;
    let buffer = '';
    socket.on('error', () => undefined);
    if (scenario.greeting === 'close') return void socket.destroy();
    if (scenario.greeting !== 'silent') socket.write('220 fake.local ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let index: number;
      while ((index = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (inData) {
          if (line !== '.') continue;
          if (scenario.afterBody === 'accept') socket.write('250 queued\r\n');
          else if (scenario.afterBody === 'close') socket.destroy();
          else if (scenario.afterBody === 'reject') socket.write('554 rejected\r\n');
          else if (scenario.afterBody === 'keep-alive-no-reply') timers.push(setInterval(() => socket.write('250-wait\r\n'), 100));
          continue; // 'silent': no responde y no escribe nada
        }
        const command = line.toUpperCase();
        if (command.startsWith('EHLO') || command.startsWith('HELO')) socket.write('250-fake.local\r\n250 8BITMIME\r\n');
        else if (command.startsWith('MAIL')) socket.write('250 OK\r\n');
        else if (command.startsWith('RCPT')) {
          if (scenario.rcpt === 'reject') socket.write('550 no such user\r\n');
          else if (scenario.rcpt === 'reject-echoing-address') socket.write(`550 5.1.1 ${line.slice(8)} user unknown\r\n`);
          else if (scenario.rcpt !== 'silent') socket.write('250 OK\r\n');
        } else if (command.startsWith('DATA')) {
          if (scenario.data === 'close-before-354') socket.destroy();
          else {
            socket.write('354 go\r\n');
            inData = true;
          }
        } else if (command.startsWith('QUIT')) {
          socket.write('221 bye\r\n');
          socket.end();
        } else socket.write('250 OK\r\n');
      }
    });
    socket.on('close', () => timers.forEach(clearInterval));
  });
  open.push(server);
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve((server.address() as net.AddressInfo).port)));
}

const mailerFor = (port: number) =>
  new SmtpMailer({ host: '127.0.0.1', port, secure: false, from: 'sit@example.com', timeouts: { connection: 800, greeting: 800, socket: 800 } });

const failureOf = async (mailer: SmtpMailer): Promise<MailSendError> => {
  try {
    await mailer.send(message);
  } catch (error) {
    expect(error).toBeInstanceOf(MailSendError);
    return error as MailSendError;
  }
  throw new Error('Se esperaba un fallo de envío');
};

afterEach(async () => {
  await Promise.all(open.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe('SmtpMailer: resultado de un fallo según la fase (servidor SMTP real en el proceso)', () => {
  it('un envío aceptado no falla', async () => {
    const port = await startFakeSmtp({ afterBody: 'accept' });
    await expect(mailerFor(port).send(message)).resolves.toBeUndefined();
  });

  describe('antes de enviar DATA: no aceptado (demostrado)', () => {
    it('conexión rechazada', async () => {
      const port = await startFakeSmtp({});
      await new Promise((resolve) => open.pop()?.close(resolve)); // el puerto queda sin servidor
      expect((await failureOf(mailerFor(port))).outcome).toBe('NOT_ACCEPTED');
    });

    it('el servidor cierra la conexión en el saludo', async () => {
      const port = await startFakeSmtp({ greeting: 'close' });
      expect((await failureOf(mailerFor(port))).outcome).toBe('NOT_ACCEPTED');
    });

    it('el servidor no saluda (tiempo de saludo agotado)', async () => {
      const port = await startFakeSmtp({ greeting: 'silent' });
      expect((await failureOf(mailerFor(port))).outcome).toBe('NOT_ACCEPTED');
    });

    it('destinatario rechazado (550)', async () => {
      const port = await startFakeSmtp({ rcpt: 'reject' });
      expect((await failureOf(mailerFor(port))).outcome).toBe('NOT_ACCEPTED');
    });

    it('tiempo agotado esperando la respuesta al destinatario (antes de DATA)', async () => {
      const port = await startFakeSmtp({ rcpt: 'silent' });
      expect((await failureOf(mailerFor(port))).outcome).toBe('NOT_ACCEPTED');
    });
  });

  describe('durante o después de DATA: incierto salvo respuesta de rechazo', () => {
    it('conexión cortada después de enviar el cuerpo, sin respuesta final (nodemailer informa command CONN)', async () => {
      const port = await startFakeSmtp({ afterBody: 'close' });
      const failure = await failureOf(mailerFor(port));
      expect(failure.outcome).toBe('UNCERTAIN');
    });

    it('tiempo agotado esperando la respuesta final tras enviar el cuerpo (nodemailer informa command CONN)', async () => {
      const port = await startFakeSmtp({ afterBody: 'silent' });
      const failure = await failureOf(mailerFor(port));
      expect(failure.outcome).toBe('UNCERTAIN');
      expect(failure.code).toBe('ETIMEDOUT');
    });

    it('el servidor cierra justo al recibir la orden DATA: no se puede demostrar que no aceptó', async () => {
      const port = await startFakeSmtp({ data: 'close-before-354' });
      expect((await failureOf(mailerFor(port))).outcome).toBe('UNCERTAIN');
    });

    it('rechazo explícito tras el cuerpo (554): no aceptado, es una respuesta del servidor', async () => {
      const port = await startFakeSmtp({ afterBody: 'reject' });
      expect((await failureOf(mailerFor(port))).outcome).toBe('NOT_ACCEPTED');
    });
  });

  it('dos envíos a la vez no se contaminan: uno falla antes de DATA y el otro después', async () => {
    const early = await startFakeSmtp({ rcpt: 'reject' });
    const late = await startFakeSmtp({ afterBody: 'close' });
    const [a, b] = await Promise.all([failureOf(mailerFor(early)), failureOf(mailerFor(late))]);
    expect([a.outcome, b.outcome]).toEqual(['NOT_ACCEPTED', 'UNCERTAIN']);
  });
});

describe('classifySmtpError con la fase observada', () => {
  const closedUnexpectedly = { code: 'ECONNECTION', command: 'CONN', message: 'Connection closed unexpectedly' };

  it('command CONN con DATA ya enviado es incierto; sin DATA enviado es no aceptado', () => {
    expect(classifySmtpError(closedUnexpectedly, { dataStarted: true })).toBe('UNCERTAIN');
    expect(classifySmtpError(closedUnexpectedly, { dataStarted: false })).toBe('NOT_ACCEPTED');
  });

  it('una respuesta de rechazo del servidor siempre es no aceptado', () => {
    expect(classifySmtpError({ code: 'EMESSAGE', responseCode: 554 }, { dataStarted: true })).toBe('NOT_ACCEPTED');
  });
});

describe('SmtpMailer: el registro que observa la fase no conserva ni imprime datos del correo', () => {
  const SECRET = 'clave-secreta-de-prueba';
  const RECIPIENT = 'persona.destino@example.com';
  const BODY = 'contenido-confidencial-del-correo';

  const captureOutput = () => {
    const written: string[] = [];
    const record = (chunk: unknown) => {
      written.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    };
    const spies = [
      jest.spyOn(process.stdout, 'write').mockImplementation(record),
      jest.spyOn(process.stderr, 'write').mockImplementation(record),
      ...(['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((method) => jest.spyOn(console, method).mockImplementation((...args: unknown[]) => void written.push(args.map(String).join(' ')))),
    ];
    return { written, restore: () => spies.forEach((spy) => spy.mockRestore()) };
  };

  it('en un envío aceptado no escribe nada en consola ni en la salida estándar', async () => {
    const port = await startFakeSmtp({ afterBody: 'accept' });
    const output = captureOutput();
    try {
      await mailerFor(port).send({ to: RECIPIENT, subject: 'Asunto', text: BODY });
    } finally {
      output.restore();
    }
    expect(output.written.join('\n')).toBe('');
  });

  it('en un fallo con credenciales configuradas, ni la consola ni el error exponen la clave, el destinatario o el contenido', async () => {
    const port = await startFakeSmtp({ afterBody: 'close' });
    const mailer = new SmtpMailer({ host: '127.0.0.1', port, secure: false, user: 'usuario-prueba', pass: SECRET, from: 'sit@example.com', timeouts: { connection: 800, greeting: 800, socket: 800 } });
    const output = captureOutput();
    let failure: unknown;
    try {
      await mailer.send({ to: RECIPIENT, subject: 'Asunto', text: BODY });
    } catch (error) {
      failure = error;
    } finally {
      output.restore();
    }
    expect(failure).toBeInstanceOf(MailSendError);
    expect(output.written.join('\n')).toBe('');
    const serialized = JSON.stringify(failure, Object.getOwnPropertyNames(failure));
    for (const sensitive of [SECRET, RECIPIENT, BODY]) expect(serialized).not.toContain(sensitive);
  });

  it('el mensaje del error no repite direcciones de correo aunque el servidor las incluya en su respuesta', async () => {
    const port = await startFakeSmtp({ rcpt: 'reject-echoing-address' });
    const mailer = new SmtpMailer({ host: '127.0.0.1', port, secure: false, from: 'sit@example.com', timeouts: { connection: 800, greeting: 800, socket: 800 } });
    let failure: unknown;
    try {
      await mailer.send({ to: RECIPIENT, subject: 'Asunto', text: BODY });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(MailSendError);
    expect((failure as MailSendError).outcome).toBe('NOT_ACCEPTED');
    const serialized = JSON.stringify(failure, Object.getOwnPropertyNames(failure));
    expect(serialized).not.toContain(RECIPIENT);
    expect(serialized).not.toMatch(/@/);
  });

  it('redactMailText sustituye cualquier dirección por [correo]', () => {
    expect(redactMailText('550 5.1.1 <ana.perez@untrm.edu.pe> user unknown; copia a b@c.org')).toBe('550 5.1.1 <[correo]> user unknown; copia a [correo]');
    expect(redactMailText('Timeout')).toBe('Timeout');
  });
});
