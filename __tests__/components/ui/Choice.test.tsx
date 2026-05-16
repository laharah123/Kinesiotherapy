import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Choice } from '@/components/ui/Choice';

jest.mock('@/lib/icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Icon: ({ name, ...props }: any) =>
      React.createElement(View, { testID: `icon-${name}`, ...props }),
  };
});

jest.mock('@/lib/glyphs', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Glyph: (props: any) => React.createElement(View, { testID: 'glyph', ...props }),
  };
});

describe('Choice', () => {
  it('renders value text', () => {
    render(<Choice value="Option A" />);
    expect(screen.getByText('Option A')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<Choice value="Option B" subtitle="A helpful description" />);
    expect(screen.getByText('A helpful description')).toBeTruthy();
  });

  it('does not render subtitle when omitted', () => {
    render(<Choice value="Option C" />);
    expect(screen.queryByText('A helpful description')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Choice value="Tap me" onPress={onPress} />);
    fireEvent.press(screen.getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows check icon when selected=true', () => {
    render(<Choice value="Selected" selected={true} />);
    expect(screen.getByTestId('icon-check')).toBeTruthy();
  });

  it('does not show check icon when selected=false', () => {
    render(<Choice value="Not selected" selected={false} />);
    expect(screen.queryByTestId('icon-check')).toBeNull();
  });

  it('applies selected border style when selected=true', () => {
    const { UNSAFE_getByType } = render(<Choice value="Selected" selected={true} />);
    const { TouchableOpacity } = require('react-native');
    const to = UNSAFE_getByType(TouchableOpacity);
    const flatStyle: any = Object.assign(
      {},
      ...[to.props.style].flat().filter(Boolean),
    );
    // COLORS.clay is the selected border colour
    expect(flatStyle.borderColor).toContain('180,110,72');
  });

  it('applies unselected border style when selected=false', () => {
    const { UNSAFE_getByType } = render(<Choice value="Unselected" selected={false} />);
    const { TouchableOpacity } = require('react-native');
    const to = UNSAFE_getByType(TouchableOpacity);
    const flatStyle: any = Object.assign(
      {},
      ...[to.props.style].flat().filter(Boolean),
    );
    // COLORS.border is the unselected border colour
    expect(flatStyle.borderColor).toContain('220,210,196');
  });
});
