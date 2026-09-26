/**
 * Composants propres au style « Circuit » (13.6, D-52) : ce qui fait le tableau de bord.
 * `import { Gauge, SectorBar, StatRow, TimeBlock } from '../../components/circuit';`
 * Ils servent aussi aux graphiques des phases suivantes (22.3).
 */

export { DateBadge } from './DateBadge';
export { Gauge, gaugeFill } from './Gauge';
export { SectorBar } from './SectorBar';
export type { Sector, SectorState } from './SectorBar';
export { StatRow } from './StatRow';
export { TabBar } from './TabBar';
export type { TabBarItem } from './TabBar';
export { TimeBlock } from './TimeBlock';
