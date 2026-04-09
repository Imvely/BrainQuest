import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import Card from '../Card';
import { Colors } from '../../../constants/colors';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    const { toJSON } = render(
      <Card style={customStyle}>
        <Text>Content</Text>
      </Card>
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.marginTop).toBe(20);
  });

  it('has default background color', () => {
    const { toJSON } = render(
      <Card>
        <Text>Content</Text>
      </Card>
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.backgroundColor).toBe(Colors.BG_CARD);
  });
});
