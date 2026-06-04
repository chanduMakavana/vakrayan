import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { FiMapPin, FiPackage, FiShoppingBag, FiArrowRight, FiShield, FiLogOut } from 'react-icons/fi';
import { logout as logoutAction } from '../../features/login';
import authService from '../../appwrite/auth';
import addressService from '../../appwrite/address';
import ordersService from '../../appwrite/orders';
import reviewsService from '../../appwrite/reviews';
import productsService from '../../appwrite/products';
import { setProducts } from '../../features/productsSlice';
import Navbar from '../pageComponets/Navbar';
import { useToast } from '../../context/ToastContext';
import Footer from '../pageComponets/Footer';
import { FaStar } from 'react-icons/fa';
import storageService, { compressImage } from '../../appwrite/storage';

function UserProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { items: products, fetched: productsFetched } = useSelector(state => state.products);

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review submission state for the direct profile modal
  const [reviewModalItem, setReviewModalItem] = useState(null); // stores { name: '...', productId: '...' }
  const [modalRating, setModalRating] = useState(5);
  const [modalComment, setModalComment] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState('');

  // Fit & characteristic rating modal states
  const [modalFit, setModalFit] = useState('true'); // 'tight', 'true', or 'loose'
  const [modalComfort, setModalComfort] = useState(5);
  const [modalQuality, setModalQuality] = useState(5);
  const [modalBreathable, setModalBreathable] = useState(5);

  const [modalImages, setModalImages] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e, setImagesValue, currentImages) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Compress reviews images to save storage and improve loading speed
      const compressedFile = await compressImage(file, 800, 800, 0.7);

      const response = await storageService.uploadFile(compressedFile);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        const newUrlList = currentImages.trim() 
          ? `${currentImages.trim()}, ${fileUrl}` 
          : fileUrl;
        setImagesValue(newUrlList);
        showToast("✓ Image uploaded successfully to Appwrite Storage!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      showToast("Appwrite Storage upload failed. Ensure bucket ID 'images' exists, or paste a URL.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleModalReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      showToast("Please login to secure a review placement.", "error");
      return;
    }
    if (!reviewModalItem || !reviewModalItem.productId) {
      showToast("Error resolving product mapping registry.", "error");
      return;
    }
    if (!modalComment.trim()) {
      showToast("Please write a review comment.", "error");
      return;
    }

    const imageLinks = modalImages.split(',')
      .map(url => url.trim())
      .filter(url => url.startsWith('http://') || url.startsWith('https://'));

    setModalSubmitting(true);
    try {
      await reviewsService.createReview({
        productId: reviewModalItem.productId,
        userId: user.$id,
        userName: user.name || 'Anonymous',
        rating: String(modalRating),
        comment: modalComment,
        images: imageLinks,
        fit: modalFit,
        comfort: modalComfort,
        quality: modalQuality,
        breathable: modalBreathable
      });

      setModalSuccessMsg("Review posted successfully! Thank you for the fit feedback.");
      showToast("Review submitted successfully!", "success");
      setModalComment('');
      setModalImages('');
      setModalRating(5);
      setModalFit('true');
      setModalComfort(5);
      setModalQuality(5);
      setModalBreathable(5);
      setTimeout(() => {
        setReviewModalItem(null);
        setModalSuccessMsg('');
      }, 2000);
    } catch (err) {
      console.error("Review submission error:", err.message);
      showToast("Failed to submit review. Try again.", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Address edit state
  const [editingAddress, setEditingAddress] = useState(null); // null | 'new' | addressDoc
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    is_default: false
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Custom dialog/confirmation states
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAddressDeleteModalOpen, setIsAddressDeleteModalOpen] = useState(false);
  const [deleteTargetAddressId, setDeleteTargetAddressId] = useState(null);

  // Fetch products catalog on mount if empty in Redux cache
  useEffect(() => {
    if (isAuthenticated && !productsFetched) {
      const getLocalStorageFallbackData = () => {
        return JSON.parse(localStorage.getItem('products')) || [];
      };

      const loadProducts = async () => {
        try {
          const response = await productsService.getProducts();
          const structuredData = response?.documents || response || [];
          if (structuredData && structuredData.length > 0) {
            dispatch(setProducts(structuredData));
          } else {
            dispatch(setProducts(getLocalStorageFallbackData()));
          }
        } catch {
          dispatch(setProducts(getLocalStorageFallbackData()));
        }
      };
      loadProducts();
    }
  }, [productsFetched, isAuthenticated, dispatch]);

  async function reloadAddresses() {
    if (user && user.$id) {
      try {
        const list = await addressService.getUserAddresses(user.$id);
        setAddresses(list || []);
      } catch (err) {
        console.error("Failed to reload addresses:", err);
      }
    }
  }

  const confirmDeleteAddress = async () => {
    if (!deleteTargetAddressId) return;
    const addrId = deleteTargetAddressId;
    setDeleteTargetAddressId(null);
    setIsAddressDeleteModalOpen(false);
    try {
      await addressService.deleteAddress(user.$id, addrId);
      await reloadAddresses();
      showToast("Address deleted successfully.", "success");
    } catch (err) {
      console.error("Address sweep failed:", err);
      showToast("Failed to delete address.", "error");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    async function loadProfileData() {
      try {
        setLoading(true);
        // Load User Saved Address Profiles
        const list = await addressService.getUserAddresses(user.$id);
        setAddresses(list || []);

        // Load User Orders
        const userOrdersList = await ordersService.getUserOrders(user.$id);
        setOrders(userOrdersList || []);
      } catch (err) {
        console.error("Failed to load user profile dataset:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user && user.$id) {
      loadProfileData();
    }
  }, [user, isAuthenticated, navigate]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false);
    try {
      await authService.logout();
      dispatch(logoutAction());
      navigate('/');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg('');
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pincode: formData.pincode,
        is_default: formData.is_default
      };
      
      // If we are editing, carry over the document ID
      if (editingAddress && editingAddress !== 'new') {
        payload.$id = editingAddress.$id || editingAddress.id;
        payload.id = editingAddress.$id || editingAddress.id;
      }

      const response = await addressService.saveAddress(user.$id, payload);
      if (response) {
        await reloadAddresses();
        setEditingAddress(null);
        setSuccessMsg(editingAddress === 'new' ? 'Shipping address added successfully.' : 'Shipping address updated successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error("Failed to update shipping profile:", err);
      showToast("Verification server timed out. Check data values.", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-neutral-900 font-black uppercase">
          Loading your account...
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />

      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans pb-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-10">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200/60">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                My Account
              </h1>
            </div>
            <button 
              onClick={handleLogout}
              className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg h-fit transition-colors cursor-pointer"
            >
              <FiLogOut className="text-sm" />
              Sign Out
            </button>
          </div>

          {/* Feedback Msg */}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg text-center">
              {successMsg}
            </div>
          )}

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMN 1: Shipping Info & Settings */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Account Info Card */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200/50 shadow-xs space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800 text-base font-bold">
                    {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                  </div>
                  <div>
                    <h4 className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Account Info</h4>
                    <h2 className="text-base font-bold text-neutral-800">{user?.name}</h2>
                  </div>
                </div>
                <hr className="border-neutral-100" />
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-neutral-500 font-medium">
                    <span>Email Address</span>
                    <span className="text-neutral-900 font-semibold">{user?.email}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500 font-medium">
                    <span>Account Status</span>
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Active</span>
                  </div>
                </div>
              </div>

              {/* Shipping Addresses List */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200/50 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-neutral-700 flex items-center gap-2">
                    <FiMapPin className="text-sm text-neutral-600" />
                    Saved Shipping Addresses ({addresses.length})
                  </h3>
                  {!editingAddress && (
                    <button 
                      onClick={() => {
                        setEditingAddress('new');
                        setFormData({
                          name: user.name || '',
                          phone: '',
                          address: '',
                          city: '',
                          state: '',
                          country: 'India',
                          pincode: '',
                          is_default: addresses.length === 0
                        });
                      }}
                      className="text-xs font-black text-indigo-600 hover:text-indigo-855 transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      + Add New
                    </button>
                  )}
                </div>

                <hr className="border-neutral-100" />

                {editingAddress ? (
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Full Name</label>
                      <input 
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-800 outline-hidden font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Phone Number</label>
                      <input 
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-800 outline-hidden font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Street Address</label>
                      <input 
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-800 outline-hidden font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">City</label>
                        <input 
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-800 outline-hidden font-medium"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">PIN Code</label>
                        <input 
                          type="text"
                          required
                          value={formData.pincode}
                          onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                          className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-800 outline-hidden font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">State</label>
                        <input 
                          type="text"
                          required
                          value={formData.state}
                          onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-800 outline-hidden font-medium"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Country</label>
                        <input 
                          type="text"
                          required
                          value={formData.country}
                          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                          className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-800 outline-hidden font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="is_default"
                        checked={formData.is_default}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                        className="rounded accent-neutral-900"
                      />
                      <label htmlFor="is_default" className="text-[10px] font-mono font-bold text-neutral-500 uppercase cursor-pointer">Set as default shipping address</label>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="submit"
                        disabled={saveLoading}
                        className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer"
                      >
                        {saveLoading ? 'Saving...' : 'Save Address'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingAddress(null)}
                        className="px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs py-2.5 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : addresses.length > 0 ? (
                  <div className="space-y-4">
                    {addresses.map((addr) => {
                      const id = addr.$id || addr.id;
                      const line = addr.addressLine || '';
                      const stateStr = addr.state || '';
                      const countryStr = addr.country || 'India';

                      return (
                        <div key={id} className="p-4 border border-neutral-100 rounded-xl space-y-3 bg-neutral-50/20 hover:bg-neutral-50/50 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-neutral-900">{addr.customerName}</span>
                            {(addr.is_default || addr.isDefault) && (
                              <span className="text-[8px] bg-neutral-950 text-white font-mono uppercase px-1.5 py-0.5 font-bold">DEFAULT</span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-600 space-y-0.5">
                            <p>{line}</p>
                            <p className="font-semibold">{addr.city}, {stateStr} {addr.pincode}, {countryStr}</p>
                            <p className="font-mono text-neutral-450 mt-1 text-[10px]">Phone: {addr.phone}</p>
                          </div>
                          <div className="flex gap-3 pt-2 border-t border-neutral-100 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            <button 
                              onClick={() => {
                                setEditingAddress(addr);
                                setFormData({
                                  name: addr.customerName || '',
                                  phone: addr.phone || '',
                                  address: addr.addressLine || '',
                                  city: addr.city || '',
                                  state: addr.state || '',
                                  country: addr.country || 'India',
                                  pincode: addr.pincode || '',
                                  is_default: !!(addr.is_default || addr.isDefault)
                                });
                              }}
                              className="hover:text-neutral-950 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button 
                               onClick={() => {
                                 setDeleteTargetAddressId(id);
                                 setIsAddressDeleteModalOpen(true);
                               }}
                               className="hover:text-rose-600 text-rose-500/80 cursor-pointer"
                             >
                               Delete
                             </button>
                            {!(addr.is_default || addr.isDefault) && (
                              <button 
                                onClick={async () => {
                                  await addressService.saveAddress(user.$id, {
                                    ...addr,
                                    is_default: true
                                  });
                                  await reloadAddresses();
                                  showToast("Default address updated.", "success");
                                }}
                                className="text-indigo-600 hover:text-indigo-850 cursor-pointer ml-auto"
                              >
                                Set As Default
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-neutral-200 bg-neutral-50/50 rounded-xl">
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      No shipping address saved yet.<br />
                      Create one to enable fast one-click checkout.
                    </p>
                  </div>
                )}
              </div>

              {/* Security Shield */}
              <div className="flex items-start gap-3 text-xs text-neutral-500 border border-neutral-200 bg-white p-4 rounded-xl leading-relaxed">
                <FiShield className="text-lg text-neutral-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-800 block mb-0.5">Secure Account</span>
                  Your personal shipping details and transaction histories are secured and encrypted.
                </div>
              </div>

            </div>

            {/* COLUMN 2: Order History */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="pb-3 border-b border-neutral-200/50 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase text-neutral-400 tracking-wider flex items-center gap-2">
                  <FiPackage className="text-sm text-neutral-500" />
                  Order History ({orders.length})
                </h3>
              </div>

              {orders.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-neutral-200 rounded-xl bg-white/50 space-y-4">
                  <div className="flex justify-center">
                    <FiShoppingBag className="text-4xl text-neutral-300" />
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                    You haven't placed any orders yet. Discover our collection to secure your items.
                  </p>
                  <Link 
                    to="/" 
                    className="inline-block bg-neutral-900 text-white font-bold text-xs tracking-wider uppercase px-5 py-3 rounded-lg shadow-sm hover:bg-neutral-800"
                  >
                    Explore Shop
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order, idx) => {
                    const uniqueId = order.$id || order.id;
                    const orderDate = new Date(order.$createdAt || order.createdAt || '1970-01-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    let parsedItems;
                    try {
                      parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
                    } catch {
                      parsedItems = [];
                    }

                    // Parse metadata/order number
                    let orderNum = order.order_number || `ORD-${new Date(order.$createdAt || '2026-01-01').getFullYear()}-${uniqueId?.substring(0, 6).toUpperCase()}`;
                    try {
                      const parsed = JSON.parse(order.address);
                      if (parsed && typeof parsed === 'object' && parsed.metadata && parsed.metadata.order_number) {
                        orderNum = parsed.metadata.order_number;
                      }
                    } catch (err) {
                      console.warn("Could not parse address metadata for orderNumber:", err.message);
                    }

                    return (
                      <div 
                        key={uniqueId || idx}
                        onClick={() => navigate(`/order/${uniqueId}`)}
                        className="bg-white p-5 rounded-xl border border-neutral-200/50 shadow-xs hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 group relative"
                      >
                        <div className="space-y-2.5 flex-1">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-neutral-400 block font-medium">
                              Order Date: {orderDate} / ID: {orderNum}
                            </span>
                            <h4 className="text-xs font-semibold text-neutral-800 leading-relaxed">
                              {parsedItems.map(i => `${i.name} (${i.size || 'M'})`).join(' , ')}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              order.status === 'DELIVERED' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : order.status === 'SHIPPED' 
                              ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                              : order.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse'
                            }`}>
                              {order.status || 'PENDING'}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-semibold">
                              {parsedItems.reduce((acc, i) => acc + Number(i.quantity || 1), 0)} Items
                            </span>
                          </div>

                          {/* Write Review Direct Action */}
                          {order.status === 'DELIVERED' && (
                            <div className="mt-3.5 pt-2.5 border-t border-neutral-100">
                              <div className="flex flex-wrap gap-2">
                                {parsedItems.map((item, itemIdx) => {
                                  let productId = item.product_id;
                                  if (!productId) {
                                    const matchingProd = products.find(p => p.name.trim().toUpperCase() === item.name.trim().toUpperCase());
                                    productId = matchingProd ? (matchingProd.$id || matchingProd.id) : null;
                                  }
                                  
                                  return (
                                    <button
                                      key={itemIdx}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (productId) {
                                          setReviewModalItem({ name: item.name, productId });
                                          setModalRating(5);
                                          setModalComment('');
                                          setModalFit('true');
                                          setModalComfort(5);
                                          setModalQuality(5);
                                          setModalBreathable(5);
                                        } else {
                                          showToast("Failed to locate product in current catalog.", "error");
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] tracking-wider px-2.5 py-1.5 rounded-md uppercase transition-all shadow-xs"
                                    >
                                      Write Review
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-neutral-400 block font-medium">Total Paid</span>
                            <span className="text-sm font-semibold text-neutral-900">
                              ₹{Number(order.total || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <FiArrowRight className="text-base text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>      {/* Review Modal Overlay */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-none border border-neutral-950 shadow-2xl p-6 relative space-y-6 animate-scale-up text-neutral-900">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setReviewModalItem(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-950 font-bold text-sm p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div>
              <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">PRODUCT FIT FEEDBACK</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Review {reviewModalItem.name}
              </h2>
            </div>

            <hr className="border-neutral-100" />

            {modalSuccessMsg ? (
              <div className="py-8 text-center space-y-3 font-mono">
                <div className="w-12 h-12 rounded-none border border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xs font-bold uppercase tracking-wider animate-bounce">
                  Done
                </div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-relaxed px-4">
                  {modalSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleModalReviewSubmit} className="space-y-4 font-sans text-neutral-900">
                {/* Star Rating Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Your Rating</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setModalRating(star)}
                        className="text-2xl cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                      >
                        <FaStar className={star <= modalRating ? 'text-amber-400' : 'text-neutral-200'} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Fit Preference Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Size Fit Preference</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'tight', label: 'TIGHT' },
                      { key: 'true', label: 'TRUE TO SIZE' },
                      { key: 'loose', label: 'LOOSE' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setModalFit(item.key)}
                        className={`py-2 rounded-none font-bold text-[10px] tracking-wider transition-all cursor-pointer border uppercase font-mono ${
                          modalFit === item.key
                            ? 'bg-neutral-950 text-white border-neutral-950'
                            : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Characteristics Rating Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Comfort */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Comfort</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalComfort(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalComfort === val
                              ? 'bg-neutral-950 text-white border-neutral-950'
                              : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Quality</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalQuality(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalQuality === val
                              ? 'bg-neutral-950 text-white border-neutral-950'
                              : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Breathable */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Breathable</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalBreathable(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalBreathable === val
                              ? 'bg-neutral-950 text-white border-neutral-950'
                              : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review comment */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Your Review</span>
                  <textarea
                    rows="3"
                    required
                    value={modalComment}
                    onChange={(e) => setModalComment(e.target.value)}
                    placeholder="Write your product experience here..."
                    className="w-full bg-[#fbfbfb] border border-neutral-950/20 focus:border-neutral-950 rounded-none px-3 py-2 text-xs text-neutral-850 outline-hidden resize-none transition-colors"
                  />
                </div>

                {/* Review Image URLs */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Customer Image URLs (comma-separated, optional)</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={modalImages}
                      onChange={(e) => setModalImages(e.target.value)}
                      placeholder="https://example.com/pic1.jpg, https://example.com/pic2.jpg"
                      className="flex-1 bg-[#fbfbfb] border border-neutral-950/20 focus:border-neutral-950 rounded-none px-3 py-2 text-xs text-neutral-850 outline-hidden transition-colors"
                    />
                    <label className="shrink-0 bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-[10px] tracking-wider px-3 py-2 rounded-none uppercase transition-all cursor-pointer border border-neutral-950 text-center select-none">
                      {uploadingImage ? 'Uploading...' : 'Upload File'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setModalImages, modalImages)}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <span className="text-[8px] font-mono text-neutral-450 uppercase tracking-wide">
                    TIP: PASTE DIRECT HTTPS LINKS OR CHOOSE A LOCAL IMAGE TO UPLOAD TEMPORARILY.
                  </span>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="flex-1 bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer text-center py-2.5 shadow-md"
                  >
                    {modalSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewModalItem(null)}
                    className="px-4 border border-neutral-250 hover:bg-neutral-50 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-none cursor-pointer py-2.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs" 
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <div className="relative z-50 w-full max-w-sm bg-white p-8 border border-neutral-950 shadow-2xl space-y-6 text-neutral-900 animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">LOGOUT CONFIRMATION</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Confirm Log Out
              </h2>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5 leading-relaxed">
                Are you sure you want to log out? You will need to sign in again to place orders or view your profile.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-full py-3 border border-neutral-250 hover:bg-neutral-50 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="w-full py-3 bg-neutral-950 hover:bg-neutral-850 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer shadow-md"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Deletion Confirmation Modal */}
      {isAddressDeleteModalOpen && deleteTargetAddressId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs" 
            onClick={() => setIsAddressDeleteModalOpen(false)}
          />
          <div className="relative z-50 w-full max-w-sm bg-white p-8 border border-neutral-950 shadow-2xl space-y-6 text-neutral-900 animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">DELETE SAVED ADDRESS</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Delete Shipping Address?
              </h2>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5 leading-relaxed">
                Are you sure you want to delete this shipping address? It will be permanently removed from your saved address list.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAddressDeleteModalOpen(false)}
                className="w-full py-3 border border-neutral-250 hover:bg-neutral-50 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAddress}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default UserProfile;
