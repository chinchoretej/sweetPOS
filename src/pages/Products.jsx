import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import ProductForm from '../components/products/ProductForm';
import {
  subscribeProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/productService';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import useDebounce from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/format';

export default function Products() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const debounced = useDebounce(search, 200);
  const toast = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    const unsub = subscribeProducts((data) => {
      setItems(data);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  const categoryOptions = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    items.forEach((p) => p.category && set.add(p.category));
    return ['all', ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    return items.filter((p) => {
      const matchTerm =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term);
      const matchCat = category === 'all' || p.category === category;
      return matchTerm && matchCat;
    });
  }, [items, debounced, category]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setModalOpen(true);
  };

  const handleSubmit = async (data, file) => {
    try {
      if (editing) {
        await updateProduct(editing.id, data, file);
        toast.success('Product updated');
      } else {
        await createProduct(data, file);
        toast.success('Product added');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDelLoading(true);
    try {
      await deleteProduct(confirmDel.id, confirmDel.imagePath);
      toast.success('Product deleted');
      setConfirmDel(null);
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Products</h2>
          <p className="text-sm text-slate-500">
            Manage your sweets, prices, and categories.
          </p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Add Product
        </Button>
      </div>

      <div className="card p-3 sm:p-4 grid sm:grid-cols-3 gap-3">
        <Input
          placeholder="Search by name, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="sm:col-span-2"
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categoryOptions.map((c) => ({
            value: c,
            label: c === 'all' ? 'All categories' : c,
          }))}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={5} />
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Package className="w-10 h-10" />}
                      title="No products yet"
                      description="Add your first sweet to start billing."
                      action={
                        <Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>
                          Add product
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const low =
                    Number(p.stock || 0) <=
                    Number(p.lowStockAlert ?? settings.lowStockThreshold ?? 1);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden grid place-items-center">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">
                              {p.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{p.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(p.price, settings.currency)}
                        <span className="text-xs text-slate-500"> /{p.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${low ? 'text-rose-600' : ''}`}
                        >
                          {p.stock} {p.unit}
                        </span>
                        {low && (
                          <span className="ml-2 inline-flex items-center text-xs text-rose-600">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Low
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDel(p)}
                            className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <ProductForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete product?"
        message={`This will permanently remove "${confirmDel?.name}" and its image. Existing orders are preserved.`}
        confirmText="Delete"
        destructive
        loading={delLoading}
      />
    </div>
  );
}
