# 0021. Dockside trading and shipyard player interface

**Status:** Accepted, 2026-10-19

**Context:**
Phase 1 of the [roadmap](../roadmap.md) established the underlying trading simulation, supply-and-demand markets, sloop upgrade tracks, the cutter, and auto-save ([0015](0015-trade-economy.md)), running on the selected Staggered passages map ([0019](0019-staggered-passages-first-map.md)). Until now, players could dock but had no player-facing UI to trade goods or upgrade their vessel without using the developer console (`?debug`).

We needed:
1. A responsive dockside trading panel showing the port name, gold, cargo capacity, inventory, available stock, unit buy/sell prices, quantity controls, and exact multi-unit price quotes before purchase/sale.
2. A shipyard interface displaying upgrade tracks (sails, hold, hull) with costs and effects, clear explanations when unavailable, purchasing the cutter, and switching between owned vessels.
3. Clean separation between UI and simulation logic, preserving existing simulation APIs (`src/sim/trade.ts`) and auto-save.
4. Persistent gold and cargo readouts and readable port labels in world-space so players can locate and navigate to all four ports.
5. First-class desktop, tablet, and mobile touch usability: large touch targets, scrollable modal layout, input shielding so steering and sail adjustments never leak through an open dialog, and pause coordination.
6. Preserving provisional port production roles, island artwork, and sailing mechanics.

**Decision:**
| Topic | Choice |
|---|---|
| Docking & Trading Panel | When a player docks (`speedKn < 1.5` near island shore), a dock prompt appears and opens a full modal trading interface (`TradePanel`). Simulation pauses while the dialog is open. Players can return to sea anytime or reopen the market via the dock button while within range. |
| Dynamic Quotes | Multi-unit buy and sell orders calculate exact totals using `quoteBuy` and `quoteSell`, displaying the total and average price per unit before confirming, reflecting stock movement and elasticity. |
| Shipyard Interface | A dedicated tab displaying active vessel upgrades across Sails, Hold, and Hull tracks (levels 1 to 3) with exact gold costs, level pips, effect descriptions, and affordability hints. Allows purchasing the Cutter (1,500 gold) and switching between owned ships when cargo capacity allows. |
| In-World Port Labels & Navigation | Floating nautical labels projected in screen space (`PortLabels`) over all four ports (Port Calda, Saltmere, Westholm, Stonehaven) displaying port name, distance, production roles (`produces` and `wants`), and dock status. Off-screen ports show clamped perimeter indicators so players never lose their bearings. Tapping a port marker sets navigation heading. |
| Persistent HUD Stats | Persistent top-bar HUD displaying Captain's Gold (`🪙`), Cargo Hold Capacity (`📦 used / cap`), and active ship badge. Tapping cargo shows hold breakdown. |
| Input Shielding & Mobile Ergonomics | Input events (`Input.setEnabled(false)`) and DOM pointer/touch event propagation are shielded while dialogs are open, preventing accidental steering or tiller drags. Touch targets meet mobile guidelines (min 44–48px) with scrollable layouts and clear typography. |
| Save & Resume | Trades, upgrades, and vessel purchases trigger auto-save immediately. An in-game "New Game (Reset Progress)" option in settings lets players restart voyages without the console. |

**Consequences:**
- The complete player gameplay loop (sail → dock → buy → sail → sell → upgrade/purchase cutter → auto-save/resume) is now fully playable end-to-end via the UI.
- The simulation remains purely functional and decoupled from UI rendering.
- Visual boat model updates continue to work seamlessly: upgrading hold displays deck crates/barrels, sails upgrades add jibs and topsails, and switching vessels loads the Cutter model.
- Roadmap status for Phase 1 can be updated to complete for trading and shipyard UI.
