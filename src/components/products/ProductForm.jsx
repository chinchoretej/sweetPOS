import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { DEFAULT_CATEGORIES, UNIT_TYPES } from '../../constants/categories';
import { isPositiveNumber, isNonNegativeNumber } from '../../utils/validators';

const EMPTY = {
  name: '',
  category: DEFAULT_CATEGORIES[0],
  price: '',
  stock: 0,
  unit: 'kg',
  description: '',
  lowStockAlert: 1,
  barcode: '',
};

export default function ProductForm({
  initial,
  onSubmit,
  onCancel,
  categories = DEFAULT_CATEGORIES,
}) {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (initial) {
      setForm({ ...EMPTY, ...initial });
      setPreview(initial.imageUrl || null);
    } else {
      setForm(EMPTY);
      setPreview(null);
    }
    setFile(null);
  }, [initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!isPositiveNumber(form.price)) e.price = 'Enter a valid price';
    if (!isNonNegativeNumber(form.stock)) e.stock = 'Enter a valid stock';
    if (!form.unit) e.unit = 'Pick a unit';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        lowStockAlert: Number(form.lowStockAlert) || 0,
      };
      await onSubmit(payload, file);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Product Name"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          placeholder="e.g. Kaju Katli"
          required
        />
        <Select
          label="Category"
          value={form.category}
          onChange={set('category')}
          options={categories}
        />
        <Input
          label="Price"
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={set('price')}
          error={errors.price}
          placeholder="950"
          required
        />
        <Select
          label="Unit"
          value={form.unit}
          onChange={set('unit')}
          options={UNIT_TYPES}
          error={errors.unit}
        />
        <Input
          label="Stock"
          type="number"
          step="0.01"
          min="0"
          value={form.stock}
          onChange={set('stock')}
          error={errors.stock}
          placeholder="10"
        />
        <Input
          label="Low Stock Alert"
          type="number"
          min="0"
          value={form.lowStockAlert}
          onChange={set('lowStockAlert')}
          placeholder="1"
          hint="You'll be alerted at or below this level"
        />
        <Input
          label="Barcode (optional)"
          value={form.barcode}
          onChange={set('barcode')}
          placeholder="Scan or type"
          className="sm:col-span-2"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[88px]"
          value={form.description}
          onChange={set('description')}
          placeholder="Short product description…"
        />
      </div>
      <div>
        <label className="label">Product Image</label>
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center overflow-hidden">
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="secondary"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => fileRef.current?.click()}
            >
              {preview ? 'Change image' : 'Upload image'}
            </Button>
            <p className="text-xs text-slate-500 mt-1">PNG/JPG up to 2MB</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
