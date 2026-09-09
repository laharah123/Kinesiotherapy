import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { AppBar, IconBtn, SegmentedControl } from '@/components/ui/AppBar';

jest.mock('@/lib/icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Icon: ({ name, ...props }: any) =>
      React.createElement(View, { testID: `icon-${name}`, ...props }),
  };
});

describe('IconBtn', () => {
  it('accepts the `name` prop', () => {
    render(<IconBtn name="back" />);
    expect(screen.getByTestId('icon-back')).toBeTruthy();
  });

  it('accepts the `icon` alias used by the screens', () => {
    render(<IconBtn icon="close" />);
    expect(screen.getByTestId('icon-close')).toBeTruthy();
  });

  it('prefers `icon` over `name` when both are supplied', () => {
    render(<IconBtn icon="close" name="back" />);
    expect(screen.getByTestId('icon-close')).toBeTruthy();
    expect(screen.queryByTestId('icon-back')).toBeNull();
  });

  it('fires onPress', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(<IconBtn icon="close" onPress={onPress} />);
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has a hitSlop of 8 for a comfortable touch target', () => {
    const { UNSAFE_getByType } = render(<IconBtn icon="close" onPress={jest.fn()} />);
    const { TouchableOpacity } = require('react-native');
    expect(UNSAFE_getByType(TouchableOpacity).props.hitSlop).toBe(8);
  });

  it('renders nothing when neither icon nor name is given', () => {
    const { toJSON } = render(<IconBtn />);
    expect(toJSON()).toBeNull();
  });
});

describe('AppBar', () => {
  it('renders a string title', () => {
    render(<AppBar title="Today" />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('renders left and right slots', () => {
    render(<AppBar left={<IconBtn icon="back" />} right={<IconBtn icon="close" />} />);
    expect(screen.getByTestId('icon-back')).toBeTruthy();
    expect(screen.getByTestId('icon-close')).toBeTruthy();
  });
});

describe('SegmentedControl', () => {
  it('reports the tapped option', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={['Week', 'Month']} value="Week" onChange={onChange} />);
    fireEvent.press(screen.getByText('Month'));
    expect(onChange).toHaveBeenCalledWith('Month');
  });
});
