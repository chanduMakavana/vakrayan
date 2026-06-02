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
import Footer from '../pageComponets/Footer';
import { FaStar } from 'react-icons/fa';

function UserProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isAuthenticated } = useSelector(state => state.auth);
  const products = useSelector(state => state.products.items || []);

  const [orders, setOrders] = useState([]);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  // Review submission state for the direct profile modal
  const [reviewModalItem, setReviewModalItem] = useState(null); // stores { name: '...', productId: '...' }
  const [modalRating, setModalRating] = useState(5);
  const [modalComment, setModalComment] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState('');

  const handleModalReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      alert("Please login to secure a review placement.");
      return;
    }
    if (!reviewModalItem || !reviewModalItem.productId) {
      alert("Error resolving product mapping registry.");
      return;
    }
    if (!modalComment.trim()) {
      alert("Please enter a valid review comment specification.");
      return;
    }

    setModalSubmitting(true);
    try {
      const newDoc = await reviewsService.createReview({
        productId: reviewModalItem.productId,
        userId: user.$id,
        userName: user.name || 'Anonymous',
        rating: String(modalRating),
        comment: modalComment
      });

      if (newDoc) {
        setModalSuccessMsg('Review published successfully.');
        setModalComment('');
        setModalRating(5);
        setTimeout(() => {
          setReviewModalItem(null);
          setModalSuccessMsg('');
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to submit profile review:", err);
      alert("Failed to submit review. Connection timed out.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Address edit state
  const [editingAddress, setEditingAddress] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch products catalog on mount if empty in Redux cache
  useEffect(() => {
    if (isAuthenticated && products.length === 0) {
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
  }, [products.length, isAuthenticated, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    async function loadProfileData() {
      try {
        setLoading(true);
        // Load User Saved Address Profile
        const savedAddr = await addressService.getUserAddress(user.$id);
        if (savedAddr) {
          setAddress(savedAddr);
          setFormData({
            name: savedAddr.customerName || '',
            phone: savedAddr.phone || '',
            address: savedAddr.addressLine || '',
            city: savedAddr.city || '',
            pincode: savedAddr.pincode || ''
          });
        } else {
          setFormData({
            name: user.name || '',
            phone: '',
            address: '',
            city: '',
            pincode: ''
          });
        }

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

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to terminate session?")) {
      try {
        await authService.logout();
        dispatch(logoutAction());
        navigate('/');
      } catch (err) {
        console.error("Logout failed:", err);
      }
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg('');
    try {
      const response = await addressService.saveAddress(user.$id, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode
      });
      if (response) {
        setAddress(response);
        setEditingAddress(false);
        setSuccessMsg('Shipping address updated successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error("Failed to update shipping profile:", err);
      alert("Verification server timed out. Check data values.");
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

              {/* Shipping Address */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200/50 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-neutral-700 flex items-center gap-2">
                    <FiMapPin className="text-sm text-neutral-600" />
                    Default Shipping Address
                  </h3>
                  {!editingAddress && (
                    <button 
                      onClick={() => setEditingAddress(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      {address ? 'Edit' : 'Create'}
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
                    <div className="flex gap-2">
                      <button 
                        type="submit"
                        disabled={saveLoading}
                        className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer"
                      >
                        {saveLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingAddress(false)}
                        className="px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs py-2.5 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : address ? (
                  <div className="space-y-3.5 text-xs text-neutral-600">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-medium">Recipient</span>
                      <span className="text-neutral-900 font-semibold mt-0.5 block">{address.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-medium">Street Address</span>
                      <span className="text-neutral-900 font-semibold mt-0.5 block">{address.addressLine}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">City</span>
                        <span className="text-neutral-900 font-semibold mt-0.5 block">{address.city}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-medium">Pincode</span>
                        <span className="text-neutral-900 font-semibold mt-0.5 block">{address.pincode}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-medium">Phone Number</span>
                      <span className="text-neutral-900 font-semibold mt-0.5 block">{address.phone}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-neutral-200 bg-neutral-50/50 rounded-xl">
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

                    return (
                      <div 
                        key={uniqueId || idx}
                        onClick={() => navigate(`/order/${uniqueId}`)}
                        className="bg-white p-5 rounded-xl border border-neutral-200/50 shadow-xs hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 group relative"
                      >
                        <div className="space-y-2.5 flex-1">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-neutral-400 block font-medium">
                              Order Date: {orderDate} / ID: #{uniqueId?.substring(0, 12).toUpperCase()}
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
                                        } else {
                                          alert("Failed to locate product in current catalog.");
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
      </div>

      {/* Review Modal Overlay */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative space-y-6 animate-scale-up">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setReviewModalItem(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 font-bold text-sm p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div>
              <h2 className="text-lg font-bold tracking-tight text-neutral-900 pr-6 uppercase leading-tight">
                Review {reviewModalItem.name}
              </h2>
            </div>

            <hr className="border-neutral-100" />

            {modalSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto text-xl animate-bounce">
                  Done
                </div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  {modalSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleModalReviewSubmit} className="space-y-4">
                {/* Star Rating Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">Your Rating</span>
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

                {/* Review comment */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">Your Review</span>
                  <textarea
                    rows="3"
                    required
                    value={modalComment}
                    onChange={(e) => setModalComment(e.target.value)}
                    placeholder="Write your product experience here..."
                    className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-800 outline-hidden resize-none transition-colors"
                  />
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="flex-1 bg-neutral-950 hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    {modalSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewModalItem(null)}
                    className="px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs py-2.5 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <Footer />
    </>
  );
}

export default UserProfile;
