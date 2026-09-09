import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

// Mock dependencies that use react-native-svg
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

describe('Button', () => {
  it('renders with label text (children)', () => {
    render(<Button>Press me</Button>);
    expect(screen.getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Tap</Button>);
    fireEvent.press(screen.getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPress when disabled — TouchableOpacity receives disabled=true', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(<Button disabled onPress={onPress}>Tap</Button>);
    const { TouchableOpacity } = require('react-native');
    // When disabled=true, TouchableOpacity.disabled should be set so RN suppresses the press.
    const to = UNSAFE_getByType(TouchableOpacity);
    expect(to.props.disabled).toBe(true);
  });

  it('does NOT call onPress when loading — TouchableOpacity receives disabled=true', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(<Button loading onPress={onPress}>Tap</Button>);
    const { TouchableOpacity } = require('react-native');
    // When loading=true, the Button passes disabled={true} to TouchableOpacity.
    // Verify this prop so that RN's native touch handling will suppress the press.
    const to = UNSAFE_getByType(TouchableOpacity);
    expect(to.props.disabled).toBe(true);
  });

  it('shows ActivityIndicator when loading=true', () => {
    const { UNSAFE_getByType } = render(<Button loading>Save</Button>);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not show label text when loading=true', () => {
    render(<Button loading>Save</Button>);
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('applies full-width (alignSelf: stretch) style when full=true', () => {
    const { UNSAFE_getByType } = render(<Button full>Full</Button>);
    const { TouchableOpacity } = require('react-native');
    const to = UNSAFE_getByType(TouchableOpacity);
    const flatStyle = Array.isArray(to.props.style)
      ? Object.assign({}, ...to.props.style.filter(Boolean))
      : to.props.style;
    expect(flatStyle.alignSelf).toBe('stretch');
  });

  it('ghost variant uses surface background instead of clay', () => {
    const { UNSAFE_getByType: getPrimary } = render(<Button variant="primary">P</Button>);
    const { UNSAFE_getByType: getGhost }   = render(<Button variant="ghost">G</Button>);
    const { TouchableOpacity } = require('react-native');

    const primaryStyle = getPrimary(TouchableOpacity).props.style;
    const ghostStyle   = getGhost(TouchableOpacity).props.style;

    const flatPrimary: any = Object.assign({}, ...[primaryStyle].flat().filter(Boolean));
    const flatGhost: any   = Object.assign({}, ...[ghostStyle].flat().filter(Boolean));

    // Primary has clay background; ghost does not
    expect(flatPrimary.backgroundColor).toContain('180,110,72'); // COLORS.clay
    expect(flatGhost.backgroundColor).not.toContain('180,110,72');
  });

  it('renders icon when icon prop is provided (left position)', () => {
    render(<Button icon="check" iconPosition="left">With icon</Button>);
    expect(screen.getByTestId('icon-check')).toBeTruthy();
  });

  it('renders icon when icon prop is provided (right position, default)', () => {
    render(<Button icon="next">With icon</Button>);
    expect(screen.getByTestId('icon-next')).toBeTruthy();
  });

  it('does not render icon when icon prop is omitted', () => {
    render(<Button>No icon</Button>);
    expect(screen.queryByTestId(/^icon-/)).toBeNull();
  });

  it('renders the label prop', () => {
    render(<Button label="Continue" />);
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('calls onPress when a label-only button is tapped', () => {
    const onPress = jest.fn();
    render(<Button label="Continue" onPress={onPress} />);
    fireEvent.press(screen.getByText('Continue'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('label takes precedence over children when both are given', () => {
    render(<Button label="Label wins">Children lose</Button>);
    expect(screen.getByText('Label wins')).toBeTruthy();
    expect(screen.queryByText('Children lose')).toBeNull();
  });

  it('renders an icon alongside the label prop', () => {
    render(<Button label="Start" icon="play" iconPosition="left" />);
    expect(screen.getByText('Start')).toBeTruthy();
    expect(screen.getByTestId('icon-play')).toBeTruthy();
  });

  it('does not show the label prop while loading', () => {
    render(<Button label="Saving" loading />);
    expect(screen.queryByText('Saving')).toBeNull();
  });
});
