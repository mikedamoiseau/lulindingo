import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DenShop from '../DenShop';
import { createDefaultLayout, purchaseItem } from '../../../utils/denEconomy';

afterEach(cleanup);

function setup(props = {}) {
  const onBuy = vi.fn();
  const onEquip = vi.fn();
  const onClear = vi.fn();
  const base = {
    totalXp: 300,
    spentAcorns: 0,
    layout: createDefaultLayout(),
    onBuy,
    onEquip,
    onClear,
  };
  render(<DenShop {...base} {...props} />);
  return { onBuy, onEquip, onClear };
}

describe('DenShop', () => {
  it('shows the current acorn balance', () => {
    setup({ totalXp: 300, spentAcorns: 110 });
    expect(screen.getByTestId('acorn-balance')).toHaveTextContent('190');
  });

  it('renders category tabs and switches the visible items', async () => {
    const user = userEvent.setup();
    setup();
    // default tab (sky) shows the sky items
    expect(screen.getByText('Sunny Day')).toBeTruthy();
    // switch to the hat category
    await user.click(screen.getByRole('tab', { name: /hat/i }));
    expect(screen.getByText('Party Hat')).toBeTruthy();
  });

  it('calls onBuy when an affordable unowned item is tapped', async () => {
    const user = userEvent.setup();
    const { onBuy } = setup({ totalXp: 300, spentAcorns: 0 });
    await user.click(screen.getByRole('tab', { name: /hat/i }));
    await user.click(screen.getByRole('button', { name: /Party Hat/i })); // cost 100
    expect(onBuy).toHaveBeenCalledWith('hat-party');
  });

  it('does NOT call onBuy for an item the kid cannot afford', async () => {
    const user = userEvent.setup();
    const { onBuy } = setup({ totalXp: 50, spentAcorns: 0 });
    await user.click(screen.getByRole('tab', { name: /hat/i }));
    const card = screen.getByRole('button', { name: /Party Hat/i }); // cost 100
    expect(card).toBeDisabled();
    await user.click(card);
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('calls onEquip when an owned (unequipped) item is tapped', async () => {
    const user = userEvent.setup();
    // Buy + equip a pond, then clear it so it is owned but not equipped.
    let { layout } = purchaseItem('pond-small', 300, 0, createDefaultLayout());
    layout = { ...layout, slots: { ...layout.slots, pond: null } };
    const { onEquip, onBuy } = setup({ totalXp: 300, spentAcorns: 70, layout });
    await user.click(screen.getByRole('tab', { name: /pond/i }));
    await user.click(screen.getByRole('button', { name: /Little Pond/i }));
    expect(onEquip).toHaveBeenCalledWith('pond-small');
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('marks the equipped item and does not buy/equip it again', async () => {
    const user = userEvent.setup();
    const { onBuy, onEquip } = setup(); // sky-day equipped by default
    // sky tab is default; sky-day is the equipped free starter
    const card = screen.getByRole('button', { name: /Sunny Day/i });
    expect(within(card).getByText(/equipped/i)).toBeTruthy();
    await user.click(card);
    expect(onBuy).not.toHaveBeenCalled();
    expect(onEquip).not.toHaveBeenCalled();
  });
});
