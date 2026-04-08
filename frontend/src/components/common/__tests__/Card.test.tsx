import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Card from '../Card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>카드 내용</Text>
      </Card>,
    );
    expect(getByText('카드 내용')).toBeTruthy();
  });

  it('applies custom style', () => {
    const { toJSON } = render(
      <Card style={{ marginTop: 20 }}>
        <Text>test</Text>
      </Card>,
    );
    expect(toJSON()).toBeTruthy();
  });
});
