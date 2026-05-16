import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PainChart, RegionBar } from '@/components/charts/PainChart';

// react-native-svg is mocked globally via jest.setup.ts
// The mock replaces Svg/Rect/Line/Text with View stubs with testID props.

describe('PainChart', () => {
  it('renders without crashing with exactly 7 data points', () => {
    const { toJSON } = render(
      <PainChart data={[3, 2, 4, 2, 1, 3, 2]} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing with fewer than 7 data points (pads with zeros)', () => {
    const { toJSON } = render(<PainChart data={[3, 2]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing with an empty array', () => {
    const { toJSON } = render(<PainChart data={[]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing with a single data point', () => {
    const { toJSON } = render(<PainChart data={[4]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows trend badge when showTrend=true and data has improvement (delta > 0)', () => {
    // first=5, last=1 → delta = (5-1)/5*100 = 80% improvement
    render(<PainChart data={[5, 4, 3, 2, 2, 1, 1]} showTrend={true} />);
    // Trend badge contains "↓" symbol for improvement
    expect(screen.getByText(/↓/)).toBeTruthy();
  });

  it('shows upward trend badge when showTrend=true and data has worsening', () => {
    // first=1, last=5 → delta negative, shows "↑"
    render(<PainChart data={[1, 2, 3, 4, 4, 5, 5]} showTrend={true} />);
    expect(screen.getByText(/↑/)).toBeTruthy();
  });

  it('does not show trend badge when showTrend=false', () => {
    render(<PainChart data={[5, 1, 2, 3, 2, 2, 1]} showTrend={false} />);
    expect(screen.queryByText(/↓/)).toBeNull();
    expect(screen.queryByText(/↑/)).toBeNull();
    // Also the "Pain level" header label should not appear
    expect(screen.queryByText('Pain level')).toBeNull();
  });

  it('does not show trend badge when all values are 0 (delta = 0)', () => {
    render(<PainChart data={[0, 0, 0, 0, 0, 0, 0]} showTrend={true} />);
    // When first=0, delta stays 0 so no badge is rendered
    expect(screen.queryByText(/↓/)).toBeNull();
    expect(screen.queryByText(/↑/)).toBeNull();
  });

  it('shows "Pain level" header label when showTrend=true', () => {
    render(<PainChart data={[3, 2, 1]} showTrend={true} />);
    expect(screen.getByText('Pain level')).toBeTruthy();
  });

  it('respects custom height prop without crashing', () => {
    const { toJSON } = render(<PainChart data={[1, 2, 3]} height={200} />);
    expect(toJSON()).toBeTruthy();
  });

  it('respects custom maxValue prop without crashing', () => {
    const { toJSON } = render(<PainChart data={[1, 2, 3]} maxValue={10} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('RegionBar', () => {
  it('renders the region name', () => {
    render(<RegionBar name="Lower back" pct={60} />);
    expect(screen.getByText('Lower back')).toBeTruthy();
  });

  it('renders the percentage text', () => {
    render(<RegionBar name="Shoulder" pct={45} />);
    expect(screen.getByText('45%')).toBeTruthy();
  });

  it('renders without crashing when pct=0', () => {
    const { toJSON } = render(<RegionBar name="Knee" pct={0} />);
    expect(toJSON()).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('renders without crashing when pct=100', () => {
    const { toJSON } = render(<RegionBar name="Hip" pct={100} />);
    expect(toJSON()).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('renders with a custom color without crashing', () => {
    const { toJSON } = render(
      <RegionBar name="Neck" pct={30} color="rgba(120,160,110,1)" />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
