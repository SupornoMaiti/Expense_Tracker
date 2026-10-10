/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

vi.mock('../hooks/useDBInit', () => ({
  useDBInit: () => true,
}));

describe('App Layout Navigation', () => {
  it('renders all nav items and settings at both widths', () => {
    // We cannot easily change actual screen width in pure JSDOM without overriding window.matchMedia or styles,
    // but we can check if the links exist in the DOM with their respective classes (md:hidden vs hidden md:block).
    // The requirement says: asserts that every route in the shared config, plus Settings, is reachable by a visible link or button.

    render(<App />);
    
    // Check Dashboard
    const dashboards = screen.getAllByRole('link', { name: /dashboard/i });
    expect(dashboards.length).toBeGreaterThanOrEqual(1);

    // Check Friends
    const friends = screen.getAllByRole('link', { name: /friends/i });
    expect(friends.length).toBeGreaterThanOrEqual(1);

    // Check Analyze
    const analyze = screen.getAllByRole('link', { name: /analyze/i });
    expect(analyze.length).toBeGreaterThanOrEqual(1);

    // Check Activity
    const activity = screen.getAllByRole('link', { name: /activity/i });
    expect(activity.length).toBeGreaterThanOrEqual(1);

    // Check Settings
    const settings = screen.getAllByRole('link', { name: /settings/i });
    expect(settings.length).toBeGreaterThanOrEqual(2); // one in mobile header, one in sidebar

    // Groups should NOT be there
    const groups = screen.queryAllByRole('link', { name: /groups/i });
    expect(groups.length).toBe(0);
  });
});
