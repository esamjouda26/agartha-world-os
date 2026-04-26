"use client";

import { useState, useCallback } from "react";

import Image from "next/image";

import { ShoppingBag, X, Minus, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyStateCta } from "@/components/shared/empty-state-cta";
import { FormSection } from "@/components/ui/form-section";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastSuccess, toastError } from "@/components/ui/toast-helpers";
import { submitOrderAction } from "@/features/pos/actions/submit-order";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/features/pos/constants";
import type {
  CatalogCategory,
  CatalogItem,
  CatalogModifierGroup,
  CartLine,
  CartModifierSelection,
  PosContext,
  PaymentMethod,
} from "@/features/pos/types";

type PosTerminalProps = Readonly<{ posContext: PosContext }>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildCartKey(materialId: string, modifiers: ReadonlyArray<CartModifierSelection>): string {
  const sortedIds = [...modifiers.map((m) => m.optionId)].sort().join(",");
  return `${materialId}::${sortedIds}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(price);
}

// ── Local sub-component: Catalog ─────────────────────────────────────────────

type CatalogProps = Readonly<{
  categories: ReadonlyArray<CatalogCategory>;
  onSelectItem: (item: CatalogItem) => void;
}>;

function Catalog({ categories, onSelectItem }: CatalogProps) {
  if (categories.length === 0) {
    return (
      <EmptyStateCta
        variant="first-use"
        title="No items available"
        description="Menu items will appear here once configured."
        data-testid="pos-catalog-empty"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => (
        <FormSection key={category.id ?? "uncategorised"} title={category.name} headingLevel={3}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {category.items.map((item) => (
              <button
                key={item.materialId}
                type="button"
                data-testid={`pos-catalog-item-${item.materialId}`}
                onClick={() => onSelectItem(item)}
                className="border-border bg-card hover:bg-accent flex min-h-[44px] flex-col overflow-hidden rounded-xl border text-left transition-colors active:scale-95"
              >
                {item.imageUrl ? (
                  <div className="relative h-28 w-full">
                    <Image
                      src={item.imageUrl}
                      alt={item.displayName ?? item.materialName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 45vw, 25vw"
                    />
                  </div>
                ) : (
                  <div className="bg-muted flex h-28 w-full items-center justify-center">
                    <span className="text-muted-foreground text-2xl">🛒</span>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm leading-tight font-medium">
                    {item.displayName ?? item.materialName}
                  </p>
                  <p className="text-primary mt-1 text-sm font-semibold">
                    {formatPrice(item.sellingPrice)}
                  </p>
                  {item.modifierGroups.length > 0 && (
                    <p className="text-muted-foreground mt-0.5 text-xs">Customisable</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </FormSection>
      ))}
    </div>
  );
}

// ── Local sub-component: Cart ─────────────────────────────────────────────────

type CartProps = Readonly<{
  lines: ReadonlyArray<CartLine>;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onRemove: (key: string) => void;
  subtotal: number;
}>;

function Cart({ lines, onIncrement, onDecrement, onRemove, subtotal }: CartProps) {
  if (lines.length === 0) {
    return (
      <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
        Cart is empty
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => (
        <div
          key={line.key}
          className="border-border bg-card flex items-start gap-3 rounded-xl border p-3"
          data-testid={`pos-cart-line-${line.key}`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{line.materialName}</p>
            {line.selectedModifiers.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {line.selectedModifiers.map((m) => (
                  <Badge key={m.optionId} variant="secondary" className="text-xs">
                    {m.optionName}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-primary mt-1 text-sm font-semibold">{formatPrice(line.lineTotal)}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDecrement(line.key)}
              data-testid={`pos-cart-decrement-${line.key}`}
              aria-label={`Decrease quantity of ${line.materialName}`}
            >
              <Minus size={14} />
            </Button>
            <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onIncrement(line.key)}
              data-testid={`pos-cart-increment-${line.key}`}
              aria-label={`Increase quantity of ${line.materialName}`}
            >
              <Plus size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-8 w-8"
              onClick={() => onRemove(line.key)}
              data-testid={`pos-cart-remove-${line.key}`}
              aria-label={`Remove ${line.materialName} from cart`}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ))}

      <div className="border-border flex justify-between border-t pt-3">
        <span className="text-sm font-medium">Subtotal</span>
        <span className="text-base font-bold">{formatPrice(subtotal)}</span>
      </div>
    </div>
  );
}

// ── Local sub-component: Modifier Selector ────────────────────────────────────

function validateGroup(
  group: CatalogModifierGroup,
  selected: ReadonlyArray<CartModifierSelection>,
): string | null {
  if (selected.length < group.minSelections) {
    return `Choose at least ${group.minSelections}`;
  }
  if (selected.length > group.maxSelections) {
    return `Choose at most ${group.maxSelections}`;
  }
  return null;
}

type ModifierSelectorProps = Readonly<{
  item: CatalogItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (item: CatalogItem, modifiers: ReadonlyArray<CartModifierSelection>) => void;
}>;

function ModifierSelector({ item, open, onClose, onConfirm }: ModifierSelectorProps) {
  const [selections, setSelections] = useState<Record<string, CartModifierSelection[]>>({});

  if (!item) return null;
  // Non-null capture — TypeScript can't narrow through closures, so we
  // bind the narrowed value explicitly.
  const activeItem = item;

  function toggleOption(
    group: CatalogModifierGroup,
    optId: string,
    optName: string,
    delta: number,
  ) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const exists = current.some((s) => s.optionId === optId);
      if (exists) {
        return { ...prev, [group.id]: current.filter((s) => s.optionId !== optId) };
      }
      if (current.length >= group.maxSelections) {
        // Replace last selection when maxSelections = 1 (radio behaviour)
        if (group.maxSelections === 1) {
          return {
            ...prev,
            [group.id]: [{ optionId: optId, optionName: optName, priceDelta: delta }],
          };
        }
        return prev;
      }
      return {
        ...prev,
        [group.id]: [...current, { optionId: optId, optionName: optName, priceDelta: delta }],
      };
    });
  }

  function handleConfirm() {
    // Validate all groups
    for (const group of activeItem.modifierGroups) {
      const err = validateGroup(group, selections[group.id] ?? []);
      if (err) return;
    }
    const allSelected = Object.values(selections).flat();
    onConfirm(activeItem, allSelected);
    setSelections({});
  }

  function handleClose() {
    setSelections({});
    onClose();
  }

  const allValid = activeItem.modifierGroups.every(
    (g) => validateGroup(g, selections[g.id] ?? []) === null,
  );

  const modifierTotal = Object.values(selections)
    .flat()
    .reduce((sum, s) => sum + s.priceDelta, 0);

  const displayName = activeItem.displayName ?? activeItem.materialName;
  const totalPrice = activeItem.sellingPrice + modifierTotal;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-semibold">{displayName}</SheetTitle>
          <p className="text-muted-foreground text-sm">
            Base price: {formatPrice(activeItem.sellingPrice)}
          </p>
        </SheetHeader>

        <div className="flex flex-col gap-6 pb-4">
          {activeItem.modifierGroups.map((group) => {
            const groupSelected = selections[group.id] ?? [];
            const err = validateGroup(group, groupSelected);
            const isRadio = group.maxSelections === 1;

            return (
              <div key={group.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{group.displayName}</span>
                  <span className="text-muted-foreground text-xs">
                    {isRadio ? "Choose 1" : `Choose ${group.minSelections}–${group.maxSelections}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map((opt) => {
                    const selected = groupSelected.some((s) => s.optionId === opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`pos-modifier-option-${opt.id}`}
                        onClick={() => toggleOption(group, opt.id, opt.name, opt.priceDelta)}
                        className={`flex min-h-[44px] flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card hover:bg-accent"
                        }`}
                      >
                        <span className="text-sm font-medium">{opt.name}</span>
                        {opt.priceDelta !== 0 && (
                          <span className="text-muted-foreground text-xs">
                            {opt.priceDelta > 0 ? "+" : ""}
                            {formatPrice(opt.priceDelta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {err && groupSelected.length > 0 && (
                  <p className="text-destructive text-xs">{err}</p>
                )}
              </div>
            );
          })}
        </div>

        <SheetFooter className="bg-background sticky bottom-0 pt-4 pb-2">
          <Button
            type="button"
            className="min-h-[48px] w-full text-base font-semibold"
            onClick={handleConfirm}
            disabled={!allValid}
            data-testid="pos-modifier-confirm"
          >
            Add to cart
            {modifierTotal !== 0 && (
              <Badge variant="secondary" className="ml-2">
                {formatPrice(totalPrice)}
              </Badge>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Main: PosTerminal ─────────────────────────────────────────────────────────

export function PosTerminal({ posContext }: PosTerminalProps) {
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [modifierItem, setModifierItem] = useState<CatalogItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cartLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const totalQty = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  const handleSelectItem = useCallback((item: CatalogItem) => {
    if (item.modifierGroups.length > 0) {
      setModifierItem(item);
    } else {
      addToCart(item, []);
    }
  }, []);

  function addToCart(item: CatalogItem, modifiers: ReadonlyArray<CartModifierSelection>) {
    const key = buildCartKey(item.materialId, modifiers);
    const modTotal = modifiers.reduce((s, m) => s + m.priceDelta, 0);
    setCartLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key
            ? {
                ...l,
                quantity: l.quantity + 1,
                lineTotal: (l.quantity + 1) * (l.basePrice + modTotal),
              }
            : l,
        );
      }
      return [
        ...prev,
        {
          key,
          materialId: item.materialId,
          materialName: item.displayName ?? item.materialName,
          basePrice: item.sellingPrice,
          quantity: 1,
          selectedModifiers: modifiers,
          lineTotal: item.sellingPrice + modTotal,
        },
      ];
    });
  }

  function incrementLine(key: string) {
    setCartLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              quantity: l.quantity + 1,
              lineTotal:
                (l.quantity + 1) *
                (l.basePrice + l.selectedModifiers.reduce((s, m) => s + m.priceDelta, 0)),
            }
          : l,
      ),
    );
  }

  function decrementLine(key: string) {
    setCartLines((prev) =>
      prev.flatMap((l) => {
        if (l.key !== key) return [l];
        if (l.quantity <= 1) return [];
        const modTotal = l.selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
        return [
          {
            ...l,
            quantity: l.quantity - 1,
            lineTotal: (l.quantity - 1) * (l.basePrice + modTotal),
          },
        ];
      }),
    );
  }

  function removeLine(key: string) {
    setCartLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function handleCheckout() {
    if (cartLines.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await submitOrderAction({
        posPointId: posContext.posPointId,
        items: cartLines.map((l) => ({
          material_id: l.materialId,
          quantity: l.quantity,
          modifiers: l.selectedModifiers.map((m) => m.optionId),
        })),
        paymentMethod,
        idempotencyKey: crypto.randomUUID(),
      });
      if (result.success) {
        toastSuccess("Order submitted successfully!");
        setCartLines([]);
        setCartOpen(false);
      } else {
        toastError(result);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Catalog — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        <Catalog categories={posContext.categories} onSelectItem={handleSelectItem} />
      </div>

      {/* Sticky cart FAB — bottom 100px band (crew mobile contract) */}
      {totalQty > 0 && (
        <div className="fixed right-0 bottom-[72px] left-0 z-40 px-4 md:relative md:bottom-auto md:px-0 md:pt-2">
          <Button
            className="min-h-[52px] w-full text-base font-semibold shadow-lg"
            onClick={() => setCartOpen(true)}
            data-testid="pos-view-cart-button"
          >
            <ShoppingBag size={20} className="mr-2" />
            View Cart
            <Badge variant="secondary" className="ml-2">
              {totalQty}
            </Badge>
            <span className="ml-auto font-bold">{formatPrice(subtotal)}</span>
          </Button>
        </div>
      )}

      {/* Cart Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle>Your Cart</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCartOpen(false)}
                data-testid="pos-cart-close"
                aria-label="Close cart"
              >
                <X size={20} />
              </Button>
            </div>
          </SheetHeader>

          <Cart
            lines={cartLines}
            onIncrement={incrementLine}
            onDecrement={decrementLine}
            onRemove={removeLine}
            subtotal={subtotal}
          />

          <SheetFooter className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="payment-method-select">
                Payment method
              </label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger
                  id="payment-method-select"
                  className="w-full"
                  data-testid="pos-payment-method-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} data-testid={`pos-payment-method-${m}`}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="min-h-[52px] w-full text-base font-semibold"
              onClick={handleCheckout}
              disabled={isSubmitting || cartLines.length === 0}
              data-testid="pos-checkout-button"
            >
              {isSubmitting ? "Submitting…" : `Checkout — ${formatPrice(subtotal)}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Modifier selector */}
      <ModifierSelector
        item={modifierItem}
        open={modifierItem !== null}
        onClose={() => setModifierItem(null)}
        onConfirm={(item, mods) => {
          addToCart(item, mods);
          setModifierItem(null);
        }}
      />
    </div>
  );
}
