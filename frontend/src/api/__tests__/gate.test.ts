import apiClient from '../client';
import {
  submitScreening,
  submitCheckin,
  getStreaks,
  getCheckinHistory,
  getMedications,
  createMedication,
  createMedLog,
  updateMedLog,
  getTodayCheckins,
  updateMedication,
  deleteMedication,
} from '../gate';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('gate API', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- Screening ---
  describe('submitScreening', () => {
    it('calls POST /gate/screening with correct payload', async () => {
      const request = {
        testType: 'ASRS_6' as const,
        answers: { q1: 3, q2: 4, q3: 2, q4: 5, q5: 3, q6: 4 },
      };
      const mockResponse = {
        data: { success: true, data: { id: 1, totalScore: 21, riskLevel: 'HIGH' }, message: 'ok' },
      };
      (mockApiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await submitScreening(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/gate/screening', request);
      expect(result.data.riskLevel).toBe('HIGH');
    });

    it('propagates API errors', async () => {
      (mockApiClient.post as jest.Mock).mockRejectedValue(new Error('500'));
      await expect(submitScreening({ testType: 'ASRS_6', answers: {} })).rejects.toThrow('500');
    });
  });

  // --- Checkin ---
  // 주의: 백엔드 CheckinRequest 필드명은 `type`이며 `checkinType`이 아니다.
  //       `checkinDate`는 요청에 포함되지 않음 (서버가 LocalDate.now()로 결정).
  describe('submitCheckin', () => {
    it('calls POST /gate/checkin for morning', async () => {
      const request = {
        type: 'MORNING' as const,
        sleepHours: 7.5,
        sleepQuality: 2,
        condition: 4,
      };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { id: 1, type: 'MORNING', checkinDate: '2026-04-10', streakCount: 5, expReward: 10 },
        },
      });

      const result = await submitCheckin(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/gate/checkin', request);
      expect(result.data.streakCount).toBe(5);
      expect(result.data.expReward).toBe(10);
    });

    it('calls POST /gate/checkin for evening', async () => {
      const request = {
        type: 'EVENING' as const,
        focusScore: 4,
        impulsivityScore: 2,
        emotionScore: 3,
        memo: '좋은 하루',
      };
      (mockApiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });

      await submitCheckin(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/gate/checkin', request);
    });
  });

  // --- Checkin History ---
  // 백엔드는 from/to 날짜 범위를 필수로 요구 (페이지네이션 없음).
  describe('getCheckinHistory', () => {
    it('calls GET /gate/checkin/history with from/to date range', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [{ id: 1 }, { id: 2 }] },
      });

      const result = await getCheckinHistory('2026-04-01', '2026-04-07');
      expect(mockApiClient.get).toHaveBeenCalledWith('/gate/checkin/history', {
        params: { from: '2026-04-01', to: '2026-04-07' },
      });
      expect(result.data).toHaveLength(2);
    });
  });

  // --- Streaks ---
  describe('getStreaks', () => {
    it('calls GET /gate/streaks', async () => {
      const mockStreaks = [
        { streakType: 'CHECKIN', currentCount: 7, maxCount: 14 },
        { streakType: 'BATTLE', currentCount: 3, maxCount: 10 },
      ];
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: mockStreaks },
      });

      const result = await getStreaks();
      expect(mockApiClient.get).toHaveBeenCalledWith('/gate/streaks');
      expect(result.data).toHaveLength(2);
    });
  });

  // --- Medications ---
  describe('getMedications', () => {
    it('calls GET /gate/medications and returns list including inactive', async () => {
      const meds = [{ id: 1, medName: '콘서타', dosage: '27mg', scheduleTime: '08:00', active: true }];
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: meds },
      });

      const result = await getMedications();
      expect(mockApiClient.get).toHaveBeenCalledWith('/gate/medications');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('createMedication', () => {
    it('calls POST /gate/medications with request body', async () => {
      const request = { medName: '콘서타 (Concerta)', dosage: '27mg', scheduleTime: '08:00' };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, ...request, active: true } },
      });

      const result = await createMedication(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/gate/medications', request);
      expect(result.data.medName).toBe('콘서타 (Concerta)');
    });

    it('propagates errors', async () => {
      (mockApiClient.post as jest.Mock).mockRejectedValue(new Error('409 Conflict'));
      await expect(
        createMedication({ medName: 'test', dosage: '10mg', scheduleTime: '08:00' }),
      ).rejects.toThrow('409 Conflict');
    });
  });

  // --- Med Logs ---
  describe('createMedLog', () => {
    it('calls POST /gate/med-logs', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, medicationId: 1, logDate: '2026-04-08' } },
      });

      const result = await createMedLog({ medicationId: 1 });
      expect(mockApiClient.post).toHaveBeenCalledWith('/gate/med-logs', { medicationId: 1 });
      expect(result.data.medicationId).toBe(1);
    });

    it('supports optional effectiveness and sideEffects fields', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });

      await createMedLog({ medicationId: 1, effectiveness: 2, sideEffects: ['두통'] });
      expect(mockApiClient.post).toHaveBeenCalledWith('/gate/med-logs', {
        medicationId: 1,
        effectiveness: 2,
        sideEffects: ['두통'],
      });
    });
  });

  // --- updateMedLog ---
  describe('updateMedLog', () => {
    it('calls PUT /gate/med-logs/{id} with effectiveness and sideEffects', async () => {
      (mockApiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, effectiveness: 3, sideEffects: ['두통'] } },
      });

      const result = await updateMedLog(1, { effectiveness: 3, sideEffects: ['두통'] });
      expect(mockApiClient.put).toHaveBeenCalledWith('/gate/med-logs/1', {
        effectiveness: 3,
        sideEffects: ['두통'],
      });
      expect(result.data.effectiveness).toBe(3);
    });
  });

  // --- getTodayCheckins ---
  describe('getTodayCheckins', () => {
    it('calls GET /gate/checkin/history with from=to=date', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [{ id: 1, type: 'MORNING' }] },
      });

      const result = await getTodayCheckins('2026-04-09');
      expect(mockApiClient.get).toHaveBeenCalledWith('/gate/checkin/history', {
        params: { from: '2026-04-09', to: '2026-04-09' },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  // --- updateMedication ---
  describe('updateMedication', () => {
    it('calls PUT /gate/medications/{id} to deactivate', async () => {
      (mockApiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, active: false } },
      });

      const result = await updateMedication(1, { active: false });
      expect(mockApiClient.put).toHaveBeenCalledWith('/gate/medications/1', { active: false });
      expect(result.data.active).toBe(false);
    });
  });

  // --- deleteMedication ---
  describe('deleteMedication', () => {
    it('calls DELETE /gate/medications/{id}', async () => {
      (mockApiClient.delete as jest.Mock).mockResolvedValue({
        data: { success: true, data: null },
      });

      await deleteMedication(1);
      expect(mockApiClient.delete).toHaveBeenCalledWith('/gate/medications/1');
    });
  });
});
