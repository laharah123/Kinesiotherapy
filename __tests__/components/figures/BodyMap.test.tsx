import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  BodyMap,
  BODY_MAP_REGIONS,
  BODY_MAP_CENTRES,
  BODY_MAP_HIT_RADIUS,
  BODY_MAP_VIEWBOX,
  BODY_REGION_LABELS,
  type BodyRegion,
} from '@/components/figures/BodyMap';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  const stub = (name: string) => ({ children, onPress, ...p }: any) => {
    const El = onPress ? TouchableOpacity : View;
    return React.createElement(El, { testID: name, onPress, ...p }, children);
  };
  return {
    __esModule: true,
    default: stub('Svg'), Svg: stub('Svg'), Path: stub('Path'),
    Ellipse: stub('Ellipse'), Circle: stub('Circle'), Rect: stub('Rect'),
    Line: stub('Line'), G: stub('G'), Defs: stub('Defs'),
    RadialGradient: stub('RadialGradient'), Stop: stub('Stop'),
    Text: ({ children, ...p }: any) => React.createElement(Text, p, children),
  };
});

const SIDES: ('front' | 'back')[] = ['front', 'back'];
const BOTH_SIDE_REGIONS: BodyRegion[] = [
  'neck',
  'leftShoulder', 'rightShoulder',
  'leftElbow', 'rightElbow',
  'leftWrist', 'rightWrist',
  'leftHip', 'rightHip',
  'leftKnee', 'rightKnee',
  'leftAnkle', 'rightAnkle',
];

describe('BodyMap rendering', () => {
  test.each(SIDES)('renders the %s view', (side) => {
    expect(render(<BodyMap side={side}/>).toJSON()).not.toBeNull();
  });

  it('renders with selected regions', () => {
    const { toJSON } = render(<BodyMap side="front" selected={['neck', 'leftKnee']}/>);
    expect(toJSON()).not.toBeNull();
  });

  it('scales height proportionally to width', () => {
    const json: any = render(<BodyMap width={120}/>).toJSON();
    expect(json.props.style).toMatchObject(
      expect.objectContaining({
        height: (120 / BODY_MAP_VIEWBOX.width) * BODY_MAP_VIEWBOX.height,
      }),
    );
  });

  test.each(SIDES)('renders every %s region without crashing', (side) => {
    const { toJSON } = render(<BodyMap side={side} selected={BODY_MAP_REGIONS[side]}/>);
    expect(toJSON()).not.toBeNull();
  });

  it('shows a "Back view" caption on the back and "Front view" on the front', () => {
    expect(render(<BodyMap side="back"/>).getByText('Back view')).toBeTruthy();
    expect(render(<BodyMap side="front"/>).getByText('Front view')).toBeTruthy();
  });

  it('draws a different silhouette for each side', () => {
    const pathOf = (side: 'front' | 'back') =>
      render(<BodyMap side={side}/>).getAllByTestId('Path')[0].props.d;
    expect(pathOf('front')).not.toEqual(pathOf('back'));
  });

  it('labels the selected region beside it', () => {
    const { getByText } = render(<BodyMap side="front" selected={['leftKnee']}/>);
    expect(getByText(BODY_REGION_LABELS.leftKnee)).toBeTruthy();
  });

  it('calls onSelect with the region id when a hit area is pressed', () => {
    const onSelect = jest.fn();
    const { getAllByLabelText } = render(<BodyMap side="front" onSelect={onSelect}/>);
    fireEvent.press(getAllByLabelText(BODY_REGION_LABELS.leftKnee)[0]);
    expect(onSelect).toHaveBeenCalledWith('leftKnee');
  });

  it('gives every region an accessibility label', () => {
    for (const side of SIDES) {
      const { getAllByLabelText } = render(<BodyMap side={side}/>);
      for (const id of BODY_MAP_REGIONS[side]) {
        expect(getAllByLabelText(BODY_REGION_LABELS[id]).length).toBeGreaterThan(0);
      }
    }
  });

  it('uses an opaque low-opacity fill on hit areas so react-native-svg hit tests them', () => {
    const { getAllByLabelText } = render(<BodyMap side="front" onSelect={jest.fn()}/>);
    const hit = getAllByLabelText(BODY_REGION_LABELS.leftWrist)[0];
    expect(hit.props.fill).not.toBe('transparent');
    expect(hit.props.fill).not.toBe('none');
    expect(hit.props.fillOpacity).toBeGreaterThan(0);
    expect(hit.props.fillOpacity).toBeLessThan(0.05);
  });
});

describe('BodyMap region layout', () => {
  it('offers the shared joints on both sides', () => {
    for (const id of BOTH_SIDE_REGIONS) {
      expect(BODY_MAP_REGIONS.front).toContain(id);
      expect(BODY_MAP_REGIONS.back).toContain(id);
    }
  });

  it('keeps trunk regions on the anatomically correct side only', () => {
    for (const id of ['chest', 'upperAbdomen', 'lowerAbdomen'] as BodyRegion[]) {
      expect(BODY_MAP_REGIONS.front).toContain(id);
      expect(BODY_MAP_REGIONS.back).not.toContain(id);
    }
    for (const id of ['upperBack', 'midBack', 'lowBack', 'leftGlute', 'rightGlute'] as BodyRegion[]) {
      expect(BODY_MAP_REGIONS.back).toContain(id);
      expect(BODY_MAP_REGIONS.front).not.toContain(id);
    }
  });

  test.each(SIDES)('every %s hit target is at least 44pt at width 220', (side) => {
    const scale = 220 / BODY_MAP_VIEWBOX.width;
    const diameterPt = BODY_MAP_HIT_RADIUS * 2 * scale;
    expect(diameterPt).toBeGreaterThanOrEqual(44);
    expect(BODY_MAP_REGIONS[side].length).toBeGreaterThan(0);
  });

  test.each(SIDES)('%s hit targets do not overlap each other', (side) => {
    const entries = Object.entries(BODY_MAP_CENTRES[side]);
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [aName, a] = entries[i];
        const [bName, b] = entries[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < BODY_MAP_HIT_RADIUS * 2) {
          throw new Error(
            `${side}: ${aName} and ${bName} are ${d.toFixed(1)} apart, closer than the ${BODY_MAP_HIT_RADIUS * 2} hit diameter`,
          );
        }
      }
    }
  });

  test.each(SIDES)('every %s hit target sits inside the viewBox', (side) => {
    for (const [name, c] of Object.entries(BODY_MAP_CENTRES[side])) {
      if (
        c.x - BODY_MAP_HIT_RADIUS < -BODY_MAP_HIT_RADIUS ||
        c.x + BODY_MAP_HIT_RADIUS > BODY_MAP_VIEWBOX.width + BODY_MAP_HIT_RADIUS ||
        c.y < 0 || c.y > BODY_MAP_VIEWBOX.height
      ) {
        throw new Error(`${side}: ${name} centre (${c.x}, ${c.y}) is out of range`);
      }
    }
  });

  it('has a label for every region in the union', () => {
    const all = new Set([...BODY_MAP_REGIONS.front, ...BODY_MAP_REGIONS.back]);
    expect(all.size).toBe(Object.keys(BODY_REGION_LABELS).length);
    for (const id of all) {
      expect(BODY_REGION_LABELS[id].length).toBeGreaterThan(0);
    }
  });
});
