import { beforeEach, describe, expect, it } from 'vitest';
import { PHASE1_MAP } from '../src/data/maps';
import { quoteBuy, quoteSell, unitBuyPrice, unitSellPrice } from '../src/sim/market';
import { CUTTER, SLOOP } from '../src/sim/ship';
import {
  activeShip,
  buy,
  buyShip,
  buyUpgrade,
  capacity,
  cargoUsed,
  freeSpace,
  sell,
  sellAll,
  switchShip,
} from '../src/sim/trade';
import { createWorld, type World } from '../src/sim/world';

describe('Phase 1 Trade Economy & Quotes Simulation', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld(PHASE1_MAP, SLOOP);
  });

  it('calculates accurate commodity quotes where price slides with quantity', () => {
    world.trade.dockedAt = 'calda';
    const caldaMarket = world.trade.markets.calda!;

    const p1 = unitBuyPrice('timber', caldaMarket.stock.timber);
    const quote5 = quoteBuy(caldaMarket, 'timber', 5);
    const quote10 = quoteBuy(caldaMarket, 'timber', 10);

    // Because each unit leaves the stock, price increases as quantity increases
    expect(quote5).toBeGreaterThanOrEqual(p1 * 5);
    expect(quote10).toBeGreaterThan(quote5 * 2);

    // Selling quotes should decrease per unit as stock increases
    const s1 = unitSellPrice('timber', caldaMarket.stock.timber);
    const sellQuote5 = quoteSell(caldaMarket, 'timber', 5);
    expect(sellQuote5).toBeLessThanOrEqual(s1 * 5);
  });

  it('validates buy and sell transactions and updates captain hold and gold', () => {
    world.trade.dockedAt = 'calda';
    const startGold = world.trade.captain.gold;

    // Buy 4 timber
    const cost4 = quoteBuy(world.trade.markets.calda!, 'timber', 4);
    const res = buy(world.trade, 'timber', 4);
    expect(res.ok).toBe(true);
    expect((res as { ok: true; gold: number }).gold).toBe(cost4);
    expect(world.trade.captain.gold).toBe(startGold - cost4);
    expect(world.trade.captain.cargo.timber).toBe(4);
    expect(cargoUsed(world.trade)).toBe(4);
    expect(freeSpace(world.trade)).toBe(capacity(world.trade) - 4);

    // Cannot buy more than remaining space
    const free = freeSpace(world.trade);
    expect(buy(world.trade, 'timber', free + 1)).toEqual({ ok: false, error: 'hold-full' });

    // Sell 2 timber
    const sellIncome = quoteSell(world.trade.markets.calda!, 'timber', 2);
    const sellRes = sell(world.trade, 'timber', 2);
    expect(sellRes.ok).toBe(true);
    expect(world.trade.captain.cargo.timber).toBe(2);
    expect((sellRes as { ok: true; gold: number }).gold).toBe(sellIncome);
  });

  it('handles sellAll across mixed cargo correctly', () => {
    world.trade.dockedAt = 'saltmere';
    world.trade.captain.cargo.fish = 2;
    world.trade.captain.cargo.grain = 3;
    world.trade.captain.gold = 100;

    const market = world.trade.markets.saltmere!;
    const expectedIncome = quoteSell(market, 'fish', 2) + quoteSell(market, 'grain', 3);

    const res = sellAll(world.trade);
    expect(res.ok).toBe(true);
    expect(world.trade.captain.cargo.fish).toBe(0);
    expect(world.trade.captain.cargo.grain).toBe(0);
    expect(world.trade.captain.gold).toBe(100 + expectedIncome);
  });

  it('shipyard upgrades advance levels and recalculate vessel sailing stats', () => {
    world.trade.dockedAt = 'calda';
    world.trade.captain.gold = 5000;

    const baseShip = activeShip(world.trade);
    expect(world.trade.captain.ships.sloop!.sails).toBe(1);

    // Sails upgrade L2
    const sailsRes = buyUpgrade(world.trade, 'sails');
    expect(sailsRes.ok).toBe(true);
    expect(world.trade.captain.ships.sloop!.sails).toBe(2);

    const upgradedShip = activeShip(world.trade);
    expect(upgradedShip.speedRatio).toBeGreaterThan(baseShip.speedRatio);
    expect(upgradedShip.accel).toBeGreaterThan(baseShip.accel);

    // Hold upgrade L2
    const holdRes = buyUpgrade(world.trade, 'hold');
    expect(holdRes.ok).toBe(true);
    expect(world.trade.captain.ships.sloop!.hold).toBe(2);
    expect(capacity(world.trade)).toBe(16);

    // Hold upgrade L3
    const holdRes3 = buyUpgrade(world.trade, 'hold');
    expect(holdRes3.ok).toBe(true);
    expect(capacity(world.trade)).toBe(22);

    // Maxed level check
    expect(buyUpgrade(world.trade, 'hold')).toEqual({ ok: false, error: 'max-level' });
  });

  it('cutter purchasing and ship switching with cargo validation', () => {
    world.trade.dockedAt = 'calda';
    world.trade.captain.gold = 2000;

    // Purchase cutter
    expect(buyShip(world.trade, 'cutter')).toEqual({ ok: true, gold: CUTTER.price });
    expect(world.trade.captain.activeShip).toBe('cutter');
    expect(world.trade.captain.gold).toBe(2000 - CUTTER.price);
    expect(capacity(world.trade)).toBe(CUTTER.hold);

    // If hold contains 14 units (fits in Cutter hold 16, but exceeds Sloop hold 10)
    world.trade.captain.cargo.timber = 14;
    expect(switchShip(world.trade, 'sloop')).toEqual({ ok: false, error: 'cargo-too-big' });

    // When cargo reduced to 8 units, can switch back to Sloop
    world.trade.captain.cargo.timber = 8;
    expect(switchShip(world.trade, 'sloop')).toEqual({ ok: true, gold: 0 });
    expect(world.trade.captain.activeShip).toBe('sloop');
  });
});
