/**
 * Public surface of the design-system primitive catalog. This file is the only
 * permitted barrel in the codebase (CLAUDE.md §1 + prompt.md rule on barrels).
 * Feature code should import from `@/components/ui` rather than deep paths so
 * primitive-internal refactors stay free of ripple effects.
 */

// shadcn primitives (Phase 2A)
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
export { Alert, AlertDescription, AlertTitle } from "./alert";
export { Avatar, AvatarFallback, AvatarImage } from "./avatar";
export { Badge, badgeVariants } from "./badge";
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
export { Button, buttonVariants } from "./button";
export { Calendar } from "./calendar";
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
export { Checkbox } from "./checkbox";
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
export {
  Form,
  FormControl as LegacyFormControl,
  FormDescription as LegacyFormDescription,
  FormField as LegacyFormField,
  FormItem as LegacyFormItem,
  FormLabel as LegacyFormLabel,
  FormMessage as LegacyFormMessage,
  useFormField,
} from "./form";
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
export { Input } from "./input";
export { Label } from "./label";
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";
export { Popover, PopoverContent, PopoverTrigger } from "./popover";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export { ScrollArea, ScrollBar } from "./scroll-area";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";
export { Separator } from "./separator";
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
export { Skeleton } from "./skeleton";
export { Toaster } from "./sonner";
export { Switch } from "./switch";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants } from "./tabs";
export { Textarea } from "./textarea";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

// Phase 2B custom primitives
export { BottomTabBar, type BottomTabBarProps, type BottomTabItem } from "./bottom-tab-bar";
export {
  CommandPalette,
  registerCommand,
  useRegisterCommand,
  type CommandDefinition,
  type CommandPaletteProps,
  type NavCommand,
} from "./command-palette";
export { DataTable, type DataTableProps, type Density } from "./data-table";
export { EmptyState, emptyStateVariants, type EmptyStateProps } from "./empty-state";
export { ErrorState, type ErrorStateProps } from "./error-state";
export {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
  useServerErrors,
  type FormSubmitButtonProps,
} from "./form-primitives";
export { KpiCard, KpiCardRow, kpiCardVariants, type KpiCardProps } from "./kpi-card";
export {
  PageBreadcrumb,
  type PageBreadcrumbProps,
  type BreadcrumbItemInput,
} from "./page-breadcrumb";
export { PageHeader, type PageHeaderProps } from "./page-header";
export {
  Sidebar,
  SIDEBAR_COOKIE,
  type SidebarItem,
  type SidebarProps,
  type SidebarSection,
  type SidebarState,
} from "./sidebar";
export {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  StatsSkeleton,
  TableSkeleton,
  type CardSkeletonProps,
  type DetailSkeletonProps,
  type FormSkeletonProps,
  type StatsSkeletonProps,
  type TableSkeletonProps,
} from "./skeleton-kit";
export {
  StatusBadge,
  resolveStatusTone,
  statusBadgeVariants,
  type StatusBadgeProps,
  type StatusEnum,
  type StatusTone,
  type StatusVariant,
} from "./status-badge";
export { StatusTabBar, type StatusTabBarProps, type StatusTabDefinition } from "./status-tab-bar";
export { toastError, toastInfo, toastSuccess, toastWarning } from "./toast-helpers";
