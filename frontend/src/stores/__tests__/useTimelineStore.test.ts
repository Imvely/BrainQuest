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

describe('useTimelineStore', () => {
  beforeEach(() => {
    useTimelineStore.setState({ blocks: [], selectedDate: '2026-04-08' });
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
});
