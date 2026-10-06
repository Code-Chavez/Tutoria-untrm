import { Request, Response } from 'express';
import { ExportController } from '@interfaces/http/controllers/ExportController';
import { IndicatorsForbiddenError } from '@application/use-cases/indicators/IndicatorsErrors';
import { WorkPlanForbiddenError } from '@application/use-cases/work-plans/WorkPlanErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';

const mockRes = () => {
  const res = { setHeader: jest.fn(), status: jest.fn(), send: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('ExportController (HU-46)', () => {
  const evaluationUc = { execute: jest.fn() };
  const indicatorsUc = { execute: jest.fn() };
  const workPlanUc = { execute: jest.fn() };
  const recordUc = { execute: jest.fn() };
  const evaluationPdf = { build: jest.fn() };
  const evaluationXlsx = { build: jest.fn() };
  const indicatorsPdf = { build: jest.fn() };
  const indicatorsXlsx = { build: jest.fn() };
  const workPlanPdf = { build: jest.fn() };
  const recordPdf = { build: jest.fn() };

  const controller = new ExportController(
    evaluationUc as never, indicatorsUc as never, workPlanUc as never, recordUc as never,
    evaluationPdf as never, evaluationXlsx as never, indicatorsPdf as never, indicatorsXlsx as never,
    workPlanPdf as never, recordPdf as never,
  );

  const req = (over: object = {}) => ({ auth: { sub: 'u1' }, query: {}, params: {}, permissions: [], ...over }) as unknown as Request;

  beforeEach(() => jest.clearAllMocks());

  it('indicadores en Excel: reutiliza el caso de uso con los filtros y responde como .xlsx', async () => {
    indicatorsUc.execute.mockResolvedValue({ periodName: 'p' });
    indicatorsXlsx.build.mockResolvedValue(Buffer.from('x'));
    const res = mockRes();

    await controller.indicators('excel')(req({ query: { schoolId: 's1', tutorId: '' } }), res as unknown as Response);

    expect(indicatorsUc.execute).toHaveBeenCalledWith('u1', { facultyId: undefined, schoolId: 's1', tutorId: undefined });
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('spreadsheetml'));
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="indicadores-tutoria.xlsx"');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('indicadores en PDF: responde como application/pdf', async () => {
    indicatorsUc.execute.mockResolvedValue({});
    indicatorsPdf.build.mockResolvedValue(Buffer.from('x'));
    const res = mockRes();

    await controller.indicators('pdf')(req(), res as unknown as Response);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  });

  it('no exporta si el caso de uso rechaza al solicitante (403) o no hay periodo (409)', async () => {
    const res = mockRes();
    indicatorsUc.execute.mockRejectedValue(new IndicatorsForbiddenError());
    await controller.indicators('pdf')(req(), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(indicatorsPdf.build).not.toHaveBeenCalled();

    const res2 = mockRes();
    evaluationUc.execute.mockRejectedValue(new NoActivePeriodError());
    await controller.evaluationStatistics('pdf')(req(), res2 as unknown as Response);
    expect(res2.status).toHaveBeenCalledWith(409);
  });

  it('plan de trabajo: 404 si la escuela aún no tiene plan, 403 fuera del alcance', async () => {
    const res = mockRes();
    workPlanUc.execute.mockResolvedValue({ periodName: 'p', schoolName: 's', plan: null });
    await controller.workPlan(req({ params: { schoolId: 's1' } }), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(404);

    const res2 = mockRes();
    workPlanUc.execute.mockRejectedValue(new WorkPlanForbiddenError());
    await controller.workPlan(req({ params: { schoolId: 's2' } }), res2 as unknown as Response);
    expect(res2.status).toHaveBeenCalledWith(403);
  });

  it('expediente: pasa si el rol puede ver la red de apoyo y responde 404 si no existe', async () => {
    recordUc.execute.mockResolvedValue({});
    recordPdf.build.mockResolvedValue(Buffer.from('x'));
    const res = mockRes();
    await controller.studentRecord(req({ params: { id: 'st1' }, permissions: ['support-contacts:read'] }), res as unknown as Response);
    expect(recordUc.execute).toHaveBeenCalledWith('st1', true, 'u1');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="expediente-tutorado.pdf"');

    const res2 = mockRes();
    recordUc.execute.mockRejectedValue(new StudentNotFoundError('st9'));
    await controller.studentRecord(req({ params: { id: 'st9' } }), res2 as unknown as Response);
    expect(res2.status).toHaveBeenCalledWith(404);
    expect(recordUc.execute).toHaveBeenLastCalledWith('st9', false, 'u1');
  });
});
