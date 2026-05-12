import { addDoc, collection, getDocs, query, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const SAMPLE_PRODUCTS = [
  {
    name: 'Kaju Katli',
    category: 'Dry Fruit Sweets',
    price: 950,
    stock: 5,
    unit: 'kg',
    description: 'Premium cashew fudge, festive favorite.',
    lowStockAlert: 1,
  },
  {
    name: 'Motichoor Laddoo',
    category: 'Festival Specials',
    price: 480,
    stock: 8,
    unit: 'kg',
    description: 'Traditional gram flour laddoos.',
    lowStockAlert: 2,
  },
  {
    name: 'Rasgulla',
    category: 'Bengali Sweets',
    price: 420,
    stock: 60,
    unit: 'pcs',
    description: 'Spongy cottage cheese balls in syrup.',
    lowStockAlert: 10,
  },
  {
    name: 'Gulab Jamun',
    category: 'Bengali Sweets',
    price: 360,
    stock: 80,
    unit: 'pcs',
    description: 'Khoya dumplings in saffron syrup.',
    lowStockAlert: 10,
  },
  {
    name: 'Soan Papdi',
    category: 'Festival Specials',
    price: 420,
    stock: 12,
    unit: 'kg',
    description: 'Flaky cardamom infused sweet.',
    lowStockAlert: 2,
  },
  {
    name: 'Sugar-Free Anjeer Roll',
    category: 'Sugar-Free',
    price: 1200,
    stock: 3,
    unit: 'kg',
    description: 'Fig & dry-fruit roll, no sugar.',
    lowStockAlert: 1,
  },
  {
    name: 'Besan Laddoo',
    category: 'Milk Sweets',
    price: 420,
    stock: 7,
    unit: 'kg',
    description: 'Roasted gram flour laddoos.',
    lowStockAlert: 1,
  },
  {
    name: 'Kaju Roll',
    category: 'Dry Fruit Sweets',
    price: 1100,
    stock: 4,
    unit: 'kg',
    description: 'Cashew rolls with silver leaf.',
    lowStockAlert: 1,
  },
  {
    name: 'Mixture Namkeen',
    category: 'Namkeen',
    price: 320,
    stock: 15,
    unit: 'kg',
    description: 'Crunchy savoury mixture.',
    lowStockAlert: 2,
  },
];

export const seedSampleProducts = async (shopId) => {
  if (!db) throw new Error('Firebase not configured');
  if (!shopId) throw new Error('shopId required');
  const path = collection(db, 'shops', shopId, 'products');
  const existing = await getDocs(query(path, limit(1)));
  if (!existing.empty) return { skipped: true, message: 'Products already exist.' };

  await Promise.all(
    SAMPLE_PRODUCTS.map((p) =>
      addDoc(path, {
        ...p,
        shopId,
        imageUrl: null,
        imagePath: null,
        soldCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );
  return { skipped: false, count: SAMPLE_PRODUCTS.length };
};

export { SAMPLE_PRODUCTS };
