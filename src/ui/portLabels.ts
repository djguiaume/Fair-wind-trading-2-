import type { ScreenPoint } from '../render/view';
import { GOOD_DEFS, type GoodId } from '../sim/goods';
import { distance } from '../sim/math';
import { distanceToPort } from '../sim/trade';
import { currentWaypoint, type World } from '../sim/world';

export type PortMarkerMode = 'approach' | 'objective' | 'all' | 'off';

const GOOD_ICONS: Record<GoodId, string> = {
  fish: '🐟',
  grain: '🌾',
  timber: '🪵',
  stone: '🪨',
};

export class PortLabels {
  private readonly portElements: Map<
    string,
    {
      root: HTMLElement;
      boxEl: HTMLElement;
      nameEl: HTMLElement;
      tagEl: HTMLElement;
    }
  > = new Map();

  mode: PortMarkerMode = 'approach';
  isKidMode = false;
  onPortClick: (portId: string) => void = () => {};

  constructor(
    private readonly container: HTMLElement,
    private readonly world: World,
  ) {
    this.init();
  }

  private init() {
    this.container.innerHTML = '';
    const { map } = this.world;

    for (const port of map.ports) {
      const island = map.islands.find((i) => i.id === port.islandId);
      if (!island) continue;

      const produces = port.produces
        .map((g) => `${GOOD_ICONS[g as GoodId] ?? ''} ${GOOD_DEFS[g as GoodId]?.name ?? g}`)
        .join(', ');
      const wants = port.wants
        .map((g) => `${GOOD_ICONS[g as GoodId] ?? ''} ${GOOD_DEFS[g as GoodId]?.name ?? g}`)
        .join(', ');

      const el = document.createElement('div');
      el.className = 'port-harbour-sign';
      el.dataset.portId = port.id;
      el.hidden = true;

      el.innerHTML = `
        <div class="harbour-sign-content">
          <div class="harbour-sign-header">
            <span class="harbour-sign-icon">⚓</span>
            <span class="harbour-sign-name">${port.name}</span>
          </div>
          <div class="harbour-sign-goods">
            <span class="sign-makes">${produces}</span>
            <span class="sign-sep">·</span>
            <span class="sign-wants">Wants ${wants}</span>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onPortClick(port.id);
      });

      this.container.appendChild(el);

      this.portElements.set(port.id, {
        root: el,
        boxEl: el.querySelector('.harbour-sign-content')!,
        nameEl: el.querySelector('.harbour-sign-name')!,
        tagEl: el.querySelector('.harbour-sign-goods')!,
      });
    }
  }

  update(
    project: (x: number, y: number) => ScreenPoint,
    _size: { w: number; h: number },
  ) {
    if (this.mode === 'off') {
      for (const entry of this.portElements.values()) {
        entry.root.hidden = true;
      }
      return;
    }

    const { map, boat, trade } = this.world;
    const currentWp = currentWaypoint(this.world);
    const effectiveMode = this.isKidMode ? 'objective' : this.mode;

    for (const port of map.ports) {
      const entry = this.portElements.get(port.id);
      if (!entry) continue;

      const island = map.islands.find((i) => i.id === port.islandId);
      if (!island) continue;

      const distToShore = distanceToPort(map, boat, port);
      const isDocked = trade.dockedAt === port.id;
      const isObjective = currentWp?.label.toLowerCase().includes(port.name.toLowerCase());

      let shouldShow = false;

      if (effectiveMode === 'approach') {
        // Only show when near harbour (<= 45m from shore or docked)
        shouldShow = distToShore <= 45 || isDocked;
      } else if (effectiveMode === 'objective') {
        // Show only the destination port or when docked
        shouldShow = isObjective || isDocked || distToShore <= 35;
      } else if (effectiveMode === 'all') {
        shouldShow = distToShore <= 160 || isDocked;
      }

      if (!shouldShow) {
        entry.root.hidden = true;
        continue;
      }

      const s = project(island.x, island.y);
      if (s.onScreen) {
        entry.root.hidden = false;
        entry.root.classList.toggle('docked', isDocked);
        entry.root.style.transform = `translate(${s.x}px, ${s.y - 36}px)`;
      } else {
        // Hide off-screen markers to avoid screen edge clutter
        entry.root.hidden = true;
      }
    }
  }
}
