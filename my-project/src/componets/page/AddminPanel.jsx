import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Link } from 'react-router-dom';

const ADMIN_EMAIL = "makwanachandu480@gmail.com";

function AdminPanel() {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();
  const [successMsg, setSuccessMsg] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Admin protection — localStorage se check karo
  const localStorageData = JSON.parse(localStorage.getItem('loginData')) || [];
  const activeUser = localStorageData.find(u => u.isLogin === true);
  const isAdmin = activeUser?.email === ADMIN_EMAIL || activeUser?.role === 'admin';

  if (!isAdmin) return <Navigate to="/" replace />;

  const onSubmit = (data) => {
    const products = JSON.parse(localStorage.getItem('products')) || [];

    if (editingId) {
      // Update existing product
      const updatedProducts = products.map(p =>
        p.id === editingId
          ? { ...p, ...data, description: data.description || '' }
          : p
      );
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      setSuccessMsg('PRODUCT UPDATED SUCCESSFULLY!');
      setEditingId(null);
    } else {
      // Add new product
      const newProduct = {
        id: Date.now(),
        name: data.name,
        price: data.price,
        tag: data.tag,
        category: data.category,
        image: data.image,
        description: data.description || '',
      };
      products.push(newProduct);
      localStorage.setItem('products', JSON.stringify(products));
      setSuccessMsg('DROP LAUNCHED SUCCESSFULLY!');
    }

    reset();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const products = JSON.parse(localStorage.getItem('products')) || [];

  const handleEdit = (id) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setValue('name', product.name);
      setValue('price', product.price);
      setValue('image', product.image);
      setValue('tag', product.tag);
      setValue('category', product.category);
      setValue('description', product.description || '');
      setEditingId(id);
    }
  };

  const handleCancelEdit = () => {
    reset();
    setEditingId(null);
  };

  return (
    <div className="w-full min-h-screen bg-[#0f0f11] text-white p-6 md:p-12 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-red-500 selection:text-white">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xs z-10" />

      <div className="relative z-20 max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-neutral-950/80 p-8 md:p-10 rounded-2xl border border-white/5 shadow-2xl">
          <div className="mb-10 pb-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs tracking-[0.6em] text-red-500 font-black uppercase mb-1">HQ Operations</h4>
              <h1 className="text-3xl font-black tracking-widest uppercase">
                {editingId ? 'Edit Drop' : 'Launch New Drop'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="bg-neutral-700 hover:bg-neutral-600 text-white text-[10px] font-black tracking-widest px-3 py-1.5 rounded-sm uppercase h-fit transition-colors"
              >
                HOME
              </Link>
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black tracking-widest px-3 py-1.5 rounded-sm uppercase h-fit">
                Admin Mode Active
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest rounded-xl text-center uppercase">
              {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Product Name */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Product Name</label>
              <input
                type="text"
                placeholder="E.G., GOTHIC OVERSIZED HOODIE"
                className={`w-full bg-neutral-900/60 border ${errors.name ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 outline-hidden tracking-wider focus:border-red-500 transition-colors uppercase font-medium`}
                {...register('name', { required: 'Product name is required' })}
              />
              {errors.name && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.name.message}</span>}
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Price (e.g. ₹1,499)</label>
              <input
                type="text"
                placeholder="₹1,499"
                className={`w-full bg-neutral-900/60 border ${errors.price ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 outline-hidden tracking-wider focus:border-red-500 transition-colors font-medium`}
                {...register('price', { required: 'Price is required' })}
              />
              {errors.price && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.price.message}</span>}
            </div>

            {/* Tag */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Drop Status Tag</label>
              <select
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-hidden tracking-wider focus:border-red-500 transition-colors font-medium appearance-none cursor-pointer"
                {...register('tag')}
              >
                <option value="NEW DROP">NEW DROP</option>
                <option value="BEST SELLER">BEST SELLER</option>
                <option value="FEW LEFT">FEW LEFT</option>
                <option value="LIMITED ITEM">LIMITED ITEM</option>
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Category</label>
              <select
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-hidden tracking-wider focus:border-red-500 transition-colors font-medium appearance-none cursor-pointer"
                {...register('category')}
              >
                <option value="printed-tshirt">PRINTED T-SHIRT</option>
                <option value="oversized-tshirt">OVERSIZED T-SHIRT</option>
                <option value="shirts">SHIRT</option>
                <option value="hoodies">HOODIES & SWEATSHIRTS</option>
              </select>
            </div>

            {/* Image URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Product Image URL</label>
              <input
                type="text"
                placeholder="PASTE IMAGE LINK"
                className={`w-full bg-neutral-900/60 border ${errors.image ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 outline-hidden tracking-wider focus:border-red-500 transition-colors font-medium`}
                {...register('image', { required: 'Image URL is required' })}
              />
              {errors.image && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.image.message}</span>}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Description (Optional)</label>
              <textarea
                rows="3"
                placeholder="E.G., 280 GSM 100% FRENCH TERRY COTTON..."
                className="w-full bg-neutral-900/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 outline-hidden tracking-wider focus:border-red-500 transition-colors font-medium resize-none"
                {...register('description')}
              />
            </div>

            {/* Submit */}
            <div className="md:col-span-2 mt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-white hover:bg-neutral-200 text-black font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-lg transition-all active:scale-[0.99] cursor-pointer"
              >
                {editingId ? 'UPDATE DROP' : 'DEPLOY DROP TO PUBLIC'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 bg-neutral-700 hover:bg-neutral-600 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-lg transition-all active:scale-[0.99] cursor-pointer"
                >
                  CANCEL
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Products List */}
        {products.length > 0 && (
          <div className="bg-neutral-950/80 p-6 rounded-2xl border border-white/5 shadow-2xl">
            <h2 className="text-xs tracking-[0.4em] text-red-500 font-black uppercase mb-6">Live Drops ({products.length})</h2>
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/5">
                  <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-white/10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.price} · {p.tag}</p>
                  </div>
                  <button
                    onClick={() => handleEdit(p.id)}
                    className="text-[10px] bg-transparent border px-2 py-1 rounded-sm font-black text-white hover:text-red-500 uppercase tracking-widest cursor-pointer shrink-0 transition-colors ease-in-out duration-150"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      const updated = products.filter(item => item.id !== p.id);
                      localStorage.setItem('products', JSON.stringify(updated));
                      window.location.reload();
                    }}
                    className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminPanel;
