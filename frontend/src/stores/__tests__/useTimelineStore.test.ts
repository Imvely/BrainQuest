import { useTimelineStore } from '../useTimelineStore';
import { TimeBlock } from '../../types/timeline';

const mockBlock: TimeBlock = {
  id: 1,
  userId: 1,
  blockDate: '2026-04-08',
  startTime: '09:00',
  endTime: '10:00',
  category: 'WORK',
  title: '코딩',
  status: 'PLANNED',
  source: 'MANUAL',
  isBuffer: false,
  createdAt: '2026-04-08T00:00:00',
};

const mockBlock2: TimeBlock = {
  ...mockBlock,
  id: 2,
  startTime: '10:30',
  endTime: '11:30',
  title: '회의',
};

const mockBlockCompleted: TimeBlock = {
  ...mockBlock,
  id: 3,
  startTime: '07:00',
  endTime: '08:00',
  title: '아침 운동',
  status: 'COMPLETED',
};

describe('useTimelineStore', () => {
  beforeEach(() => {
    useTimelineStore.setState({
      blocks: [],
      selectedDate: '2026-04-08',
      remainingMin: 0,
      nextBlock: null,
    });
  });

  it('has empty blocks initially', () => {
    expect(useTimelineStore.getState().blocks).toEqual([]);
  });

  describe('setBlocks', () => {
    it('replaces all blocks', () => {
      useTimelineStore.getState().setBlocks([mockBlock, mockBlock2]);
      expect(useTimelineStore.getState().blocks).toHaveLength(2);
    });
  });

  describe('addBlock', () => {
    it('appends a block', () => {
      useTimelineStore.getState().setBlocks([mockBlock]);
      useTimelineStore.getState().addBlock(mockBlock2);
      expect(useTimelineStore.getState().blocks).toHaveLength(2);
      expect(useTimelineStore.getState().blocks[1].id).toBe(2);
    });
  });

  describe('updateBlock', () => {
    it('updates an existing block by id', () => {
      useTimelineStore.getState().setBlocks([mockBlock, mockBlock2]);
      useTimelineStore.getState().updateBlock(1, { status: 'COMPLETED' });
      expect(useTimelineStore.getState().blocks[0].status).toBe('COMPLETED');
      expect(useTimelineStore.getState().blocks[1].status).toBe('PLANNED');
    });
  });

  describe('removeBlock', () => {
    it('removes a block by id', () => {
      useTimelineStore.getState().setBlocks([mockBlock, mockBlock2]);
      useTimelineStore.getState().removeBlock(1);
      expect(useTimelineStore.getState().blocks).toHaveLength(1);
      expect(useTimelineStore.getState().blocks[0].id).toBe(2);
    });
  });

  describe('setSelectedDate', () => {
    it('updates the selected date', () => {
      useTimelineStore.getState().setSelectedDate('2026-04-09');
      expect(useTimelineStore.getState().selectedDate).toBe('2026-04-09');
    });
  });

  // === New tests for derived state ===
  describe('recalcDerived', () => {
    it('calculates remainingMin from sleepTime', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);

      useTimelineStore.getState().recalcDerived('23:00');
      // 23:00 - 18:00 = 300 min
      expect(useTimelineStore.getState().remainingMin).toBe(300);

      jest.restoreAllMocks();
    });

    it('returns 0 remainingMin when past sleepTime', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30);

      useTimelineStore.getState().recalcDerived('23:00');
      expect(useTimelineStore.getState().remainingMin).toBe(0);

      jest.restoreAllMocks();
    });

    it('finds next upcoming block', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30);

      useTimelineStore.getState().setBlocks([mockBlock, mockBlock2]);
      useTimelineStore.getState().recalcDerived('23:00');

      const { nextBlock } = useTimelineStore.getState();
      expect(nextBlock).not.toBeNull();
      expect(nextBlock!.id).toBe(1); // 09:00 block is next after 08:30

      jest.restoreAllMocks();
    });

    it('skips completed blocks when finding next', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(6);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30);

      useTimelineStore.getState().setBlocks([mockBlockCompleted, mockBlock]);
      useTimelineStore.getState().recalcDerived('23:00');

      const { nextBlock } = useTimelineStore.getState();
      expect(nextBlock).not.toBeNull();
      expect(nextBlock!.id).toBe(1); // Skips completed block (id=3), finds PLANNED (id=1)

      jest.restoreAllMocks();
    });

    it('returns null nextBlock when all blocks are past', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(22);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);

      useTimelineStore.getState().setBlocks([mockBlock, mockBlock2]);
      useTimelineStore.getState().recalcDerived('23:00');

      expect(useTimelineStore.getState().nextBlock).toBeNull();

      jest.restoreAllMocks();
    });

    it('handles empty blocks', () => {
      useTimelineStore.getState().recalcDerived('23:00');
      expect(useTimelineStore.getState().nextBlock).toBeNull();
    });
  });

  describe('setBlocks triggers recalcDerived', () => {
    it('updates remainingMin when blocks are set', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(0);

      useTimelineStore.getState().setBlocks([mockBlock]);
      // recalcDerived is called with default '23:00' inside setBlocks
      expect(useTimelineStore.getState().remainingMin).toBe(180); // 23:00 - 20:00

      jest.restoreAllMocks();
    });
  });
});
