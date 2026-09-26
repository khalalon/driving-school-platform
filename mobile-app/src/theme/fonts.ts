/**
 * Polices « Circuit » (D-52) : Barlow Condensed (titres, chiffres, libellés en capitales),
 * Barlow (texte), Cairo (arabe). Les fichiers sont chargés par `fontAssets.ts` (App.tsx) ; ce
 * module ne porte que les noms, pour que les styles et les tests n'embarquent aucune police.
 *
 * Sur Android, une police personnalisée ne se « met pas en gras » : chaque graisse est une
 * famille distincte, et les styles désignent la famille, jamais `fontWeight`.
 */

/** Noms de famille enregistrés auprès d'`expo-font` : ce sont ceux qu'utilisent les styles. */
export const fontFamilies = {
  condensed: {
    medium: 'BarlowCondensed_500Medium',
    semibold: 'BarlowCondensed_600SemiBold',
    bold: 'BarlowCondensed_700Bold',
  },
  sans: {
    regular: 'Barlow_400Regular',
    medium: 'Barlow_500Medium',
    semibold: 'Barlow_600SemiBold',
    bold: 'Barlow_700Bold',
  },
  arabic: {
    regular: 'Cairo_400Regular',
    medium: 'Cairo_500Medium',
    semibold: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
  },
} as const;
