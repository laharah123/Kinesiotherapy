import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Tag } from '@/components/ui/Tag';
import type { ToneColor } from '@/lib/tokens';

describe('Tag', () => {
  it('renders label text (children)', () => {
    render(<Tag>Chronic</Tag>);
    expect(screen.getByText('Chronic')).toBeTruthy();
  });

  it('renders without crashing for tone: clay', () => {
    const { toJSON } = render(<Tag tone="clay">Clay</Tag>);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing for tone: sage', () => {
    const { toJSON } = render(<Tag tone="sage">Sage</Tag>);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing for tone: ochre', () => {
    const { toJSON } = render(<Tag tone="ochre">Ochre</Tag>);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing for tone: neutral', () => {
    const { toJSON } = render(<Tag tone="neutral">Neutral</Tag>);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing when tone is omitted (defaults to neutral)', () => {
    const { toJSON } = render(<Tag>Default</Tag>);
    expect(toJSON()).toBeTruthy();
  });

  it('applies different background for each tone', () => {
    const tones: ToneColor[] = ['clay', 'sage', 'ochre', 'neutral'];
    const { View } = require('react-native');

    const bgColors = tones.map((tone) => {
      const { UNSAFE_getByType } = render(<Tag tone={tone}>{tone}</Tag>);
      const view = UNSAFE_getByType(View);
      const flatStyle: any = Object.assign(
        {},
        ...[view.props.style].flat().filter(Boolean),
      );
      return flatStyle.backgroundColor;
    });

    // All four backgrounds should be distinct
    const unique = new Set(bgColors);
    expect(unique.size).toBe(4);
  });
});
