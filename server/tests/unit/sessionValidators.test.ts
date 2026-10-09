import { scheduleSessionSchema } from '../../src/interfaces/http/validators/session.validators';

const base = {
  studentIds: ['3f2c1b0a-1111-4222-8333-444455556666'],
  topic: 'Seguimiento',
  scheduledAt: '2026-10-20T15:00:00.000Z',
  modality: 'VIRTUAL' as const,
};

describe('scheduleSessionSchema — meetingLink', () => {
  it.each(['https://meet.example.com/abc', 'http://intranet/sala'])('acepta %s', (meetingLink) => {
    expect(scheduleSessionSchema.safeParse({ ...base, meetingLink }).success).toBe(true);
  });

  it.each(['javascript:alert(1)', 'data:text/html,hola', 'meet.example.com', 'ftp://x.y/z'])(
    'rechaza %s',
    (meetingLink) => {
      expect(scheduleSessionSchema.safeParse({ ...base, meetingLink }).success).toBe(false);
    },
  );
});
