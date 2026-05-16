import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Stat } from '@/components/ui/Stat';
import type { ToneColor } from '@/lib/tokens';

describe('Stat', () => {
  it('renders the value text', () => {
    render(<Stat label="Sessions" value="12" />);
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('renders the label text', () => {
    render(<Stat label="Sessions" value="12" />);
    expect(screen.getByText('Sessions')).toBeTruthy();
  });

  it('renders unit when provided', () => {
    render(<Stat label="Duration" value="45" unit="min" />);
    expect(screen.getByText('min')).toBeTruthy();
  });

  it('does not render unit element when unit is omitted', () => {
    render(<Stat label="Sessions" value="12" />);
    expect(screen.queryByText('min')).toBeNull();
  });

  it('renders without crashing for tone: clay', () => {
    const { toJSON } = render(<Stat label="L" value="V" tone="clay" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing for tone: sage', () => {
    const { toJSON } = render(<Stat label="L" value="V" tone="sage" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing for tone: ochre', () => {
    const { toJSON } = render(<Stat label="L" value="V" tone="ochre" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing for tone: neutral', () => {
    const { toJSON } = render(<Stat label="L" value="V" tone="neutral" />);
    expect(toJSON()).toBeTruthy();
  });

  it('applies different background for each tone', () => {
    const tones: ToneColor[] = ['clay', 'sage', 'ochre', 'neutral'];
    const { View } = require('react-native');

    const bgColors = tones.map((tone) => {
      const { UNSAFE_getByType } = render(
        <Stat label="L" value="V" tone={tone} />,
      );
      const view = UNSAFE_getByType(View);
      const flatStyle: any = Object.assign(
        {},
        ...[view.props.style].flat().filter(Boolean),
      );
      return flatStyle.backgroundColor;
    });

    const unique = new Set(bgColors);
    expect(unique.size).toBe(4);
  });
});
