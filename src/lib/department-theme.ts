// Department theme system
// Elke afdeling krijgt eigen kleuridentiteit

export type Department = 'keuken' | 'sales' | 'logistiek' | 'groep';

export const DEPARTMENT_THEMES = {
  keuken: {
    label: 'Keuken',
    sidebar: '#F2E8D5',       // warm perkament
    sidebarBorder: '#E8D5B5',
    sidebarHover: '#FEF3E2',
    accent: '#E8A040',        // amber
    accentDark: '#C4703A',    // koper
    accentText: '#92460A',
    activeNav: '#FEF3E2',
    activeNavBorder: '#E8A040',
    badge: 'bg-amber-100 text-amber-800',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
    buttonOutline: 'border-amber-400 text-amber-700 hover:bg-amber-50',
    tag: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: '#E8A040',
    headerBg: '#FEFAF4',
  },
  sales: {
    label: 'Sales',
    sidebar: '#EBF4E8',       // lichtgroen — "samiegroen"
    sidebarBorder: '#C8E0C0',
    sidebarHover: '#D8EDD2',
    accent: '#2D6A1E',        // bosgroen
    accentDark: '#1A4510',
    accentText: '#1A4510',
    activeNav: '#D8EDD2',
    activeNavBorder: '#3A8026',
    badge: 'bg-green-100 text-green-800',
    button: 'bg-green-700 hover:bg-green-800 text-white',
    buttonOutline: 'border-green-600 text-green-700 hover:bg-green-50',
    tag: 'bg-green-50 text-green-700 border border-green-200',
    icon: '#2D6A1E',
    headerBg: '#F2FAF0',
  },
  logistiek: {
    label: 'Logistiek',
    sidebar: '#E8EEF8',       // lichtblauw
    sidebarBorder: '#C0CFEA',
    sidebarHover: '#D0DDEF',
    accent: '#1E3F8A',        // marineblauw
    accentDark: '#122660',
    accentText: '#122660',
    activeNav: '#D0DDEF',
    activeNavBorder: '#2850A8',
    badge: 'bg-blue-100 text-blue-800',
    button: 'bg-blue-800 hover:bg-blue-900 text-white',
    buttonOutline: 'border-blue-700 text-blue-800 hover:bg-blue-50',
    tag: 'bg-blue-50 text-blue-700 border border-blue-200',
    icon: '#1E3F8A',
    headerBg: '#F0F4FC',
  },
  groep: {
    label: 'Groepsoverzicht',
    sidebar: '#F2E8D5',
    sidebarBorder: '#E8D5B5',
    sidebarHover: '#FEF3E2',
    accent: '#2C1810',
    accentDark: '#1A0E08',
    accentText: '#2C1810',
    activeNav: '#FEF3E2',
    activeNavBorder: '#C4703A',
    badge: 'bg-stone-100 text-stone-800',
    button: 'bg-stone-800 hover:bg-stone-900 text-white',
    buttonOutline: 'border-stone-600 text-stone-700 hover:bg-stone-50',
    tag: 'bg-stone-50 text-stone-700 border border-stone-200',
    icon: '#C4703A',
    headerBg: '#FEFAF4',
  },
} as const;

export function getDepartmentFromPath(pathname: string): Department {
  if (pathname.startsWith('/sales')) return 'sales';
  if (pathname.startsWith('/logistiek')) return 'logistiek';
  if (pathname.startsWith('/groep')) return 'groep';
  return 'keuken';
}
