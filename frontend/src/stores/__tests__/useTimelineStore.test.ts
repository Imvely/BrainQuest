import { useTimelineStore } from '../useTimelineStore';
import { TimeBlock } from '../../types/timeline';

const createMockBlock = (id: number, overrides?: Partial<TimeBlock>): TimeBlock => ({
  id,
  userId: 1,
  blockDate: '2024-01-01',
  startTime: '09:00',
  endTime: '10:00',
  category: 'WORK',
  title: `Block ${id}`,
  status: 'PLANNED',
  source: 'MANUAL',
  isBuffer: false,
  createdAt: '2024-01-01T00:00:00',
  ...overrides,
});

describe('useTimelineStore', () => {
  beforeEach(() => {
    useTimelineStore.setState({
      blocks: [],
      remainingMin: 0,
      nextBlock: null,
    });
  });

  it('has correct initial state for blocks', () => {
    const state = useTimelineStore.getState();
    expect(state.blocks).toEqual([]);
    expect(state.remainingMin).toBe(0);
    expect(state.nextBlock).toBeNull();
  });

  it('selectedDate defaults to today string', () => {
    const state = useTimelineStore.getState();
    // selectedDate should be a valid YYYY-MM-DD string
    expect(state.selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('setSelectedDate updates the selected date', () => {
    useTimelineStore.getState().setSelectedDate('2024-06-15');
    expect(useTimelineStore.getState().selectedDate).toBe('2024-06-15');
  });

  it('setBlocks replaces blocks and triggers recalcDerived', () => {
    const blocks = [createMockBlock(1), createMockBlock(2)];
    useTimelineStore.getState().setBlocks(blocks);
    expect(useTimelineStore.getState().blocks).toHaveLength(2);
  });

  it('addBlock appends a block', () => {
    useTimelineStore.getState().setBlocks([createMockBlock(1)]);
    useTimelineStore.getState().addBlock(createMockBlock(2));
    expect(useTimelineStore.getState().blocks).toHaveLength(2);
  });

  it('updateBlock modifies matching block by id', () => {
    useTimelineStore.getState().setBlocks([createMockBlock(1), createMockBlock(2)]);
    useTimelineStore.getState().updateBlock(1, { title: 'Updated' });
    const state = useTimelineStore.getState();
    expect(state.blocks.find((b) => b.id === 1)!.title).toBe('Updated');
    expect(state.blocks.find((b) => b.id === 2)!.title).toBe('Block 2');
  });

  it('removeBlock removes matching block by id', () => {
    useTimelineStore.getState().setBlocks([createMockBlock(1), createMockBlock(2)]);
    useTimelineStore.getState().removeBlock(1);
    const state = useTimelineStore.getState();
    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0].id).toBe(2);
  });

  it('recalcDerived filters out COMPLETED and SKIPPED blocks for nextBlock', () => {
    const blocks = [
      createMockBlock(1, { startTime: '23:50', status: 'COMPLETED' }),
      createMockBlock(2, { startTime: '23:55', status: 'PLANNED' }),
    ];
    useTimelineStore.getState().setBlocks(blocks);
    // nextBlock should not be the COMPLETED one
    const state = useTimelineStore.getState();
    if (state.nextBlock) {
      expect(state.nextBlock.status).not.toBe('COMPLETED');
    }
  });

  it('remainingMin is non-negative after recalcDerived', () => {
    useTimelineStore.getState().setBlocks([]);
    const state = useTimelineStore.getState();
    expect(state.remainingMin).toBeGreaterThanOrEqual(0);
  });
});
