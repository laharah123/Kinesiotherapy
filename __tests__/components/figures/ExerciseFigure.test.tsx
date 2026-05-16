import React from 'react';
import { render } from '@testing-library/react-native';
import { ExerciseFigure } from '@/components/figures/ExerciseFigure';
import type { FigureType } from '@/components/figures/AnimatedFigure';

// SVG mock (also applied globally via jest.setup.ts; explicit here for clarity)
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name: string) => ({ children, ...p }: any) =>
    React.createElement(View, { testID: name, ...p }, children);
  return {
    __esModule: true,
    default: stub('Svg'), Svg: stub('Svg'), Path: stub('Path'),
    Circle: stub('Circle'), Line: stub('Line'),
  };
});

const FIGURE_TYPES: FigureType[] = [
  'bridge', 'supine', 'quadruped', 'standing',
  'seated', 'prone', 'sidelying', 'kneeling',
];

describe('ExerciseFigure', () => {
  it.each(FIGURE_TYPES)('renders %s without crashing', (figureType) => {
    const { toJSON } = render(<ExerciseFigure figureType={figureType}/>);
    expect(toJSON()).not.toBeNull();
  });

  it('uses default figureType when not specified', () => {
    const { toJSON } = render(<ExerciseFigure/>);
    expect(toJSON()).not.toBeNull();
  });

  it('accepts custom accent colour', () => {
    const { toJSON } = render(<ExerciseFigure figureType="bridge" accent="#ff0000"/>);
    expect(toJSON()).not.toBeNull();
  });

  it('accepts custom dimensions', () => {
    const { toJSON } = render(
      <ExerciseFigure figureType="standing" width={100} height={100}/>,
    );
    expect(toJSON()).not.toBeNull();
  });
});
