import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { FiMapPin, FiShoppingBag, FiArrowRight, FiLogOut, FiUser, FiCreditCard, FiCompass, FiHelpCircle } from 'react-icons/fi';
import { login as loginAction, logout as logoutAction } from '../../features/login';
import authService from '../../appwrite/auth';
import addressService from '../../appwrite/address';
import ordersService from '../../appwrite/orders';
import reviewsService from '../../appwrite/reviews';
import productsService from '../../appwrite/products';
import { setProducts } from '../../features/productsSlice';
import { useToast } from '../../context/ToastContext';
import Footer from '../pageComponets/Footer';
import { FaStar, FaWallet } from 'react-icons/fa';
import storageService, { compressImage } from '../../appwrite/storage';
import RazorpaySandboxModal from '../pageComponets/RazorpaySandboxModal';

function UserProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { items: products, fetched: productsFetched } = useSelector(state => state.products);

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeProfileTab, setActiveProfileTab] = useState('overview');
  
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.prefs?.phone || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);

  const walletTransactions = useMemo(() => {
    const credits = orders
      .filter(o => o.status === 'CANCELLED' && o.paymentMethod === 'ONLINE')
      .map(o => {
        let orderNumber = o.order_number || o.$id?.substring(0, 8).toUpperCase();
        let isTopUp = false;
        try {
          const parsedAddress = JSON.parse(o.address);
          if (parsedAddress?.metadata?.order_number) {
            orderNumber = parsedAddress.metadata.order_number;
          }
          const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
          if (items.some(i => i.product_id === 'topup')) {
            isTopUp = true;
          }
        } catch {
          // Fallback if parsing fails
        }

        return {
          id: o.$id,
          title: isTopUp ? "Wallet Top-Up" : `Refund for Order ${orderNumber}`,
          date: new Date(o.$updatedAt || o.$createdAt || '2026-06-10'),
          amount: `+₹${Number(o.total || 0).toFixed(2)}`,
          isCredit: true
        };
      });

    const debits = orders
      .filter(o => o.paymentMethod === 'WALLET' && o.status !== 'CANCELLED')
      .map(o => {
        let orderNumber = o.order_number || o.$id?.substring(0, 8).toUpperCase();
        try {
          const parsedAddress = JSON.parse(o.address);
          if (parsedAddress?.metadata?.order_number) {
            orderNumber = parsedAddress.metadata.order_number;
          }
        } catch {
          // Fallback if parsing fails
        }

        return {
          id: o.$id,
          title: `Payment for Order ${orderNumber}`,
          date: new Date(o.$updatedAt || o.$createdAt || '2026-06-10'),
          amount: `-₹${Number(o.total || 0).toFixed(2)}`,
          isCredit: false
        };
      });

    return [...credits, ...debits].sort((a, b) => b.date - a.date);
  }, [orders]);

  const walletBalance = useMemo(() => {
    const creditVal = orders
      .filter(o => o.status === 'CANCELLED' && o.paymentMethod === 'ONLINE')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const debitVal = orders
      .filter(o => o.paymentMethod === 'WALLET' && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    return Math.max(0, creditVal - debitVal);
  }, [orders]);

  const physicalOrders = useMemo(() => {
    return orders.filter(order => {
      try {
        const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
        return !parsedItems.some(i => i.product_id === 'topup');
      } catch {
        return true;
      }
    });
  }, [orders]);

  useEffect(() => {
    if (user) {
      const t = setTimeout(() => {
        setProfileName(user.name || '');
        setProfilePhone(user.prefs?.phone || '');
      }, 0);
      return () => clearTimeout(t);
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeProfileTab]);

  const handleUpdateProfileInfo = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast("Name cannot be empty.", "error");
      return;
    }
    setProfileUpdating(true);
    try {
      await authService.updateName(profileName.trim());
      const currentPrefs = user.prefs || {};
      await authService.updatePreferences({
        ...currentPrefs,
        phone: profilePhone.trim()
      });

      const updatedUser = await authService.getCurrentUser();
      dispatch(loginAction({ user: updatedUser }));
      showToast("Profile details updated successfully!", "success");
    } catch (err) {
      console.error("Failed to update profile info:", err);
      showToast("Failed to update profile info: " + err.message, "error");
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleTopUpSuccess = async (paymentId) => {
    setIsRazorpayOpen(false);
    setLoading(true);
    try {
      const topUpPayload = {
        userId: user.$id,
        customerName: user.name || 'Store Customer',
        email: user.email || '',
        phone: profilePhone || user.prefs?.phone || '0000000000',
        address: JSON.stringify({
          customerAddress: "Wallet Top-up Channel",
          metadata: {
            order_number: `TOPUP-${Date.now()}`,
            subtotal: Number(topUpAmount),
            tax_amount: 0,
            shipping_charge: 0,
            coupon_code: 'NONE'
          }
        }),
        items: JSON.stringify([{
          name: "Wallet Top-Up",
          price: Number(topUpAmount),
          quantity: 1,
          product_id: "topup"
        }]),
        total: Number(topUpAmount),
        status: 'CANCELLED', // CANCELLED status behaves as a wallet credit!
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
        paymentProvider: 'RAZORPAY',
        razorpayPaymentId: paymentId
      };

      const response = await ordersService.createOrder(topUpPayload);
      if (response) {
        showToast(`₹${Number(topUpAmount).toFixed(2)} credited to your Store Wallet successfully!`, "success");
        // Reload user orders to refresh the balance and transactions
        const userOrdersList = await ordersService.getUserOrders(user.$id);
        setOrders(userOrdersList || []);
      } else {
        throw new Error("Failed to create top-up order record");
      }
    } catch (err) {
      console.error("Top-up order creation failed:", err);
      showToast("Top-up failed to process. Please contact support.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpProceed = (e) => {
    e.preventDefault();
    const amount = Number(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid amount greater than 0.", "error");
      return;
    }
    setIsTopUpModalOpen(false);
    setIsRazorpayOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showToast("All password fields are required.", "error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setProfileUpdating(true);
    try {
      await authService.updatePassword(newPassword, currentPassword);
      showToast("Password changed successfully!", "success");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      console.error("Failed to change password:", err);
      showToast("Failed to change password: " + err.message, "error");
    } finally {
      setProfileUpdating(false);
    }
  };

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

  // handleVipSuccess has been moved above to resolve hoisting issues

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
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
        showToast(editingAddress === 'new' ? 'Shipping address added successfully.' : 'Shipping address updated successfully.', 'success');
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
      <div className="w-full min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-[var(--color-text)] font-black uppercase">
          Loading your account...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans pb-20 pt-6">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
          
          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDEBAR: Navigation Menu */}
            <div className={`lg:col-span-3 bg-[var(--color-surface)] lg:border border-[var(--color-border)] lg:rounded-xl p-2 lg:p-4 shadow-sm ${activeProfileTab === 'overview' ? 'hidden lg:block' : 'flex'} flex-row lg:flex-col overflow-x-auto scrollbar-none gap-2 pb-2 mb-4 lg:mb-0 lg:pb-0 lg:space-y-1`}>
              <span className="hidden lg:block text-[9px] font-bold text-[var(--color-muted)] tracking-widest uppercase px-3 pb-2 border-b border-[var(--color-border)] mb-2">
                ACCOUNT DASHBOARD
              </span>
              
              <button
                type="button"
                onClick={() => { setActiveProfileTab('overview'); setEditingAddress(null); }}
                className={`shrink-0 w-auto lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'overview'
                    ? 'bg-amber-500/10 text-amber-600 lg:border-l-4 lg:border-amber-500 font-black'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] bg-[var(--color-bg)] lg:bg-transparent'
                }`}
              >
                <FiCompass className="text-sm shrink-0" />
                Overview
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveProfileTab('orders'); setEditingAddress(null); }}
                className={`shrink-0 w-auto lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'orders'
                    ? 'bg-amber-500/10 text-amber-600 lg:border-l-4 lg:border-amber-500 font-black border border-amber-200 lg:border-0'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] bg-[var(--color-bg)] lg:bg-transparent'
                }`}
              >
                <FiShoppingBag className="text-sm shrink-0" />
                My Orders
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveProfileTab('payments'); setEditingAddress(null); }}
                className={`shrink-0 w-auto lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'payments'
                    ? 'bg-amber-500/10 text-amber-600 lg:border-l-4 lg:border-amber-500 font-black border border-amber-200 lg:border-0'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] bg-[var(--color-bg)] lg:bg-transparent'
                }`}
              >
                <FiCreditCard className="text-sm shrink-0" />
                My Payments
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveProfileTab('wallet'); setEditingAddress(null); }}
                className={`shrink-0 w-auto lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'wallet'
                    ? 'bg-amber-500/10 text-amber-600 lg:border-l-4 lg:border-amber-500 font-black border border-amber-200 lg:border-0'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] bg-[var(--color-bg)] lg:bg-transparent'
                }`}
              >
                <FaWallet className="text-sm shrink-0" />
                My Wallet
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveProfileTab('addresses'); setEditingAddress(null); }}
                className={`shrink-0 w-auto lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'addresses'
                    ? 'bg-amber-500/10 text-amber-600 lg:border-l-4 lg:border-amber-500 font-black border border-amber-200 lg:border-0'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] bg-[var(--color-bg)] lg:bg-transparent'
                }`}
              >
                <FiMapPin className="text-sm shrink-0" />
                My Addresses
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveProfileTab('profile'); setEditingAddress(null); }}
                className={`shrink-0 w-auto lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'profile'
                    ? 'bg-amber-500/10 text-amber-600 lg:border-l-4 lg:border-amber-500 font-black border border-amber-200 lg:border-0'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] bg-[var(--color-bg)] lg:bg-transparent'
                }`}
              >
                <FiUser className="text-sm shrink-0" />
                My Profile
              </button>
              
              <div className="hidden lg:block pt-2 mt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                >
                  <FiLogOut className="text-sm shrink-0" />
                  Logout
                </button>
              </div>
            </div>

            {/* RIGHT CONTENT WORKSPACE */}
            <div className="lg:col-span-9 space-y-6">
              
              {/* TAB 1: OVERVIEW */}
              {activeProfileTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Yellow Cream Header Card */}
                  <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-center gap-6 justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-250/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      {/* Avatar initial circle */}
                      <div className="w-16 h-16 rounded-full bg-amber-400 text-black flex items-center justify-center text-2xl font-black font-mono shadow-xs shrink-0 select-none">
                        {user?.name ? user.name[0].toUpperCase() : 'C'}
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-lg font-black text-neutral-900 uppercase tracking-wider">
                          {user?.name || 'User Profile'}
                        </h2>
                        <p className="text-[11px] font-medium text-neutral-600 font-mono">
                          {user?.email}
                        </p>
                        <p className="text-[11px] font-bold text-neutral-700">
                          {user?.prefs?.phone || 'No phone linked'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setActiveProfileTab('profile')}
                      className="w-full md:w-auto bg-amber-400 hover:bg-amber-500 text-black font-mono font-black text-[10px] tracking-widest uppercase py-3 px-8 rounded-lg transition-all duration-200 cursor-pointer shadow-xs border border-amber-350 shrink-0"
                    >
                      EDIT PROFILE
                    </button>
                  </div>

                  {/* Grid of Dashboard Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* My Orders Card */}
                    <div 
                      onClick={() => setActiveProfileTab('orders')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-amber-400 transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiShoppingBag className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Orders</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">View, Modify And Track Orders</p>
                    </div>

                    {/* My Payments Card */}
                    <div 
                      onClick={() => setActiveProfileTab('payments')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-amber-400 transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiCreditCard className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Payments</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">View And Modify Payment Methods</p>
                    </div>

                    {/* My Wallet Card */}
                    <div 
                      onClick={() => setActiveProfileTab('wallet')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-amber-400 transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FaWallet className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Wallet</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">Wallet Balance, Credit & Gift Cards</p>
                    </div>

                    {/* My Addresses Card */}
                    <div 
                      onClick={() => setActiveProfileTab('addresses')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-amber-400 transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiMapPin className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Addresses</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">Edit, Add Or Remove Addresses</p>
                    </div>

                    {/* My Profile Card */}
                    <div 
                      onClick={() => setActiveProfileTab('profile')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-amber-400 transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiUser className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Profile</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">Edit Personal Info And Change Password</p>
                    </div>

                    {/* Help & Support Card */}
                    <div 
                      onClick={() => showToast("📞 Reach out to us at support@streetwear.in for any order assistance.", "info")}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-amber-400 transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiHelpCircle className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">Help & Support</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">Reach Out To Us</p>
                    </div>


                  </div>
                </div>
              )}

              {/* TAB 2: MY ORDERS */}
              {activeProfileTab === 'orders' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="pb-4 border-b border-[var(--color-border)] flex items-center justify-between">
                    <h2 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase flex items-center gap-2">
                      <FiShoppingBag /> Order History ({physicalOrders.length})
                    </h2>
                  </div>
                  
                  {physicalOrders.length === 0 ? (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-10 text-center space-y-4">
                      <p className="text-xs text-[var(--color-muted)] uppercase tracking-widest font-mono">You haven't placed any orders yet.</p>
                      <Link 
                        to="/shop" 
                        className="inline-block bg-neutral-950 hover:bg-neutral-800 text-white font-mono font-black text-[10px] tracking-widest uppercase py-3 px-8 rounded-none transition-colors"
                      >
                        Start Shopping &rarr;
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {physicalOrders.map((order, idx) => {
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
                            className="bg-[var(--color-surface)]/30 backdrop-blur-sm border border-white/20 rounded-xl p-5 shadow-2xs hover:shadow-md cursor-pointer flex flex-row items-center gap-4 transition-all duration-300 group relative"
                          >
                            <div className="flex -space-x-3 overflow-hidden shrink-0 border border-[var(--color-border)] p-1 bg-[var(--color-subtle)] rounded-lg">
                              {parsedItems.slice(0, 3).map((item, itemIdx) => {
                                const matchingProd = products.find(p => (p.$id || p.id) === item.product_id || p.name.trim().toUpperCase() === item.name.trim().toUpperCase());
                                const imgUrl = matchingProd?.front_image_link || matchingProd?.image_url || matchingProd?.image || item.product_Image || item.product_image || 'https://placehold.co/100x120?text=HQ';
                                return (
                                  <img 
                                    key={itemIdx}
                                    src={imgUrl}
                                    alt={item.name}
                                    className="w-10 h-14 object-cover rounded-md border border-[var(--color-surface)] shadow-xs"
                                  />
                                );
                              })}
                              {parsedItems.length > 3 && (
                                <div className="w-10 h-14 bg-[var(--color-accent)] text-white rounded-md border border-[var(--color-surface)] flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                                  +{parsedItems.length - 3}
                                </div>
                              )}
                            </div>

                            <div className="space-y-2.5 flex-1 min-w-0">
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-[var(--color-muted)] block font-medium">
                                  Order Date: {orderDate} / ID: {orderNum}
                                </span>
                                <h4 className="text-xs font-semibold text-[var(--color-text)] leading-relaxed truncate">
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
                                  : 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-border)] animate-pulse'
                                }`}>
                                  {order.status || 'PENDING'}
                                </span>
                                <span className="text-[10px] text-[var(--color-muted)] font-semibold whitespace-nowrap">
                                  {parsedItems.reduce((acc, i) => acc + Number(i.quantity || 1), 0)} Items
                                </span>
                              </div>

                              {order.status === 'DELIVERED' && (
                                <div className="mt-3.5 pt-2.5 border-t border-[var(--color-border)]">
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
                                          className="inline-flex items-center gap-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold text-[9px] tracking-wider px-2.5 py-1.5 rounded-md uppercase transition-all shadow-xs"
                                        >
                                          Write Review
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4 justify-end shrink-0">
                              <div className="text-right">
                                <span className="text-[10px] text-[var(--color-muted)] block font-medium">Total Paid</span>
                                <span className="text-sm font-semibold text-[var(--color-text)]">
                                  ₹{Number(order.total || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <FiArrowRight className="text-base text-[var(--color-muted)] group-hover:text-[var(--color-text)] group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MY PAYMENTS */}
              {activeProfileTab === 'payments' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="pb-4 border-b border-[var(--color-border)]">
                    <h2 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase flex items-center gap-2">
                      <FiCreditCard /> Saved Payment Options
                    </h2>
                  </div>

                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
                    <h3 className="text-[10px] font-black text-[var(--color-text)] tracking-wider uppercase border-b border-[var(--color-border)] pb-2">LINKED CREDIT / DEBIT CARDS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Card 1 */}
                      <div className="p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-xl border border-neutral-800 space-y-4 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-mono font-bold text-neutral-400 block tracking-widest">HDFC BANK PREMIUM</span>
                            <span className="text-[10px] font-mono text-neutral-300">•••• •••• •••• 4890</span>
                          </div>
                          <span className="text-xs font-black font-sans tracking-widest italic">VISA</span>
                        </div>
                        <div className="flex justify-between items-end text-[9px] font-mono">
                          <div>
                            <span className="text-neutral-500 block uppercase text-[7px]">Card Holder</span>
                            <span className="text-neutral-200 uppercase font-bold">{user?.name}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block uppercase text-[7px]">Expiry</span>
                            <span className="text-neutral-200 font-bold">09/29</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="p-4 bg-neutral-900/10 border border-[var(--color-border)] text-[var(--color-text)] rounded-xl space-y-4 relative overflow-hidden shadow-2xs hover:border-amber-400 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-mono font-bold text-[var(--color-muted)] block tracking-widest">ICICI BANK CORAL</span>
                            <span className="text-[10px] font-mono text-[var(--color-text)]">•••• •••• •••• 1294</span>
                          </div>
                          <span className="text-xs font-black font-sans tracking-widest italic text-[var(--color-muted)]">MASTERCARD</span>
                        </div>
                        <div className="flex justify-between items-end text-[9px] font-mono">
                          <div>
                            <span className="text-[var(--color-muted)] block uppercase text-[7px]">Card Holder</span>
                            <span className="text-[var(--color-text)] uppercase font-bold">{user?.name}</span>
                          </div>
                          <div>
                            <span className="text-[var(--color-muted)] block uppercase text-[7px]">Expiry</span>
                            <span className="text-[var(--color-text)] font-bold">11/30</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-4 border-t border-[var(--color-border)]">
                      <h3 className="text-[10px] font-black text-[var(--color-text)] tracking-wider uppercase border-b border-[var(--color-border)] pb-2">LINKED UPI ID</h3>
                      <div className="flex items-center gap-2 p-3 bg-[var(--color-subtle)] border border-[var(--color-border)] justify-between rounded-lg">
                        <span className="text-xs font-mono text-[var(--color-text)] font-bold">{user?.email?.split('@')[0]}@okaxis</span>
                        <span className="text-[8px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 uppercase">Primary UPI</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => showToast("Add Payment Options module loaded in integration sandbox.", "info")}
                        className="w-full bg-[var(--color-subtle)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-mono font-black text-[10px] tracking-widest uppercase py-3 border border-[var(--color-border)] transition-colors cursor-pointer"
                      >
                        + Add New Payment Method
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MY WALLET */}
              {activeProfileTab === 'wallet' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="pb-4 border-b border-[var(--color-border)]">
                    <h2 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase flex items-center gap-2">
                      <FaWallet /> Store Credit & Wallet
                    </h2>
                  </div>

                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-6">
                    {/* Wallet Balance Display */}
                    <div className="bg-amber-500/10 border border-amber-400/35 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
                      <div className="space-y-1 text-center md:text-left">
                        <span className="text-[9px] font-mono font-bold text-amber-800 uppercase tracking-widest">Available Balance</span>
                        <h2 className="text-2xl font-black text-amber-950 font-mono">
                          ₹{walletBalance.toFixed(2)}
                        </h2>
                        <p className="text-[8px] text-amber-800 font-bold uppercase tracking-wider">Instant checkout discount balance · never expires</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsTopUpModalOpen(true)}
                          className="bg-amber-50 hover:bg-amber-600 text-black font-mono font-black text-[10px] tracking-widest uppercase py-3 px-6 rounded-lg transition-colors cursor-pointer"
                        >
                          Top-Up Wallet
                        </button>
                      </div>
                    </div>

                    {/* Redeem Gift Card Form */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-[10px] font-black text-[var(--color-text)] tracking-wider uppercase border-b border-[var(--color-border)] pb-2">REDEEM GIFT CARD / VOUCHER</h3>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="ENTER GIFT VOUCHER CODE..."
                          className="flex-1 bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider outline-hidden"
                        />
                        <button
                          onClick={() => showToast("Voucher code verified. simulated gift voucher redeemed!", "success")}
                          className="bg-neutral-950 hover:bg-neutral-800 text-white font-mono font-black text-[10px] tracking-widest uppercase px-6 rounded-lg cursor-pointer transition-all duration-200"
                        >
                          REDEEM
                        </button>
                      </div>
                    </div>

                    {/* Wallet Transactions History */}
                    <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
                      <h3 className="text-[10px] font-black text-[var(--color-text)] tracking-wider uppercase">WALLET TRANSACTION HISTORY</h3>
                      <div className="divide-y divide-[var(--color-border)]/50">
                        {/* Dynamic refund, top-up and wallet payment transactions */}
                        {walletTransactions.map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center py-2.5">
                            <div>
                              <span className="text-xs font-bold text-[var(--color-text)] uppercase block">{tx.title}</span>
                              <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase">
                                {tx.date.toLocaleDateString('en-US', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <span className={`text-xs font-mono font-black ${tx.isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tx.amount}
                            </span>
                          </div>
                        ))}
                        {walletTransactions.length === 0 && (
                          <div className="py-4 text-center text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-wider">
                            No transaction history found
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MY ADDRESSES */}
              {activeProfileTab === 'addresses' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="pb-4 border-b border-[var(--color-border)] flex items-center justify-between">
                    <h2 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase flex items-center gap-2">
                      <FiMapPin /> Saved Addresses ({addresses.length})
                    </h2>
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
                        className="text-xs font-black text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors cursor-pointer uppercase tracking-wider"
                      >
                        + Add New Address
                      </button>
                    )}
                  </div>

                  {editingAddress ? (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
                      <h3 className="text-[10px] font-black text-[var(--color-text)] tracking-wider uppercase border-b border-[var(--color-border)] pb-2">
                        {editingAddress === 'new' ? 'ADD NEW SHIPPING ADDRESS' : 'EDIT SHIPPING ADDRESS'}
                      </h3>
                      
                      <form onSubmit={handleAddressSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Full Name</label>
                            <input 
                              type="text"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Phone Number</label>
                            <input 
                              type="tel"
                              required
                              value={formData.phone}
                              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Street Address</label>
                          <input 
                            type="text"
                            required
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">City</label>
                            <input 
                              type="text"
                              required
                              value={formData.city}
                              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                              className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">State</label>
                            <input 
                              type="text"
                              required
                              value={formData.state}
                              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                              className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Country</label>
                            <input 
                              type="text"
                              required
                              value={formData.country}
                              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                              className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Pincode</label>
                            <input 
                              type="text"
                              required
                              value={formData.pincode}
                              onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                              className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 py-2">
                          <input 
                            type="checkbox"
                            id="is_default"
                            checked={formData.is_default}
                            disabled={editingAddress !== 'new' && editingAddress.is_default}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                            className="accent-[var(--color-accent)] rounded border-[var(--color-border)] cursor-pointer h-4 w-4 disabled:opacity-50"
                          />
                          <label htmlFor="is_default" className="text-[10px] font-black text-[var(--color-muted)] uppercase cursor-pointer select-none">Set as primary shipping address</label>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <button 
                            type="button"
                            onClick={() => setEditingAddress(null)}
                            className="w-full py-3.5 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] font-mono font-bold text-xs tracking-widest uppercase rounded-lg transition-colors cursor-pointer text-center"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            disabled={saveLoading}
                            className="w-full py-3.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-mono font-black text-xs tracking-widest uppercase text-white rounded-lg transition-colors cursor-pointer shadow-md"
                          >
                            {saveLoading ? 'SAVING DATA...' : 'SAVE ADDRESS'}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addresses.length === 0 ? (
                        <div className="md:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-10 text-center space-y-4">
                          <p className="text-xs text-[var(--color-muted)] uppercase tracking-widest font-mono">No shipping addresses saved yet.</p>
                          <button 
                            onClick={() => setEditingAddress('new')}
                            className="bg-neutral-950 hover:bg-neutral-800 text-white font-mono font-black text-[10px] tracking-widest uppercase py-3 px-8 rounded-none transition-colors cursor-pointer"
                          >
                            Add Address &rarr;
                          </button>
                        </div>
                      ) : (
                        addresses.map((addr) => (
                          <div key={addr.$id || addr.id} className={`bg-[var(--color-surface)] border rounded-xl p-5 shadow-2xs space-y-4 hover:border-neutral-950 transition-all relative ${addr.is_default ? 'border-amber-400 bg-amber-500/5' : 'border-[var(--color-border)]'}`}>
                            {addr.is_default && (
                              <span className="absolute top-4 right-4 bg-amber-500 text-black text-[8px] font-mono font-black px-2 py-0.5 uppercase tracking-wider select-none shadow-2xs">
                                Primary
                              </span>
                            )}
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-black text-[var(--color-text)] uppercase">{addr.name}</h4>
                              <p className="text-xs text-[var(--color-text)] font-medium leading-relaxed">{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</p>
                              <p className="text-[10px] font-mono text-[var(--color-muted)] uppercase font-semibold">Phone: {addr.phone}</p>
                            </div>
                            
                            <div className="flex gap-4 pt-2 border-t border-[var(--color-border)] text-[10px] font-mono">
                              <button
                                onClick={() => {
                                  setEditingAddress(addr);
                                  setFormData({
                                    name: addr.name || '',
                                    phone: addr.phone || '',
                                    address: addr.address || '',
                                    city: addr.city || '',
                                    state: addr.state || '',
                                    country: addr.country || 'India',
                                    is_default: addr.is_default || false
                                  });
                                }}
                                className="font-bold text-amber-500 hover:text-amber-600 uppercase cursor-pointer"
                              >
                                Edit
                              </button>
                              {!addr.is_default && (
                                <button
                                  onClick={() => {
                                    setDeleteTargetAddressId(addr.$id || addr.id);
                                    setIsAddressDeleteModalOpen(true);
                                  }}
                                  className="font-bold text-rose-600 hover:text-rose-700 uppercase cursor-pointer"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: MY PROFILE */}
              {activeProfileTab === 'profile' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="pb-4 border-b border-[var(--color-border)]">
                    <h2 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase flex items-center gap-2">
                      <FiUser /> Edit Personal Details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: Info Form */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
                      <h3 className="text-[10px] font-black text-[var(--color-text)] tracking-wider uppercase border-b border-[var(--color-border)] pb-2">PERSONAL PROFILE INFO</h3>
                      
                      <form onSubmit={handleUpdateProfileInfo} className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Full Name</label>
                          <input 
                            type="text"
                            required
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            disabled={profileUpdating}
                            className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium disabled:opacity-50"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Email Address (Registered)</label>
                          <input 
                            type="email"
                            disabled
                            value={user?.email}
                            className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-muted)] outline-hidden font-medium opacity-65 cursor-not-allowed select-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Phone Number</label>
                          <input 
                            type="tel"
                            placeholder="E.G. 9876543210"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            disabled={profileUpdating}
                            className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium disabled:opacity-50"
                          />
                        </div>
                        
                        <div className="pt-2">
                          <button 
                            type="submit"
                            disabled={profileUpdating}
                            className="w-full py-3.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-mono font-black text-xs tracking-widest uppercase text-white rounded-lg transition-colors cursor-pointer shadow-md"
                          >
                            {profileUpdating ? 'UPDATING...' : 'SAVE CHANGES'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Column 2: Password Change Form */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
                      <h3 className="text-[10px] font-black text-[var(--color-text)] tracking-wider uppercase border-b border-[var(--color-border)] pb-2">CHANGE PASSWORD</h3>
                      
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Current Password</label>
                          <input 
                            type="password"
                            required
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={profileUpdating}
                            className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium disabled:opacity-50"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">New Password</label>
                          <input 
                            type="password"
                            required
                            placeholder="MIN. 6 CHARACTERS"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={profileUpdating}
                            className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium disabled:opacity-50"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Confirm New Password</label>
                          <input 
                            type="password"
                            required
                            placeholder="CONFIRM NEW PASSWORD"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            disabled={profileUpdating}
                            className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium disabled:opacity-50"
                          />
                        </div>

                        <div className="pt-2">
                          <button 
                            type="submit"
                            disabled={profileUpdating}
                            className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-800 font-mono font-black text-xs tracking-widest uppercase text-white rounded-lg transition-colors cursor-pointer shadow-md"
                          >
                            {profileUpdating ? 'UPDATING...' : 'UPDATE PASSWORD'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      {/* Review Modal Overlay */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--color-accent)]/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--color-surface)] w-full max-w-md rounded-none border border-[var(--color-accent)] shadow-2xl p-6 relative space-y-6 animate-scale-up text-[var(--color-text)]">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setReviewModalItem(null)}
              className="absolute top-4 right-4 text-[var(--color-muted)] hover:text-[var(--color-text)] font-bold text-sm p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">PRODUCT FIT FEEDBACK</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Review {reviewModalItem.name}
              </h2>
            </div>

            <hr className="border-[var(--color-border)]" />

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
              <form onSubmit={handleModalReviewSubmit} className="space-y-4 font-sans text-[var(--color-text)]">
                {/* Star Rating Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Your Rating</span>
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
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Size Fit Preference</span>
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
                            ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                            : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]'
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
                    <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Comfort</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalComfort(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalComfort === val
                              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                              : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Quality</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalQuality(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalQuality === val
                              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                              : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Breathable */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Breathable</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalBreathable(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalBreathable === val
                              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                              : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]'
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
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Your Review</span>
                  <textarea
                    rows="3"
                    required
                    value={modalComment}
                    onChange={(e) => setModalComment(e.target.value)}
                    placeholder="Write your product experience here..."
                    className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden resize-none transition-colors"
                  />
                </div>

                {/* Review Image URLs */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Customer Image URLs (comma-separated, optional)</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={modalImages}
                      onChange={(e) => setModalImages(e.target.value)}
                      placeholder="https://example.com/pic1.jpg, https://example.com/pic2.jpg"
                      className="flex-1 bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden transition-colors"
                    />
                    <label className="shrink-0 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono font-bold text-[10px] tracking-wider px-3 py-2 rounded-none uppercase transition-all cursor-pointer border border-[var(--color-accent)] text-center select-none">
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
                  <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-wide">
                    TIP: PASTE DIRECT HTTPS LINKS OR CHOOSE A LOCAL IMAGE TO UPLOAD TEMPORARILY.
                  </span>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer text-center py-2.5 shadow-md"
                  >
                    {modalSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewModalItem(null)}
                    className="px-4 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-none cursor-pointer py-2.5"
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
            className="absolute inset-0 bg-[var(--color-accent)]/60 backdrop-blur-xs" 
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <div className="relative z-50 w-full max-w-sm bg-[var(--color-surface)] p-8 border border-[var(--color-accent)] shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">LOGOUT CONFIRMATION</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Confirm Log Out
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
                Are you sure you want to log out? You will need to sign in again to place orders or view your profile.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer shadow-md"
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
            className="absolute inset-0 bg-[var(--color-accent)]/60 backdrop-blur-xs" 
            onClick={() => setIsAddressDeleteModalOpen(false)}
          />
          <div className="relative z-50 w-full max-w-sm bg-[var(--color-surface)] p-8 border border-[var(--color-accent)] shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">DELETE SAVED ADDRESS</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Delete Shipping Address?
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
                Are you sure you want to delete this shipping address? It will be permanently removed from your saved address list.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsAddressDeleteModalOpen(false)}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-none cursor-pointer"
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

      {/* Wallet Top-Up Amount Selector Modal */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-[var(--color-accent)]/65 backdrop-blur-xs" 
            onClick={() => setIsTopUpModalOpen(false)}
          />
          <div className="relative z-50 w-full max-w-md bg-[var(--color-surface)] p-6 border border-[var(--color-accent)] shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">STORE WALLET</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Top-Up Store Wallet
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
                Add money to your Store Wallet using our simulated payment gateway sandbox.
              </p>
            </div>

            <form onSubmit={handleTopUpProceed} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Amount to Add (₹)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder="Enter amount..."
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden font-medium"
                />
              </div>

              {/* Quick Select Preset Buttons */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase">Quick Presets</span>
                <div className="grid grid-cols-4 gap-2">
                  {['200', '500', '1000', '2000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopUpAmount(preset)}
                      className={`py-2 rounded-lg font-bold text-[10px] tracking-wider transition-all cursor-pointer border uppercase font-mono ${
                        topUpAmount === preset
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                          : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all text-[10px] font-mono font-black uppercase tracking-wider text-white rounded-none cursor-pointer shadow-md"
                >
                  Proceed to Pay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Top-up Razorpay Sandbox Modal */}
      <RazorpaySandboxModal
        isOpen={isRazorpayOpen}
        onClose={() => {
          setIsRazorpayOpen(false);
        }}
        finalAmount={Number(topUpAmount) || 0}
        customerName={user?.name || ''}
        showToast={showToast}
        onSuccess={(generatedPayId) => {
          handleTopUpSuccess(generatedPayId);
        }}
      />

      <Footer />
    </>
  );
}

export default UserProfile;
