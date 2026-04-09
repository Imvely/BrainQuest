import React from 'react';
import { render } from '@testing-library/react-native';
import InventoryScreen from '../InventoryScreen';

describe('InventoryScreen', () => {
  it('renders without crash and displays title text', () => {
    const { getByText } = render(<InventoryScreen />);
    expect(getByText('인벤토리')).toBeTruthy();
  });
});
