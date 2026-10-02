import { ASPECT_COLOR } from './svg-utils.ts';

export interface WheelProTheme {
  id: 'editorial' | 'celestial' | 'classic';
  zodiac: {
    bgColors: string[];      // 12
    glyphColors: string[];   // 12
    borderColor: string;
    tickColor: string;
    glyphFontSize: number;
  };
  houses: {
    lineColor: string; axisColor: string; mcIcColor: string;
    axisWidth: number; lineWidth: number;
    showArrow: boolean; arrowColor: string;
    labelStyle: 'roman' | 'arabic';
    labelColor: string;
    showDegreeLabels: boolean;
    dashedCusps: boolean;
    showHouseCircle: boolean; houseCircleColor: string;
  };
  planets: {
    glyphColor: string; retroColor: string; fontSize: number;
    showDegreeLabel: boolean; degreeLabelColor: string;
    pointerColor: string;
  };
  aspects: {
    colorMap: Record<string, string>;
    minStrokeWidth: number; maxStrokeWidth: number;
    separatingDash: string;
  };
  background: string; ink: string; muted: string;
  innerCircleColor: string;
}

const ELEMENT_ORDER = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]; // Fire, Earth, Air, Water
const expand = (four: string[]): string[] => ELEMENT_ORDER.map((i) => four[i]!);

const EDITORIAL: WheelProTheme = {
  id: 'editorial',
  zodiac: {
    bgColors: expand(['#F3DCDC', '#DCE9D4', '#F2EAC8', '#D6E2EE']),
    glyphColors: expand(['#B0472F', '#3E6B33', '#B5852E', '#2D5A86']),
    borderColor: 'rgba(42,37,32,0.18)', tickColor: 'rgba(42,37,32,0.30)', glyphFontSize: 18,
  },
  houses: {
    lineColor: 'rgba(42,37,32,0.22)', axisColor: '#7A2E20', mcIcColor: '#2D5A86',
    axisWidth: 1.6, lineWidth: 0.7, showArrow: true, arrowColor: '#7A2E20',
    labelStyle: 'roman', labelColor: '#6B5F53', showDegreeLabels: true,
    dashedCusps: false, showHouseCircle: true, houseCircleColor: 'rgba(42,37,32,0.14)',
  },
  planets: {
    glyphColor: '#2A2520', retroColor: '#C0542F', fontSize: 18,
    showDegreeLabel: true, degreeLabelColor: '#6B5F53', pointerColor: 'rgba(42,37,32,0.30)',
  },
  aspects: { colorMap: ASPECT_COLOR, minStrokeWidth: 0.5, maxStrokeWidth: 1.6, separatingDash: '3 2' },
  background: '#FAF5EE', ink: '#2A2520', muted: '#6B5F53', innerCircleColor: 'rgba(42,37,32,0.18)',
};

const CELESTIAL: WheelProTheme = {
  id: 'celestial',
  zodiac: {
    bgColors: expand(['#3A1E22', '#1E3A24', '#3A361E', '#1E2A3A']),
    glyphColors: expand(['#E07A5F', '#7FB069', '#E0B255', '#6FA8DC']),
    borderColor: 'rgba(212,175,55,0.30)', tickColor: 'rgba(212,175,55,0.40)', glyphFontSize: 18,
  },
  houses: {
    lineColor: 'rgba(212,175,55,0.25)', axisColor: '#D4AF37', mcIcColor: '#6FA8DC',
    axisWidth: 1.6, lineWidth: 0.7, showArrow: true, arrowColor: '#D4AF37',
    labelStyle: 'roman', labelColor: '#C4B89E', showDegreeLabels: true,
    dashedCusps: false, showHouseCircle: true, houseCircleColor: 'rgba(212,175,55,0.25)',
  },
  planets: {
    glyphColor: '#F5F0E6', retroColor: '#E07A5F', fontSize: 18,
    showDegreeLabel: true, degreeLabelColor: '#C4B89E', pointerColor: 'rgba(212,175,55,0.40)',
  },
  aspects: { colorMap: ASPECT_COLOR, minStrokeWidth: 0.5, maxStrokeWidth: 1.6, separatingDash: '3 2' },
  background: '#0B1B3A', ink: '#F5F0E6', muted: '#C4B89E', innerCircleColor: 'rgba(212,175,55,0.25)',
};

const CLASSIC: WheelProTheme = {
  id: 'classic',
  zodiac: {
    bgColors: expand(['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']),
    glyphColors: expand(['#1A1A1A', '#1A1A1A', '#1A1A1A', '#1A1A1A']),
    borderColor: '#CCCCCC', tickColor: '#999999', glyphFontSize: 18,
  },
  houses: {
    lineColor: '#CCCCCC', axisColor: '#1A1A1A', mcIcColor: '#555555',
    axisWidth: 1.4, lineWidth: 0.7, showArrow: false, arrowColor: '#1A1A1A',
    labelStyle: 'arabic', labelColor: '#555555', showDegreeLabels: false,
    dashedCusps: true, showHouseCircle: true, houseCircleColor: '#E0E0E0',
  },
  planets: {
    glyphColor: '#1A1A1A', retroColor: '#C0542F', fontSize: 18,
    showDegreeLabel: false, degreeLabelColor: '#555555', pointerColor: '#999999',
  },
  aspects: { colorMap: ASPECT_COLOR, minStrokeWidth: 0.5, maxStrokeWidth: 1.4, separatingDash: '3 2' },
  background: '#FFFFFF', ink: '#1A1A1A', muted: '#555555', innerCircleColor: '#CCCCCC',
};

export const WHEEL_PRO_THEMES = { editorial: EDITORIAL, celestial: CELESTIAL, classic: CLASSIC } as const;

export function resolveWheelProTheme(style?: string): WheelProTheme {
  return (style && (WHEEL_PRO_THEMES as Record<string, WheelProTheme>)[style]) || EDITORIAL;
}
