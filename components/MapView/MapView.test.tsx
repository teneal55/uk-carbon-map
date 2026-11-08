import type { ReactNode } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapView from './MapView';

vi.mock('react-map-gl/mapbox', () => ({
  default: ({ mapStyle, children }: { mapStyle?: string; children?: ReactNode }) => (
    <div data-testid="map" data-style={mapStyle}>
      {children}
    </div>
  ),
  Source: ({ id, children }: { id: string; children?: ReactNode }) => (
    <div data-testid={`source-${id}`}>{children}</div>
  ),
  Layer: ({ id }: { id: string }) => <div data-testid={`layer-${id}`} />,
  NavigationControl: () => <div data-testid="navigation-control" />,
}));

describe('MapView', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the map with the custom style from the environment', () => {
    const customStyle = 'mapbox://styles/test-user/test-style';
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_STYLE', customStyle);

    render(<MapView timeline={{ periods: [], nowIndex: 0 }} />);

    const map = screen.getByTestId('map');
    expect(map).toBeInTheDocument();
    expect(map).toHaveAttribute('data-style', customStyle);
  });
});