import { administrativeNavigation, mainNavigation, type NavItemMeta } from '../routes/routeMeta'

export type NavItem = NavItemMeta
export const navItems: NavItem[] = [...mainNavigation, ...administrativeNavigation]
