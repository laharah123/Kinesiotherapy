import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { TabBar } from '@/components/ui/TabBar';

jest.mock('@/lib/icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Icon: ({ name, ...props }: any) =>
      React.createElement(View, { testID: `icon-${name}`, ...props }),
  };
});

const ROUTES = ['index', 'plan', 'progress', 'profile'];

function makeProps(index: number, navigate = jest.fn()) {
  return {
    state: {
      index,
      routes: ROUTES.map((name, i) => ({ key: `${name}-${i}`, name })),
    },
    descriptors: {},
    navigation: { navigate },
    insets: { top: 0, bottom: 34, left: 0, right: 0 },
  } as any;
}

describe('TabBar', () => {
  it('renders all four tab labels', () => {
    render(<TabBar {...makeProps(0)} />);
    ['Today', 'Plan', 'Progress', 'You'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('marks the tab at state.index as selected', () => {
    const { UNSAFE_getAllByType } = render(<TabBar {...makeProps(2)} />);
    const { TouchableOpacity } = require('react-native');
    const tabs = UNSAFE_getAllByType(TouchableOpacity);
    expect(tabs[2].props.accessibilityState.selected).toBe(true);
    expect(tabs[0].props.accessibilityState.selected).toBe(false);
  });

  it('navigates by route name instead of pushing onto the stack', () => {
    const navigate = jest.fn();
    render(<TabBar {...makeProps(0, navigate)} />);
    fireEvent.press(screen.getByText('Progress'));
    expect(navigate).toHaveBeenCalledWith('progress');
  });

  it('does not re-navigate when the active tab is tapped', () => {
    const navigate = jest.fn();
    render(<TabBar {...makeProps(1, navigate)} />);
    fireEvent.press(screen.getByText('Plan'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('adds the bottom safe-area inset to the bar padding', () => {
    const { UNSAFE_getAllByType } = render(<TabBar {...makeProps(0)} />);
    const { View } = require('react-native');
    const bar = UNSAFE_getAllByType(View)[0];
    const flat: any = Object.assign({}, ...[bar.props.style].flat().filter(Boolean));
    expect(flat.paddingBottom).toBe(42);
  });
});
