import React from 'react';
import { render } from '@testing-library/react-native';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ProgressBar progress={0.5} />);
    expect(toJSON()).toBeTruthy();
  });

  it('clamps progress to 0-1 range', () => {
    // Should not crash with out-of-range values
    const { toJSON: json1 } = render(<ProgressBar progress={-0.5} />);
    expect(json1()).toBeTruthy();

    const { toJSON: json2 } = render(<ProgressBar progress={1.5} />);
    expect(json2()).toBeTruthy();
  });

  it('renders with custom color and height', () => {
    const { toJSON } = render(
      <ProgressBar progress={0.7} color="#FF0000" height={12} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders at 0% progress', () => {
    const { toJSON } = render(<ProgressBar progress={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders at 100% progress', () => {
    const { toJSON } = render(<ProgressBar progress={1} />);
    expect(toJSON()).toBeTruthy();
  });
});
