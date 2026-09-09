import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Icon } from '@/lib/icons';
import type { IconName } from '@/lib/tokens';

const ALL_ICON_NAMES: IconName[] = [
  'back', 'close', 'menu', 'more', 'search',
  'home', 'plan', 'progress', 'profile',
  'play', 'pause', 'next', 'check', 'plus',
  'flame', 'clock', 'calendar', 'bell', 'chevron',
  'sparkle', 'eye', 'lock', 'mail', 'google', 'apple',
  'arrowRight', 'pencil', 'heart', 'shield', 'bolt', 'redo',
  'tap', 'hand', 'volume', 'volumeOff', 'info', 'warning',
  'trash', 'externalLink', 'refresh',
];

describe('Icon', () => {
  it('renders the bare Svg when no onPress / style is given', () => {
    render(<Icon name="check" />);
    expect(screen.getByTestId('Svg')).toBeTruthy();
  });

  it('does not wrap in a Pressable when onPress is omitted', () => {
    const { UNSAFE_queryByType } = render(<Icon name="check" />);
    const { Pressable } = require('react-native');
    expect(UNSAFE_queryByType(Pressable)).toBeNull();
  });

  it('wraps in a Pressable and fires the handler when onPress is provided', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(<Icon name="back" onPress={onPress} />);
    const { Pressable } = require('react-native');

    const pressable = UNSAFE_getByType(Pressable);
    expect(pressable).toBeTruthy();

    fireEvent.press(pressable);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('gives the pressable a 40x40 centred touch area and hitSlop', () => {
    const { UNSAFE_getByType } = render(<Icon name="back" onPress={jest.fn()} />);
    const { Pressable } = require('react-native');
    const pressable = UNSAFE_getByType(Pressable);

    const flat: any = Object.assign({}, ...[pressable.props.style].flat().filter(Boolean));
    expect(flat.width).toBe(40);
    expect(flat.height).toBe(40);
    expect(flat.alignItems).toBe('center');
    expect(flat.justifyContent).toBe('center');
    expect(pressable.props.hitSlop).toBe(10);
  });

  it('merges a caller style onto the pressable', () => {
    const { UNSAFE_getByType } = render(
      <Icon name="back" onPress={jest.fn()} style={{ opacity: 0.5 }} />,
    );
    const { Pressable } = require('react-native');
    const flat: any = Object.assign(
      {},
      ...[UNSAFE_getByType(Pressable).props.style].flat().filter(Boolean),
    );
    expect(flat.opacity).toBe(0.5);
  });

  it('wraps in a plain View with the style when only style is provided', () => {
    const { UNSAFE_queryByType, UNSAFE_getAllByType } = render(
      <Icon name="next" style={{ transform: [{ scaleX: -1 }] }} />,
    );
    const { Pressable, View } = require('react-native');

    expect(UNSAFE_queryByType(Pressable)).toBeNull();

    const wrapper = UNSAFE_getAllByType(View)[0];
    const flat: any = Object.assign({}, ...[wrapper.props.style].flat().filter(Boolean));
    expect(flat.transform).toEqual([{ scaleX: -1 }]);
  });

  it.each(ALL_ICON_NAMES)('renders the "%s" icon without crashing', (name) => {
    const { toJSON } = render(<Icon name={name} />);
    expect(toJSON()).toBeTruthy();
  });

  it.each(['tap', 'hand', 'volume', 'volumeOff', 'info', 'warning', 'trash', 'externalLink', 'refresh'] as IconName[])(
    '"%s" draws its own artwork rather than falling through to the default circle',
    (name) => {
      const drawn = JSON.stringify(render(<Icon name={name} />).toJSON());
      const fallback = JSON.stringify(render(<Icon name={'not-an-icon' as IconName} />).toJSON());
      expect(drawn).not.toEqual(fallback);
    },
  );

  it.each(ALL_ICON_NAMES.filter((n) => n !== 'google' && n !== 'apple'))(
    '"%s" keeps the shared 1.7 round-cap stroke style',
    (name) => {
      const svg = render(<Icon name={name} />).getByTestId('Svg');
      expect(svg.props.strokeWidth).toBe(1.7);
      expect(svg.props.strokeLinecap).toBe('round');
      expect(svg.props.strokeLinejoin).toBe('round');
    },
  );
});
