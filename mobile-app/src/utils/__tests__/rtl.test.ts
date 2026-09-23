/**
 * Sens de lecture (D-47, 10.6) : les icônes directionnelles se retournent en arabe, les autres
 * restent telles quelles.
 */
import { mirrorIcon } from '../rtl';

describe('mirrorIcon', () => {
  it('en lecture de gauche à droite, rien ne change', () => {
    expect(mirrorIcon('arrow-back', false)).toBe('arrow-back');
    expect(mirrorIcon('chevron-forward', false)).toBe('chevron-forward');
  });

  it('en arabe (RTL), les flèches et chevrons se retournent', () => {
    expect(mirrorIcon('arrow-back', true)).toBe('arrow-forward');
    expect(mirrorIcon('arrow-forward', true)).toBe('arrow-back');
    expect(mirrorIcon('chevron-forward', true)).toBe('chevron-back');
    expect(mirrorIcon('chevron-back-outline', true)).toBe('chevron-forward-outline');
  });

  it('une icône sans sens de lecture est laissée telle quelle', () => {
    expect(mirrorIcon('calendar-outline', true)).toBe('calendar-outline');
    expect(mirrorIcon('person', true)).toBe('person');
  });
});
