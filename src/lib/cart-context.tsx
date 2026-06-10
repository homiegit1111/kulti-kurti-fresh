"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type MockProduct, isShopifyConfigured } from "@/lib/shopify";
import { trackAddToCart } from "@/lib/analytics";
import {
  SHOPIFY_CART_ID_KEY,
  cartLinesAdd,
  cartLinesRemove,
  cartLinesUpdate,
  getOrCreateCart,
  updateCartBuyerEmail,
  type ShopifyCart,
} from "@/lib/shopify-cart";

// ── Cart item type ─────────────────────────────────────────────────────────────

export interface CartItem {
  id: string; // local unique key
  productId: string;
  title: string;
  handle: string;
  image: string;
  price: number;
  salePrice: number | null;
  size: string;
  color: string;
  quantity: number;
  // Shopify-specific (present when synced to Shopify cart)
  variantId?: string; // Shopify variant GID  e.g. "gid://shopify/ProductVariant/xxx"
  lineId?: string; // Shopify cart line ID
}

// ── Context type ───────────────────────────────────────────────────────────────

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: MockProduct, size: string, color?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  // Shopify
  cartId: string | null;
  checkoutUrl: string | null; // redirect here to pay — Shopify handles it
  isSyncing: boolean;
  shopifyCartEnabled: boolean;
  // Last sync error (null when healthy) — surface this to the user
  syncError: string | null;
  clearSyncError: () => void;
  // Attach buyer email to cart (called after login)
  attachBuyerEmail: (email: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_CART_KEY = "rangat-pehnawa-cart";

// ── Provider ───────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const shopifyCartEnabled = isShopifyConfigured();

  // ── Serialized Shopify mutation queue ────────────────────────────────────────
  //   Shopify cart mutations must not run concurrently (line adds/removes can
  //   race and clobber each other). We chain every mutation onto a single
  //   promise so they run in order — and, crucially, none are ever dropped.
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingCount = useRef(0);

  const enqueueSync = useCallback((task: () => Promise<void>) => {
    pendingCount.current += 1;
    setIsSyncing(true);
    syncQueue.current = syncQueue.current
      .then(() => task())
      .catch((err) => {
        console.error("[cart] Shopify sync failed:", err);
        setSyncError(
          "We couldn't sync your bag with checkout. Please retry in a moment.",
        );
      })
      .finally(() => {
        pendingCount.current -= 1;
        if (pendingCount.current <= 0) {
          pendingCount.current = 0;
          setIsSyncing(false);
        }
      });
    return syncQueue.current;
  }, []);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  // ── Hydrate ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const stored = localStorage.getItem(LOCAL_CART_KEY);
        if (stored) setItems(JSON.parse(stored));
      } catch {
        // ignore
      }

      if (shopifyCartEnabled) {
        const storedCartId = localStorage.getItem(SHOPIFY_CART_ID_KEY);
        if (storedCartId) setCartId(storedCartId);
      }

      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist local cart ───────────────────────────────────────────────────────

  useEffect(() => {
    if (hydrated) localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // ── Derived totals ───────────────────────────────────────────────────────────

  const itemCount = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + (i.salePrice ?? i.price) * i.quantity, 0),
    [items],
  );
  const total = subtotal;

  // ── Shopify sync helper ──────────────────────────────────────────────────────

  /**
   * Get-or-create a Shopify cart and add a line item.
   * Also attaches size/color as line-item attributes so Shopify order shows them.
   */
  const syncAddToShopify = useCallback(
    async (
      localId: string,
      variantId: string,
      quantity: number,
      size: string,
      color: string,
    ) => {
      if (!shopifyCartEnabled) return;

      let activeCartId = cartId;

      if (!activeCartId) {
        const newCart = await getOrCreateCart();
        if (!newCart) throw new Error("Could not create Shopify cart");
        activeCartId = newCart.id;
        setCartId(newCart.id);
        setCheckoutUrl(newCart.checkoutUrl);
        localStorage.setItem(SHOPIFY_CART_ID_KEY, newCart.id);
      }

      const updatedCart = await cartLinesAdd(activeCartId, [
        {
          merchandiseId: variantId,
          quantity,
          attributes: [
            { key: "Size", value: size },
            { key: "Color", value: color },
          ],
        },
      ]);

      if (!updatedCart) throw new Error("Shopify cartLinesAdd returned null");

      setCheckoutUrl(updatedCart.checkoutUrl);
      setSyncError(null);

      // Find the new Shopify line ID by matching merchandiseId
      const shopifyLine = updatedCart.lines.nodes.find(
        (l) => l.merchandise.id === variantId,
      );

      if (shopifyLine) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === localId ? { ...item, lineId: shopifyLine.id } : item,
          ),
        );
      }
    },
    [cartId, shopifyCartEnabled],
  );

  // ── Cart actions ─────────────────────────────────────────────────────────────

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (product: MockProduct, size: string, color?: string) => {
      // Inventory guard (safety net): never add a product Shopify reports as
      // unavailable, even if a UI surface forgets to disable its button.
      // `undefined` means unknown/mock → allowed.
      if (product.availableForSale === false) {
        setSyncError("Sorry — this piece is currently sold out.");
        return;
      }

      // GA4 ecommerce event (no-op unless analytics is configured + consented).
      trackAddToCart({
        item_id: product.id,
        item_name: product.title,
        price: product.salePrice ?? product.price,
        quantity: 1,
        item_category: product.category,
        item_variant: size,
      });

      const resolvedColor = color || product.colors[0] || "default";
      const variantId =
        product.variantIds?.[size] ?? product.variantId ?? undefined;

      setItems((prev) => {
        const existingIdx = prev.findIndex(
          (item) =>
            item.productId === product.id &&
            item.size === size &&
            item.color === resolvedColor,
        );

        if (existingIdx > -1) {
          const updated = [...prev];
          const existing = updated[existingIdx];
          updated[existingIdx] = {
            ...existing,
            quantity: existing.quantity + 1,
          };

          // Sync quantity change to Shopify (serialized via queue)
          if (shopifyCartEnabled && cartId && existing.lineId) {
            const lineId = existing.lineId;
            const nextQty = existing.quantity + 1;
            void enqueueSync(async () => {
              const cart = await cartLinesUpdate(cartId, [
                { id: lineId, quantity: nextQty },
              ]);
              if (cart?.checkoutUrl) setCheckoutUrl(cart.checkoutUrl);
            });
          }

          return updated;
        }

        const newId = `${product.id}-${size}-${resolvedColor}-${Date.now()}`;
        const newItem: CartItem = {
          id: newId,
          productId: product.id,
          title: product.title,
          handle: product.handle,
          image: product.image,
          price: product.price,
          salePrice: product.salePrice,
          size,
          color: resolvedColor,
          quantity: 1,
          variantId,
        };

        // Queue Shopify sync (serialized — never dropped)
        if (shopifyCartEnabled && variantId) {
          void enqueueSync(() =>
            syncAddToShopify(newId, variantId, 1, size, resolvedColor),
          );
        }

        return [...prev, newItem];
      });

      setIsOpen(true);
    },
    [cartId, shopifyCartEnabled, syncAddToShopify, enqueueSync],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setItems((prev) => {
        const item = prev.find((i) => i.id === itemId);
        if (shopifyCartEnabled && cartId && item?.lineId) {
          const lineId = item.lineId;
          void enqueueSync(async () => {
            const cart = await cartLinesRemove(cartId, [lineId]);
            if (cart?.checkoutUrl) setCheckoutUrl(cart.checkoutUrl);
          });
        }
        return prev.filter((i) => i.id !== itemId);
      });
    },
    [cartId, shopifyCartEnabled, enqueueSync],
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(itemId);
        return;
      }
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          if (shopifyCartEnabled && cartId && item.lineId) {
            const lineId = item.lineId;
            void enqueueSync(async () => {
              const cart = await cartLinesUpdate(cartId, [
                { id: lineId, quantity },
              ]);
              if (cart?.checkoutUrl) setCheckoutUrl(cart.checkoutUrl);
            });
          }
          return { ...item, quantity };
        }),
      );
    },
    [cartId, shopifyCartEnabled, removeItem, enqueueSync],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setIsOpen(false);
    setCartId(null);
    setCheckoutUrl(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(SHOPIFY_CART_ID_KEY);
    }
  }, []);

  const attachBuyerEmail = useCallback(
    (email: string) => {
      // Capture a snapshot for abandoned-cart recovery (no-op server-side
      // unless Supabase is configured). Fire-and-forget; never blocks UX.
      if (items.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const recoveryId =
          cartId ??
          (() => {
            let id = localStorage.getItem("rangat-pehnawa-recovery-id");
            if (!id) {
              id = `local-${crypto.randomUUID()}`;
              localStorage.setItem("rangat-pehnawa-recovery-id", id);
            }
            return id;
          })();

        void fetch("/api/cart/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartId: recoveryId,
            email,
            subtotal,
            checkoutUrl,
            items: items.map((i) => ({
              productId: i.productId,
              title: i.title,
              handle: i.handle,
              image: i.image,
              price: i.salePrice ?? i.price,
              quantity: i.quantity,
              size: i.size,
            })),
          }),
        }).catch(() => undefined);
      }

      if (!shopifyCartEnabled || !cartId) return;
      void updateCartBuyerEmail(cartId, email).then((cart) => {
        if (cart?.checkoutUrl) setCheckoutUrl(cart.checkoutUrl);
      });
    },
    [cartId, shopifyCartEnabled, items, subtotal, checkoutUrl],
  );

  // ── Reconcile with Shopify on first hydration ────────────────────────────────
  //   When the user refreshes the page, local cart items exist but lineIds may
  //   be stale. We fetch the Shopify cart and re-attach lineIds where possible.

  useEffect(() => {
    if (!hydrated || !shopifyCartEnabled) return;

    const unsynced = items.filter((i) => i.variantId && !i.lineId);
    if (unsynced.length === 0 && !cartId) return;

    void (async () => {
      let activeCartId = cartId;

      if (!activeCartId) {
        const cart = await getOrCreateCart();
        if (!cart) return;
        activeCartId = cart.id;
        setCartId(cart.id);
        setCheckoutUrl(cart.checkoutUrl);
        localStorage.setItem(SHOPIFY_CART_ID_KEY, cart.id);
        return;
      }

      // Fetch existing Shopify cart to reconcile lineIds
      const { getCart } = await import("@/lib/shopify-cart");
      const existing: ShopifyCart | null = await getCart(activeCartId);
      if (!existing) return;

      setCheckoutUrl(existing.checkoutUrl);

      const lineByVariant = new Map(
        existing.lines.nodes.map((l) => [l.merchandise.id, l.id]),
      );

      setItems((prev) =>
        prev.map((item) => {
          if (!item.variantId || item.lineId) return item;
          const existingLineId = lineByVariant.get(item.variantId);
          return existingLineId ? { ...item, lineId: existingLineId } : item;
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ── Context value ────────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      total,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      cartId,
      checkoutUrl,
      isSyncing,
      shopifyCartEnabled,
      syncError,
      clearSyncError,
      attachBuyerEmail,
    }),
    [
      items,
      itemCount,
      subtotal,
      total,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      cartId,
      checkoutUrl,
      isSyncing,
      shopifyCartEnabled,
      syncError,
      clearSyncError,
      attachBuyerEmail,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
