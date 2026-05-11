import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

const compute = (state) => {
  const subtotal = state.items.reduce(
    (sum, it) => sum + Number(it.price) * Number(it.qty),
    0
  );
  const discountAbs =
    state.discountType === 'percent'
      ? (subtotal * Number(state.discount || 0)) / 100
      : Number(state.discount || 0);
  const afterDiscount = Math.max(0, subtotal - discountAbs);
  const gst = state.enableGst ? (afterDiscount * Number(state.gstPercent || 0)) / 100 : 0;
  const total = afterDiscount + gst;
  return {
    subtotal: round2(subtotal),
    discountAbs: round2(discountAbs),
    gst: round2(gst),
    total: round2(total),
  };
};

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      customer: { mobile: '', name: '', address: '' },
      paymentMode: 'cash',
      discount: 0,
      discountType: 'flat', // 'flat' | 'percent'
      enableGst: false,
      gstPercent: 5,
      notes: '',

      addItem: (product, qty = 1) =>
        set((state) => {
          const idx = state.items.findIndex((it) => it.productId === product.id);
          const cleanQty = Number(qty) || 1;
          if (idx >= 0) {
            const items = [...state.items];
            const next = { ...items[idx], qty: round2(items[idx].qty + cleanQty) };
            next.total = round2(next.qty * next.price);
            items[idx] = next;
            return { items };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                name: product.name,
                price: Number(product.price) || 0,
                unit: product.unit || 'pcs',
                qty: cleanQty,
                total: round2(cleanQty * (Number(product.price) || 0)),
                imageUrl: product.imageUrl || null,
                stock: Number(product.stock) || 0,
              },
            ],
          };
        }),

      updateQty: (productId, qty) =>
        set((state) => ({
          items: state.items
            .map((it) =>
              it.productId === productId
                ? {
                    ...it,
                    qty: Math.max(0, Number(qty) || 0),
                    total: round2(Math.max(0, Number(qty) || 0) * it.price),
                  }
                : it
            )
            .filter((it) => it.qty > 0),
        })),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((it) => it.productId !== productId),
        })),

      setCustomer: (patch) =>
        set((state) => ({ customer: { ...state.customer, ...patch } })),

      setDiscount: (discount, discountType) =>
        set(() => ({
          discount: Number(discount) || 0,
          discountType: discountType || 'flat',
        })),

      setPaymentMode: (paymentMode) => set({ paymentMode }),
      setEnableGst: (enableGst) => set({ enableGst }),
      setGstPercent: (gstPercent) => set({ gstPercent }),
      setNotes: (notes) => set({ notes }),

      reset: () =>
        set({
          items: [],
          customer: { mobile: '', name: '', address: '' },
          discount: 0,
          discountType: 'flat',
          paymentMode: 'cash',
          notes: '',
        }),

      totals: () => compute(get()),
    }),
    { name: 'sweetpos:cart' }
  )
);

export default useCartStore;
