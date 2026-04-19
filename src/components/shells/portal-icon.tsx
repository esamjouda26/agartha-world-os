import * as React from "react";
import {
  Activity,
  Boxes,
  CalendarDays,
  CalendarOff,
  Clock,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LineChart,
  MapPin,
  Megaphone,
  MessageCircle,
  Monitor,
  Package,
  QrCode,
  Receipt,
  Ruler,
  ScanLine,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Siren,
  Trash2,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Wrench,
} from "lucide-react";

const MAP = {
  Activity,
  Boxes,
  CalendarDays,
  CalendarOff,
  Clock,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LineChart,
  MapPin,
  Megaphone,
  MessageCircle,
  Monitor,
  Package,
  QrCode,
  Receipt,
  Ruler,
  ScanLine,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Siren,
  Trash2,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Wrench,
} as const;

export type PortalIconName = keyof typeof MAP;

export function PortalIcon({ name, className }: Readonly<{ name: string; className?: string }>) {
  const Icon = (MAP as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!Icon) return null;
  return <Icon className={className} aria-hidden />;
}
