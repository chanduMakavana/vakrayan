import { useState, useEffect, useMemo } from 'react';
import { useRazorpaySDK } from '../../hooks/useRazorpaySDK';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiMapPin, FiShoppingBag, FiArrowRight, FiArrowLeft, FiLogOut, FiUser, FiCompass, FiHelpCircle, FiShield, FiBell, FiRefreshCw } from 'react-icons/fi';
import { login as loginAction, logout as logoutAction } from '../../features/login';
import authService from '../../services/auth';
import addressService from '../../services/address';
import ordersService from '../../services/orders';
import reviewsService from '../../services/reviews';
import productsService from '../../services/products';
import cartService from '../../services/cart';
import { addCartItemState } from '../../features/addToCart';
import { setProducts } from '../../features/productsSlice';
import { useToast } from '../../context/ToastContext';
import Footer from '../pageComponets/Footer';
import { FaStar, FaWallet } from 'react-icons/fa';
import storageService, { compressImage } from '../../services/storage';
import RazorpaySandboxModal from '../pageComponets/RazorpaySandboxModal';
import walletService from '../../services/wallet';
import PageSkeleton from '../pageComponets/PageSkeleton';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { requestNotificationPermission } from '../../services/notifications';

function UserProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const { user, isAuthenticated } = useSelector(state => state.auth);
  const cartItems = useSelector(state => state.cart);
  const { items: products, fetched: productsFetched } = useSelector(state => state.products);

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  // ✅ SEO: Dynamic page title — shows user's name in the browser tab
  useEffect(() => {
    const name = user?.name ? `${user.name}'s Profile` : 'My Profile'
    document.title = `${name} | Vakrayan`
  }, [user?.name])

  const [activeProfileTab, setActiveProfileTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'overview';
  });

  // Helper: switch tab + clean URL
  const switchTab = (tab) => {
    setActiveProfileTab(tab);
    navigate('/profile' + (tab !== 'overview' ? `?tab=${tab}` : ''), { replace: true });
  };

  const [notificationStatus, setNotificationStatus] = useState(
    typeof window !== 'undefined' && window.Notification ? window.Notification.permission : 'default'
  );
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [reorderConfirmOrder, setReorderConfirmOrder] = useState(null);

  const handleEnableNotifications = async () => {
    setNotificationLoading(true);
    try {
      const token = await requestNotificationPermission(user?.$id);
      if (token) {
        showToast("Push notifications enabled successfully!", "success");
      } else {
        showToast("Could not enable notifications. Please check browser settings.", "warning");
      }
      setNotificationStatus(window.Notification ? window.Notification.permission : 'default');
    } catch (err) {
      console.error(err);
      showToast("An error occurred.", "error");
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleSendTestNotification = () => {
    if (window.Notification && window.Notification.permission === "granted") {
      const title = "Vakrayan Official";
      const options = {
        body: "🔥 Live drop restock! Grab your heavyweight fits before they sell out.",
        icon: "/vakrayan-favicon.png",
        badge: "/vakrayan-favicon.png"
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options);
          showToast("Test notification sent!", "success");
        }).catch((err) => {
          console.error("Service worker not ready:", err);
          new Notification(title, options);
          showToast("Test notification sent!", "success");
        });
      } else {
        new Notification(title, options);
        showToast("Test notification sent!", "success");
      }
    } else {
      showToast("Please enable notifications first.", "warning");
    }
  };

  // Sync tab when URL changes (e.g. navigating from Track Order)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveProfileTab(tab);
    else setActiveProfileTab('overview');
  }, [location.search]);
  
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.prefs?.phone || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);

  // ✅ PERFORMANCE FIX: Replaced duplicate Razorpay script injection with shared hook.
  useRazorpaySDK();

  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);

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
      await walletService.createWalletTransaction({
        userId: user.$id,
        amount: Number(topUpAmount),
        type: 'credit',
        title: 'Wallet Top-Up',
        referenceId: paymentId
      });

      showToast(`₹${Number(topUpAmount).toFixed(2)} credited to your Store Wallet successfully!`, "success");
      
      // Reload wallet balance and transactions
      const bal = await walletService.getUserWalletBalance(user.$id);
      setWalletBalance(bal);
      const txs = await walletService.getUserWalletTransactions(user.$id);
      const mappedTxs = txs.map(t => ({
        id: t.$id || t.id,
        title: t.title,
        date: new Date(t.$createdAt || t.date || new Date()),
        amount: `${t.type === 'credit' ? '+' : '-'}₹${Number(t.amount || 0).toFixed(2)}`,
        isCredit: t.type === 'credit'
      }));
      setWalletTransactions(mappedTxs);
    } catch (err) {
      console.error("Top-up transaction failed:", err);
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

    const liveKey = import.meta.env.VITE_RAZORPAY_KEY_ID || '';
    if (window.Razorpay && liveKey) {
      const options = {
        key: liveKey,
        amount: Math.round(amount * 100), // in paise
        currency: "INR",
        name: "Vakrayan",
        description: `Wallet Top-Up`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: profilePhone || user?.prefs?.phone || ''
        },
        theme: {
          color: "#A16207" // Premium gold color style gateway matching our theme
        },
        modal: {
          ondismiss: () => {
            showToast("Wallet top-up dismissed.", "info");
          }
        },
        handler: async (response) => {
          try {
            const payId = response.razorpay_payment_id;
            const ordId = response.razorpay_order_id;
            const sig = response.razorpay_signature;

            const verifyUrl = import.meta.env.VITE_RAZORPAY_VERIFY_URL;
            if (verifyUrl && ordId && payId && sig) {
              const verifyResp = await fetch(verifyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: ordId,
                  razorpay_payment_id: payId,
                  razorpay_signature: sig,
                }),
              });
              const verifyData = await verifyResp.json();
              if (!verifyData.success) {
                showToast('Top-up payment verification failed!', 'error');
                return;
              }
            } else if (verifyUrl && !sig) {
              showToast('Missing payment verification parameters.', 'error');
              return;
            }

            const finalPayId = payId || `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
            await handleTopUpSuccess(finalPayId);
          } catch (err) {
            console.error("Top-up processing issue:", err);
            showToast("Failed to complete top-up transaction.", "error");
          }
        }
      };
      try {
        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      } catch (err) {
        console.warn("Real Razorpay initiation issue, falling back to sandbox simulator:", err.message);
      }
    }

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
        showToast("✓ Image uploaded successfully to Firebase Storage!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      showToast("Firebase Storage upload failed. Ensure bucket ID 'images' exists, or paste a URL.", "error");
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
        is_verified_purchase: true,
        fit: '',
        comfort: 0,
        quality: 0,
        breathable: 0
      });

      setModalSuccessMsg("Review posted successfully! Thank you for the feedback.");
      showToast("Review submitted successfully!", "success");
      setModalComment('');
      setModalImages('');
      setModalRating(5);
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
      const loadProducts = async () => {
        try {
          const response = await productsService.getProducts();
          const structuredData = response?.documents || response || [];
          dispatch(setProducts(structuredData));
        } catch {
          dispatch(setProducts([]));
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
        // Parallel fetches for high performance
        const [list, userOrdersList, bal, txs] = await Promise.all([
          addressService.getUserAddresses(user.$id),
          ordersService.getUserOrders(user.$id),
          walletService.getUserWalletBalance(user.$id),
          walletService.getUserWalletTransactions(user.$id)
        ]);

        setAddresses(list || []);
        setOrders(userOrdersList || []);
        setWalletBalance(bal);

        const mappedTxs = (txs || []).map(t => ({
          id: t.$id || t.id,
          title: t.title,
          date: new Date(t.$createdAt || t.date || new Date()),
          amount: `${t.type === 'credit' ? '+' : '-'}₹${Number(t.amount || 0).toFixed(2)}`,
          isCredit: t.type === 'credit'
        }));
        setWalletTransactions(mappedTxs);
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

  const confirmLogout = async (allDevices = false) => {
    setIsLogoutModalOpen(false);
    try {
      if (allDevices) {
        await authService.logoutAllDevices();
      } else {
        await authService.logout();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      localStorage.removeItem('remember_me');
      sessionStorage.removeItem('session_active');
      dispatch(logoutAction());
      showToast("Signed out of your account", "info");
      navigate('/');
    }
  };

  // Helper to check if cancelled order occurred within 24 hours (1 day)
  const isWithin1DayOfCancellation = (ord) => {
    if (!ord) return false;
    const status = (ord?.status || ord?.order_status || '').toUpperCase();
    if (!status.includes('CANCEL')) {
      return false;
    }
    const cancelTimeStr = ord.cancelledAt || ord.metadata?.cancelled_at || ord.$updatedAt || ord.updatedAt || ord.$createdAt || ord.createdAt;
    if (!cancelTimeStr) return true;
    
    const cancelTime = new Date(cancelTimeStr).getTime();
    if (isNaN(cancelTime)) return true;
    
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (now - cancelTime) <= twentyFourHours;
  };

  // Reactivate / Restore cancelled order back to PENDING status within 24 hours
  const handleReorderOrder = async (orderToReorder, e) => {
    if (e) e.stopPropagation();
    try {
      const orderId = orderToReorder.$id || orderToReorder.id;
      const orderNumber = orderToReorder.order_number || `ORD-${orderId.substring(0, 6).toUpperCase()}`;

      const updated = await ordersService.updateOrderStatus(orderId, 'PENDING', {
        uncancelled_at: new Date().toISOString(),
        reactivated_by: 'customer'
      });

      if (updated) {
        showToast(`✓ Order #${orderNumber} reactivated successfully!`, "success");

        let itemsList = [];
        try { itemsList = typeof orderToReorder.items === 'string' ? JSON.parse(orderToReorder.items) : orderToReorder.items || []; } catch { itemsList = []; }

        sendWebhookNotification('order.reactivated', {
          orderId: orderId,
          orderNumber: orderNumber,
          customerName: user?.name || orderToReorder.name || 'Customer',
          email: user?.email || orderToReorder.email || '',
          total: Math.round(orderToReorder.total || 0),
          paymentMethod: orderToReorder.paymentMethod || 'COD',
          items: itemsList,
          note: 'Order reactivated by customer within 24 hours'
        });

        if (user && user.$id) {
          const userOrders = await ordersService.getOrdersByUser(user.$id);
          setOrders(userOrders || []);
        }
      }
    } catch (err) {
      console.error("Failed to reactivate order:", err);
      showToast("Could not reactivate order. Please try again.", "error");
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    // 1. Validate Phone Number (10 digits)
    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(formData.phone.trim())) {
      showToast("Phone number must be a valid 10-digit number.", "error");
      setSaveLoading(false);
      return;
    }

    // 2. Validate Pincode (6 digits)
    const pincodePattern = /^[0-9]{6}$/;
    if (!pincodePattern.test(formData.pincode.trim())) {
      showToast("Pincode must be a valid 6-digit number.", "error");
      setSaveLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        pincode: formData.pincode.trim(),
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

  const showSkeleton = useDelayedLoading(loading, 300);

  if (loading) {
    return showSkeleton ? <PageSkeleton /> : null;
  }

  return (
    <>
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans pb-20 pt-6">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-8">
          
          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDEBAR: Navigation Menu (Desktop Only) */}
            <div className="hidden lg:flex lg:col-span-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm flex-col gap-1.5 mb-6 lg:mb-0">
              <span className="text-[10px] font-bold text-[var(--color-muted)] tracking-widest uppercase px-3 pb-2.5 border-b border-[var(--color-border)] mb-1">
                ACCOUNT DASHBOARD
              </span>
              
              <button
                type="button"
                onClick={() => { switchTab('overview'); setEditingAddress(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'overview'
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-l-4 border-[var(--color-accent)] font-black'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] border-l-4 border-transparent'
                }`}
              >
                <FiCompass className="text-sm shrink-0" />
                Overview
              </button>
              
              <button
                type="button"
                onClick={() => { switchTab('orders'); setEditingAddress(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'orders'
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-l-4 border-[var(--color-accent)] font-black'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] border-l-4 border-transparent'
                }`}
              >
                <FiShoppingBag className="text-sm shrink-0" />
                My Orders
              </button>

              <button
                type="button"
                onClick={() => { switchTab('wallet'); setEditingAddress(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'wallet'
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-l-4 border-[var(--color-accent)] font-black'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] border-l-4 border-transparent'
                }`}
              >
                <FaWallet className="text-sm shrink-0" />
                My Wallet
              </button>
              
              <button
                type="button"
                onClick={() => { switchTab('addresses'); setEditingAddress(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'addresses'
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-l-4 border-[var(--color-accent)] font-black'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] border-l-4 border-transparent'
                }`}
              >
                <FiMapPin className="text-sm shrink-0" />
                My Addresses
              </button>
              
              <button
                type="button"
                onClick={() => { switchTab('profile'); setEditingAddress(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                  activeProfileTab === 'profile'
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-l-4 border-[var(--color-accent)] font-black'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)] border-l-4 border-transparent'
                }`}
              >
                <FiUser className="text-sm shrink-0" />
                My Profile
              </button>
              
              <div className="pt-2 mt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-left text-rose-600 hover:bg-rose-50 transition-all cursor-pointer border-l-4 border-transparent"
                >
                  <FiLogOut className="text-sm shrink-0" />
                  Logout
                </button>
              </div>
            </div>

            {/* RIGHT CONTENT WORKSPACE */}
            <div className="w-full lg:col-span-9 space-y-6">
              
              {/* MOBILE SUB-TAB NAVIGATION BAR (Only shown on mobile when inside sub-tabs) */}
              {activeProfileTab !== 'overview' && (
                <div className="flex lg:hidden overflow-x-auto gap-2 pb-2.5 mb-4 scrollbar-none border-b border-[var(--color-border)] shrink-0 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => { switchTab('overview'); setEditingAddress(null); }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)] shrink-0"
                  >
                    <FiCompass className="text-sm shrink-0" />
                    Overview
                  </button>

                  <button
                    type="button"
                    onClick={() => { switchTab('orders'); setEditingAddress(null); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeProfileTab === 'orders'
                        ? 'bg-[var(--color-accent)] text-white font-black shadow-xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <FiShoppingBag className="text-sm shrink-0" />
                    Orders
                  </button>

                  <button
                    type="button"
                    onClick={() => { switchTab('wallet'); setEditingAddress(null); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeProfileTab === 'wallet'
                        ? 'bg-[var(--color-accent)] text-white font-black shadow-xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <FaWallet className="text-sm shrink-0" />
                    Wallet
                  </button>

                  <button
                    type="button"
                    onClick={() => { switchTab('addresses'); setEditingAddress(null); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeProfileTab === 'addresses'
                        ? 'bg-[var(--color-accent)] text-white font-black shadow-xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <FiMapPin className="text-sm shrink-0" />
                    Addresses
                  </button>

                  <button
                    type="button"
                    onClick={() => { switchTab('profile'); setEditingAddress(null); }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeProfileTab === 'profile'
                        ? 'bg-[var(--color-accent)] text-white font-black shadow-xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <FiUser className="text-sm shrink-0" />
                    Profile
                  </button>
                </div>
              )}
              
              {/* TAB 1: OVERVIEW */}
              {activeProfileTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Emerald Green Header Card */}
                  <div className="bg-[var(--color-surface-alt)] border border-[var(--color-border-hard)] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-center gap-6 justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent-glow)] rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      {/* Avatar initial circle */}
                      <div className="w-16 h-16 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-2xl font-black font-mono shadow-xs shrink-0 select-none">
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
                      onClick={() => switchTab('profile')}
                      className="w-full md:w-auto bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono font-black text-[10px] tracking-widest uppercase py-3 px-8 rounded-lg transition-all duration-200 cursor-pointer shadow-xs border border-[var(--color-accent-dark)] shrink-0"
                    >
                      EDIT PROFILE
                    </button>
                  </div>

                  {/* Grid of Dashboard Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* My Orders Card */}
                    <div 
                      onClick={() => switchTab('orders')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-accent)] transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiShoppingBag className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Orders</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">View, Modify And Track Orders</p>
                    </div>



                    {/* My Wallet Card */}
                    <div 
                      onClick={() => switchTab('wallet')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-accent)] transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FaWallet className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Wallet</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">Wallet Balance, Credit & Gift Cards</p>
                    </div>

                    {/* My Addresses Card */}
                    <div 
                      onClick={() => switchTab('addresses')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-accent)] transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiMapPin className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Addresses</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">Edit, Add Or Remove Addresses</p>
                    </div>

                    {/* My Profile Card */}
                    <div 
                      onClick={() => switchTab('profile')}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-accent)] transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiUser className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">My Profile</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">Edit Personal Info And Change Password</p>
                    </div>

                    {/* Help & Support Card */}
                    <div 
                      onClick={() => showToast("📞 Reach out to us at support@vakrayan.com for any order assistance.", "info")}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-accent)] transition-all shadow-2xs hover:shadow-sm cursor-pointer text-center flex flex-col items-center justify-center space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiHelpCircle className="text-lg" />
                      </div>
                      <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">Help & Support</h3>
                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">Reach Out To Us</p>
                    </div>

                  </div>

                  {/* Sleek Compact Logout Button (Mobile Only — PC already has left sidebar logout) */}
                  <div className="pt-2 flex justify-center lg:hidden">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 font-mono font-bold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-2xs"
                    >
                      <FiLogOut className="text-sm shrink-0" />
                      Logout of Account
                    </button>
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
                              <div className="space-y-1">
                                <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider block">
                                  ORDER {orderNum} • {orderDate}
                                </span>
                                <h4 className="text-[13px] font-bold text-[var(--color-text)] uppercase tracking-wide leading-relaxed line-clamp-2">
                                  {parsedItems.map(i => `${i.name} (${i.size || 'M'})`).join(' • ')}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3 pt-1">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest ${
                                  order.status === 'DELIVERED' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                  : order.status === 'SHIPPED' 
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                  : order.status === 'CANCELLED'
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 animate-pulse'
                                }`}>
                                  {order.status || 'PENDING'}
                                </span>
                                <span className="text-[10px] text-[var(--color-muted)] font-mono font-bold tracking-wider whitespace-nowrap">
                                  {parsedItems.reduce((acc, i) => acc + Number(i.quantity || 1), 0)} ITEM(S)
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

                              {isWithin1DayOfCancellation(order) && (
                                <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase tracking-wider">
                                    ⏰ Cancelled within 24h — eligible to restore
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReorderConfirmOrder(order);
                                    }}
                                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[10px] tracking-wider px-3 py-1.5 rounded-lg uppercase transition-all shadow-xs cursor-pointer"
                                  >
                                    <FiRefreshCw className="text-xs shrink-0" />
                                    <span>Reactivate & Restore Order</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4 justify-end shrink-0">
                              <div className="text-right">
                                <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">Total Paid</span>
                                <span className="text-base font-bold tracking-wide text-[var(--color-text)]">
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
                    <div className="bg-[var(--color-accent-light)] border border-[var(--color-accent)]/20 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
                      <div className="space-y-1 text-center md:text-left">
                        <span className="text-[9px] font-mono font-bold text-[var(--color-accent-dark)] uppercase tracking-widest">Available Balance</span>
                        <h2 className="text-2xl font-black text-[var(--color-text)] font-mono">
                          ₹{walletBalance.toFixed(2)}
                        </h2>
                        <p className="text-[8px] text-[var(--color-muted)] font-bold uppercase tracking-wider">Instant checkout discount balance · never expires</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsTopUpModalOpen(true)}
                          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono font-black text-[10px] tracking-widest uppercase py-3 px-6 rounded-lg transition-colors cursor-pointer shadow-xs"
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
                          className="flex-1 bg-white border border-zinc-300 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400 rounded-lg px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider outline-hidden shadow-xs"
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
                          <div key={addr.$id || addr.id} className={`bg-[var(--color-surface)] border rounded-xl p-5 shadow-2xs space-y-4 hover:border-neutral-950 transition-all relative ${addr.is_default ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-[var(--color-border)]'}`}>
                            {addr.is_default && (
                              <span className="absolute top-4 right-4 bg-[var(--color-accent)] text-white text-[8px] font-mono font-black px-2 py-0.5 uppercase tracking-wider select-none shadow-2xs">
                                Primary
                              </span>
                            )}
                            <div className="space-y-1.5">
                              <h4 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">{addr.name || addr.customerName}</h4>
                              <p className="text-xs text-[var(--color-text)] font-medium leading-relaxed">
                                {[addr.address || addr.addressLine, addr.city, addr.state].filter(Boolean).join(', ')} - {addr.pincode}
                              </p>
                              <p className="text-[10px] font-mono text-[var(--color-muted)] uppercase font-semibold">Phone: {addr.phone}</p>
                            </div>
                            
                            <div className="flex gap-4 pt-2 border-t border-[var(--color-border)] text-[10px] font-mono">
                              <button
                                onClick={() => {
                                  setEditingAddress(addr);
                                  setFormData({
                                    name: addr.name || addr.customerName || '',
                                    phone: addr.phone || '',
                                    address: addr.address || addr.addressLine || '',
                                    city: addr.city || '',
                                    state: addr.state || '',
                                    country: addr.country || 'India',
                                    pincode: addr.pincode || '',
                                    is_default: addr.is_default || false
                                  });
                                }}
                                className="font-bold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] uppercase cursor-pointer"
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

                  {/* Security & Sessions */}
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
                    <h3 className="text-[10px] font-black text-[var(--color-text)] tracking-wider uppercase border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
                      <FiShield className="text-xs text-[var(--color-accent)]" /> Security & Active Sessions
                    </h3>
                    <p className="text-[11px] text-[var(--color-muted)] font-medium leading-relaxed max-w-xl">
                      Logged in on multiple devices? You can sign out from all other active sessions across your computers, tablets, and mobile devices at once.
                    </p>
                    <div className="pt-2">
                      <button 
                        type="button"
                        onClick={handleLogout}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-700 font-mono font-black text-xs tracking-widest uppercase text-white rounded-lg transition-colors cursor-pointer shadow-md flex items-center gap-2"
                      >
                        <FiLogOut className="text-xs shrink-0" />
                        Logout from All Devices
                      </button>
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

                {/* Review Image Upload Section */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">📸 Product Photos (Optional)</span>
                    <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider">
                      {modalImages.split(',').filter(Boolean).length} / 5 Uploaded
                    </span>
                  </div>

                  {/* Thumbnail grid */}
                  <div className="flex flex-wrap gap-2.5 min-h-[40px] p-2 border border-dashed border-[var(--color-border)] bg-[var(--color-subtle)]/40 rounded-lg">
                    {modalImages.split(',').map(url => url.trim()).filter(Boolean).map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 bg-white shrink-0">
                        <img src={url} alt="Review Preview" className="w-full h-full object-cover border border-[var(--color-border)] rounded-md" />
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = modalImages.split(',')
                              .map(u => u.trim())
                              .filter(Boolean)
                              .filter((_, i) => i !== idx)
                              .join(', ');
                            setModalImages(remaining);
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow-md cursor-pointer z-10 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {uploadingImage && (
                      <div className="w-16 h-16 border border-[var(--color-border)] rounded-md flex items-center justify-center bg-white/50 animate-pulse">
                        <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!uploadingImage && modalImages.split(',').filter(Boolean).length === 0 && (
                      <div className="flex-1 flex items-center justify-center py-2 text-[10px] font-mono text-[var(--color-muted)] uppercase select-none">
                        No photos attached. Click below to add.
                      </div>
                    )}
                  </div>

                  <label className="w-full bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-[10px] tracking-wider py-3 rounded-none uppercase transition-all cursor-pointer border border-neutral-950 text-center select-none block">
                    {uploadingImage ? 'Uploading image...' : '📷 Add Photo / Upload File'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const currentCount = modalImages.split(',').filter(Boolean).length;
                        if (currentCount >= 5) {
                          showToast("You can upload a maximum of 5 photos.", "error");
                          return;
                        }
                        handleImageUpload(e, setModalImages, modalImages);
                      }}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <div className="relative z-[101] w-full max-w-sm bg-[var(--color-surface)] p-6 sm:p-8 rounded-2xl border border-[var(--color-border)] shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto text-xl shadow-xs">
                <FiLogOut />
              </div>
              <h2 className="text-base font-black tracking-wider uppercase text-[var(--color-text)] mt-3">
                Log Out of Account?
              </h2>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                Are you sure you want to log out? You will need to sign in again to view orders or profile details.
              </p>
            </div>
            
            <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => confirmLogout(false)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-xs font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer shadow-sm text-center flex items-center justify-center gap-2"
              >
                <FiLogOut className="text-sm" />
                Log Out
              </button>
              
              <button
                type="button"
                onClick={() => confirmLogout(true)}
                className="w-full py-2.5 bg-transparent hover:bg-[var(--color-subtle)] text-[11px] font-bold uppercase tracking-wider text-rose-600 rounded-xl cursor-pointer transition-all text-center"
              >
                Log Out from All Devices
              </button>

              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="w-full py-2.5 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-xs font-bold uppercase tracking-wider text-[var(--color-text)] rounded-xl cursor-pointer text-center"
              >
                Cancel
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

      {/* Reorder / Restore Order Confirmation Warning Modal */}
      {reorderConfirmOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">
                Reactivate order?
              </h3>
              <p className="text-xs text-neutral-500 font-mono">
                Order #{reorderConfirmOrder.order_number || (reorderConfirmOrder.$id || reorderConfirmOrder.id || '').substring(0, 6).toUpperCase()}
              </p>
            </div>

            <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
              <p>
                Are you sure you want to reactivate this order? It will be placed back into our shipping queue immediately.
              </p>
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 font-medium leading-relaxed">
                Please note: Once reactivated, this order cannot be cancelled again.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setReorderConfirmOrder(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-50 transition-all cursor-pointer text-neutral-700"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetOrd = reorderConfirmOrder;
                  setReorderConfirmOrder(null);
                  handleReorderOrder(targetOrd);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                Reactivate Order
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
