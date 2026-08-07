import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import productsService from '../../services/products';
import ordersService from '../../services/orders';
import campaignService from '../../services/campaign';
import { useToast } from '../../context/ToastContext';
import restockService from '../../services/restock';
import couponUsageService from '../../services/couponUsage';
import cartService from '../../services/cart';
import storageService from '../../services/storage';
import slidesService from '../../services/slides';
import offersService from '../../services/offers';
import walletService from '../../services/wallet';
import categoryService from '../../services/category';
import { FiFileText, FiPackage, FiTruck, FiMail, FiImage, FiActivity, FiLayers, FiTag, FiHome, FiTrendingUp, FiExternalLink, FiX, FiCheck, FiInfo, FiTrash2, FiPlus, FiEdit2, FiFolderPlus, FiMenu, FiSliders } from 'react-icons/fi';
import AdminAnalytics from '../pageComponets/AdminAnalytics';
import { sendWebhookNotification } from '../../utils/webhookHelper';


const TAG_OPTIONS = ['NEW DROP', 'BEST SELLER', 'FEW LEFT', 'LIMITED ITEM'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BACK_IMAGE_FIELDS = Array.from({ length: 8 }, (_, i) => `back_image_link_${i + 1}`);
const DEFAULT_CATEGORIES = [
  { value: 'printed-tshirt', label: 'PRINTED T-SHIRT' },
  { value: 'oversized-tshirt', label: 'OVERSIZED T-SHIRT' },
  { value: 'shirts', label: 'SHIRT' },
  { value: 'hoodies', label: 'HOODIES & SWEATSHIRTS' }
];

function AdminPanel() {
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();
  const location = useLocation();
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Tab Manager State
  const [activeTab, setActiveTab] = useState('analytics'); // analytics | products | orders | campaigns

  // Orders State (Fulfillment)
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('ALL');

  // Admin Order Cancellation Modal States
  const [isAdminCancelModalOpen, setIsAdminCancelModalOpen] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState(null);
  const [adminCancelReason, setAdminCancelReason] = useState('Out of Stock / Inventory Error');
  const [adminCancelCustomText, setAdminCancelCustomText] = useState('');

  // Admin Shipped Modal States
  const [isShippedModalOpen, setIsShippedModalOpen] = useState(false);
  const [shippedTargetOrder, setShippedTargetOrder] = useState(null);
  const [adminTrackingNumber, setAdminTrackingNumber] = useState('');
  const [adminTrackingUrl, setAdminTrackingUrl] = useState('');

  // Admin Return/Exchange Rejection Modal States
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetOrder, setRejectTargetOrder] = useState(null);
  const [rejectTargetItemIndex, setRejectTargetItemIndex] = useState(null);
  const [adminRejectReason, setAdminRejectReason] = useState('Product has visible wear / tags removed');
  const [adminRejectCustomText, setAdminRejectCustomText] = useState('');

  // Admin Return/Exchange Approval Modal States
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveTargetOrder, setApproveTargetOrder] = useState(null);
  const [approveTargetRequest, setApproveTargetRequest] = useState(null);
  const [adminApproveInstructions, setAdminApproveInstructions] = useState('Reverse Pickup Scheduled (Courier agent will collect the package in 24-48 hours. Please keep tags intact.)');
  const [adminApproveCustomText, setAdminApproveCustomText] = useState('');

  // Admin Search & Custom Dialog States
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isSweepProductModalOpen, setIsSweepProductModalOpen] = useState(false);
  const [sweepTargetProductId, setSweepTargetProductId] = useState(null);
  const [deleteTargetOrder, setDeleteTargetOrder] = useState(null);
  const [isDeleteOrderModalOpen, setIsDeleteOrderModalOpen] = useState(false);

  // Drops Manager Search & Filter States
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [productTagFilter, setProductTagFilter] = useState('ALL');
  const [productStockFilter, setProductStockFilter] = useState('ALL');
  const [productsSubTab, setProductsSubTab] = useState('list'); // 'list' or 'form'
  const [backImageCount, setBackImageCount] = useState(1);

  // Campaign State
  const [campaignPromoText, setCampaignPromoText] = useState('');
  const [campaignCoupons, setCampaignCoupons] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);
  const [newCouponMinOrderValue, setNewCouponMinOrderValue] = useState('');
  const [newCouponValidUntil, setNewCouponValidUntil] = useState('');
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);

  // Newsletter & Broadcaster State
  const [newsletterSubscribers, setNewsletterSubscribers] = useState([]);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [campaignHistory, setCampaignHistory] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastingProgress, setBroadcastingProgress] = useState(0);
  // Category-wise targeting
  const [broadcastTarget, setBroadcastTarget] = useState('subscribers'); // 'subscribers' | 'customers' | 'manual'
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [emailSearch, setEmailSearch] = useState('');

  const isEmailJSConfigured = Boolean(
    (import.meta.env.VITE_EMAILJS_SERVICE_ID || "").trim() &&
    (import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "").trim() &&
    (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "").trim()
  );

  // Store Database Telemetry States
  const [restockNotifications, setRestockNotifications] = useState([]);
  const [couponUsages, setCouponUsages] = useState([]);
  const [activeCarts, setActiveCarts] = useState([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);



  const [uploadingFields, setUploadingFields] = useState({});

  // Slides manager states
  const [slides, setSlides] = useState([]);
  const [slidesLoading, setSlidesLoading] = useState(false);
  const [slideImage, setSlideImage] = useState("");

  // Offers Management States
  const [offersList, setOffersList] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferQty, setNewOfferQty] = useState(3);
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [newOfferCategory, setNewOfferCategory] = useState('');
  const [newOfferTag, setNewOfferTag] = useState('');
  const [newOfferProductIds, setNewOfferProductIds] = useState([]);
  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [offerSearchQuery, setOfferSearchQuery] = useState('');
  const [slideMobileImage, setSlideMobileImage] = useState("");
  const [slideLink, setSlideLink] = useState("");
  const [slideUploading, setSlideUploading] = useState(false);

  // Category manager states
  const [categoryImages, setCategoryImages] = useState({});
  const [editingCategory, setEditingCategory] = useState(null); // value of category being edited
  const [editCategoryName, setEditCategoryName] = useState('');
  const [newCategoryImageUrls, setNewCategoryImageUrls] = useState({}); // { categoryValue: inputUrl }
  const [categoryUploading, setCategoryUploading] = useState({}); // { categoryValue: boolean }
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [deleteTargetCategory, setDeleteTargetCategory] = useState(null); // { value, label }
  const [deletedCategories, setDeletedCategories] = useState([]);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const configs = await categoryService.getCategoryConfigs();
        const images = {};
        const deleted = [];
        configs.forEach(config => {
          if (config.imageUrl) {
            images[config.category] = config.imageUrl;
          }
          if (config.isDeleted) {
            deleted.push(config.category);
          }
        });
        setCategoryImages(images);
        setDeletedCategories(deleted);
      } catch (err) {
        console.error("Failed to load category configs:", err);
      }
    };
    loadConfigs();
  }, []);

  const handleSaveCategoryImage = async (catValue, url) => {
    try {
      setActionLoading(true);
      await categoryService.saveCategoryImage(catValue, url);
      const updated = { ...categoryImages, [catValue]: url.trim() };
      setCategoryImages(updated);
      showToast("✓ Category cover image mapping updated!", "success");
    } catch (err) {
      console.error("Failed to save category image:", err);
      showToast("Failed to save category image.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCategoryImageUpload = async (e, catValue) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCategoryUploading(prev => ({ ...prev, [catValue]: true }));
    try {
      const response = await storageService.uploadFile(file);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        setNewCategoryImageUrls(prev => ({ ...prev, [catValue]: fileUrl }));
        // Auto save it
        await categoryService.saveCategoryImage(catValue, fileUrl);
        const updated = { ...categoryImages, [catValue]: fileUrl };
        setCategoryImages(updated);
        showToast("✓ Category cover uploaded and saved successfully!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Category image upload failed:", err);
      showToast("Firebase Storage upload failed.", "error");
    } finally {
      setCategoryUploading(prev => ({ ...prev, [catValue]: false }));
    }
  };

  const handleRenameCategory = async (oldSlug, newName) => {
    if (!newName.trim()) {
      showToast("Category name cannot be empty.", "error");
      return;
    }

    const newSlug = newName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!newSlug) {
      showToast("Invalid category name.", "error");
      return;
    }

    if (newSlug === oldSlug) {
      setEditingCategory(null);
      return;
    }

    setActionLoading(true);
    try {
      const targetProducts = products.filter(p => p.category === oldSlug);
      
      if (targetProducts.length === 0) {
        showToast("No products found under this category to rename.", "error");
        setEditingCategory(null);
        setActionLoading(false);
        return;
      }

      showToast(`Renaming category for ${targetProducts.length} products...`, "info");

      let successCount = 0;
      let errorCount = 0;

      for (const p of targetProducts) {
        try {
          await productsService.updateProduct(p.$id || p.id, { category: newSlug });
          successCount++;
        } catch (err) {
          console.error(`Failed to update product ${p.$id || p.id} category:`, err);
          errorCount++;
        }
      }

      // Update custom category image override mapping if it exists
      if (categoryImages[oldSlug]) {
        await categoryService.renameCategoryConfig(oldSlug, newSlug);
        const updatedImages = { ...categoryImages };
        updatedImages[newSlug] = updatedImages[oldSlug];
        delete updatedImages[oldSlug];
        setCategoryImages(updatedImages);
      }

      showToast(`✓ Category renamed! Success: ${successCount}, Failed: ${errorCount}`, "success");
      setEditingCategory(null);
      await loadProductCatalog();
    } catch (err) {
      console.error("Failed to rename category:", err);
      showToast("Failed to rename category.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTargetCategory) return;
    const { value: targetSlug, label } = deleteTargetCategory;

    setActionLoading(true);
    setIsDeleteCategoryModalOpen(false);

    try {
      const targetProducts = products.filter(p => p.category === targetSlug);

      if (targetProducts.length > 0) {
        showToast(`Clearing category for ${targetProducts.length} products...`, "info");
        let successCount = 0;
        let errorCount = 0;

        for (const p of targetProducts) {
          try {
            await productsService.updateProduct(p.$id || p.id, { category: "" });
            successCount++;
          } catch (err) {
            console.error(`Failed to clear category for product ${p.$id || p.id}:`, err);
            errorCount++;
          }
        }
        showToast(`✓ Category cleared from products! Success: ${successCount}, Failed: ${errorCount}`, "success");
      }

      // Clear cover image override from Firebase and set isDeleted = true
      await categoryService.deleteCategory(targetSlug);

      if (categoryImages[targetSlug]) {
        const updated = { ...categoryImages };
        delete updated[targetSlug];
        setCategoryImages(updated);
      }

      // Add targetSlug to deleted_categories in state
      const updatedDeleted = [...deletedCategories, targetSlug];
      setDeletedCategories(updatedDeleted);

      showToast(`✓ Category "${label}" deleted successfully!`, "success");
      setDeleteTargetCategory(null);
      await loadProductCatalog();
    } catch (err) {
      console.error("Failed to delete category:", err);
      showToast("Failed to delete category.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const getCategoryImagePreview = (catValue) => {
    if (categoryImages[catValue]) return categoryImages[catValue];
    
    if (catValue === 'printed-tshirt') return 'https://i.pinimg.com/736x/3b/e5/24/3be52487e4fcb982569c68fff31eae86.jpg';
    if (catValue === 'oversized-tshirt') return 'https://cdn1.ozone.ru/s3/multimedia-4/6643972660.jpg';
    if (catValue === 'shirts') return 'https://i.pinimg.com/originals/02/14/ef/0214efe3a76a76cbe65988be1e3315de.jpg';
    if (catValue === 'hoodies') return 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=150&q=80';
    
    const firstProd = products.find(p => p.category === catValue);
    return firstProd?.front_image_link || firstProd?.image_url || firstProd?.image || 'https://placehold.co/150x150?text=FITS';
  };

  const loadOffersList = async () => {
    try {
      setLoadingOffers(true);
      const res = await offersService.getOffers();
      setOffersList(res || []);
    } catch (err) {
      console.error("Failed to load offers:", err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleAddOffer = async () => {
    if (!newOfferName.trim()) {
      showToast("Offer Name is required.", "error");
      return;
    }
    if (!newOfferQty || Number(newOfferQty) <= 0) {
      showToast("Quantity must be greater than 0.", "error");
      return;
    }
    if (!newOfferPrice || Number(newOfferPrice) <= 0) {
      showToast("Price must be greater than 0.", "error");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        name: newOfferName.trim(),
        qty: Number(newOfferQty),
        price: Number(newOfferPrice),
        category: newOfferCategory,
        tag: newOfferTag.trim(),
        productIds: newOfferProductIds,
        is_active: true
      };

      if (isEditingOffer && editingOfferId) {
        await offersService.updateOffer(editingOfferId, payload);
        showToast("✓ Offer updated successfully!", "success");
      } else {
        await offersService.createOffer(payload);
        showToast("🚀 Offer created successfully!", "success");
      }

      // Reset form
      setNewOfferName('');
      setNewOfferQty(3);
      setNewOfferPrice('');
      setNewOfferCategory('');
      setNewOfferTag('');
      setNewOfferProductIds([]);
      setIsEditingOffer(false);
      setEditingOfferId(null);
      
      await loadOffersList();
    } catch (err) {
      console.error("Failed to save offer:", err);
      showToast("Failed to save offer.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEditOffer = (offer) => {
    setNewOfferName(offer.name);
    setNewOfferQty(offer.qty);
    setNewOfferPrice(offer.price);
    setNewOfferCategory(offer.category || '');
    setNewOfferTag(offer.tag || '');
    setNewOfferProductIds(offer.productIds || []);
    setEditingOfferId(offer.$id || offer.id);
    setIsEditingOffer(true);
  };

  const handleCancelEditOffer = () => {
    setNewOfferName('');
    setNewOfferQty(3);
    setNewOfferPrice('');
    setNewOfferCategory('');
    setNewOfferTag('');
    setNewOfferProductIds([]);
    setIsEditingOffer(false);
    setEditingOfferId(null);
  };

  const handleToggleOfferActive = async (offer) => {
    try {
      const newStatus = !offer.is_active;
      await offersService.updateOffer(offer.$id || offer.id, { is_active: newStatus });
      showToast(`✓ Offer ${newStatus ? 'activated' : 'deactivated'} successfully!`, "success");
      await loadOffersList();
    } catch (err) {
      console.error("Failed to toggle offer status:", err);
      showToast("Failed to update status.", "error");
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    setActionLoading(true);
    try {
      await offersService.deleteOffer(id);
      showToast("🗑️ Offer deleted successfully.", "success");
      await loadOffersList();
    } catch (err) {
      console.error("Failed to delete offer:", err);
      showToast("Failed to delete offer.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const loadSlides = async () => {
    try {
      setSlidesLoading(true);
      const response = await slidesService.getSlides();
      setSlides(response || []);
    } catch (err) {
      console.error("Failed to load slides:", err);
    } finally {
      setSlidesLoading(false);
    }
  };

  const handleSlideImageUpload = async (e, isMobile = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSlideUploading(true);
    try {
      const response = await storageService.uploadFile(file);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        if (isMobile) {
          setSlideMobileImage(fileUrl);
        } else {
          setSlideImage(fileUrl);
        }
        showToast("✓ Slide image uploaded successfully!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Slide image upload failed:", err);
      showToast("Firebase Storage upload failed.", "error");
    } finally {
      setSlideUploading(false);
    }
  };

  const handleAddSlide = async () => {
    if (!slideImage.trim()) {
      showToast("Desktop image is required.", "error");
      return;
    }

    setActionLoading(true);
    try {
      await slidesService.createSlide({
        image: slideImage.trim(),
        mobileImage: slideMobileImage.trim(),
        link: slideLink.trim()
      });
      showToast("🚀 Dynamic banner slide added successfully!", "success");
      setSlideImage("");
      setSlideMobileImage("");
      setSlideLink("");
      await loadSlides();
    } catch (err) {
      console.error("Failed to add slide:", err);
      showToast("Failed to add slide. Ensure collection exists.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSlide = async (id) => {
    setActionLoading(true);
    try {
      await slidesService.deleteSlide(id);
      showToast("🗑️ Banner slide deleted successfully.", "success");
      await loadSlides();
    } catch (err) {
      console.error("Failed to delete slide:", err);
      showToast("Failed to delete slide.", "error");
    } finally {
      setActionLoading(false);
    }
  };



  const [dragOverFields, setDragOverFields] = useState({});

  const handleDragOver = (e, fieldName) => {
    e.preventDefault();
    setDragOverFields(prev => ({ ...prev, [fieldName]: true }));
  };

  const handleDragLeave = (e, fieldName) => {
    e.preventDefault();
    setDragOverFields(prev => ({ ...prev, [fieldName]: false }));
  };

  const handleDrop = async (e, fieldName) => {
    e.preventDefault();
    setDragOverFields(prev => ({ ...prev, [fieldName]: false }));
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setUploadingFields(prev => ({ ...prev, [fieldName]: true }));
    try {
      const response = await storageService.uploadFile(file);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        setValue(fieldName, fileUrl, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        showToast("✓ Image uploaded successfully to Cloud Storage!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Product image drop upload failed:", err);
      showToast("Cloud Storage upload failed.", "error");
    } finally {
      setUploadingFields(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const renderImageUploader = (fieldName, labelText, requiredRule) => {
    const imgUrl = watch(fieldName);
    const isDragOver = dragOverFields[fieldName];
    const isUploading = uploadingFields[fieldName];

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">
          {labelText}
        </label>
        
        <div
          onDragOver={(e) => handleDragOver(e, fieldName)}
          onDragLeave={(e) => handleDragLeave(e, fieldName)}
          onDrop={(e) => handleDrop(e, fieldName)}
          onClick={() => {
            if (!imgUrl && !isUploading) {
              document.getElementById(`file-input-${fieldName}`).click();
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center transition-all min-h-[140px] text-center select-none ${
            imgUrl 
              ? 'border-emerald-500/40 bg-emerald-500/[0.02]' 
              : isDragOver
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]/20 scale-[0.99]'
                : 'border-[var(--color-border)] hover:border-neutral-450 bg-[var(--color-subtle)]/50 cursor-pointer'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-mono tracking-wider text-[var(--color-muted)] uppercase animate-pulse">Uploading...</span>
            </div>
          ) : imgUrl ? (
            <div className="relative w-full flex flex-col items-center gap-3">
              <div className="relative group w-20 h-24 rounded-lg overflow-hidden border border-[var(--color-border)] shadow-xs">
                <img src={imgUrl} alt="Product view" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setValue(fieldName, '', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }}
                  className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
                  title="Remove Image"
                >
                  <FiTrash2 className="text-sm" />
                </button>
              </div>
              <div className="w-full max-w-[240px] space-y-1">
                <p className="text-[9px] font-mono text-slate-400 truncate text-center px-2 bg-neutral-900/5 py-1 rounded">
                  {imgUrl}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById(`file-input-${fieldName}`).click();
                  }}
                  className="text-[9px] font-mono text-[var(--color-accent)] hover:underline block mx-auto uppercase tracking-wider font-bold"
                >
                  Change Image
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 cursor-pointer">
              <FiImage className="text-2xl text-[var(--color-muted)] animate-pulse" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-black tracking-widest text-[var(--color-text)] uppercase">
                  Drag & Drop Image here
                </p>
                <p className="text-[9px] text-[var(--color-muted)] uppercase font-medium">
                  or click to browse local files
                </p>
              </div>
            </div>
          )}
          
          <input
            id={`file-input-${fieldName}`}
            type="file"
            accept="image/*"
            onChange={(e) => handleProductImageUpload(e, fieldName)}
            disabled={actionLoading || isUploading}
            className="hidden"
          />
        </div>

        {/* Text input fallback so they can still paste direct URLs */}
        <div className="mt-1 flex items-center gap-1.5 bg-neutral-900/[0.02] p-1.5 rounded-lg border border-[var(--color-border)]/40">
          <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-wider pl-1.5">Or paste link:</span>
          <input
            type="text"
            disabled={actionLoading || isUploading}
            placeholder="PASTE IMAGE URL ADDRESS"
            className="flex-1 bg-transparent text-[11px] font-mono text-[var(--color-text)] outline-none"
            {...register(fieldName, requiredRule)}
          />
        </div>
        {errors[fieldName] && (
          <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider mt-1 block">
            {errors[fieldName].message}
          </span>
        )}
      </div>
    );
  };

  const handleProductImageUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFields(prev => ({ ...prev, [fieldName]: true }));
    try {
      const response = await storageService.uploadFile(file);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        setValue(fieldName, fileUrl, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        showToast("✓ Image uploaded successfully!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Product image upload failed:", err);
      showToast("Cloud Storage upload failed.", "error");
    } finally {
      setUploadingFields(prev => ({ ...prev, [fieldName]: false }));
    }
  };



  const loadStoreTelemetry = async () => {
    try {
      setTelemetryLoading(true);
      const restocks = await restockService.getRestockNotifications();
      const usages = await couponUsageService.getCouponUsages();
      const carts = await cartService.getAllCarts();
      setRestockNotifications(restocks || []);
      setCouponUsages(usages || []);
      setActiveCarts(carts || []);
    } catch (err) {
      console.error("Failed to load store database telemetry:", err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  // Load product catalog from Firebase
  const loadProductCatalog = async () => {
    try {
      const response = await productsService.getProducts();
      const structuredData = response?.documents || response || [];
      setProducts(structuredData);
    } catch (err) {
      console.error("Failed to fetch products from Firebase:", err.message);
    }
  };

  // Load customer orders from Firebase
  const loadCustomerOrders = async () => {
    try {
      const response = await ordersService.getOrders();
      setOrders(response || []);
    } catch (err) {
      console.error("Orders retrieval failed:", err.message);
    }
  };

  // Admin role validation — single env-var lookup, no hardcoded emails
  // ✅ FIX: Consistently check role/labels for admin access to support Firebase role assignment
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').replace(/['"]/g, '').trim();
  const hasAdminRole = user?.prefs?.role === 'admin';
  const hasAdminLabel = Array.isArray(user?.labels) && user.labels.includes('admin');
  const hasAdminEmail = adminEmail && user?.email === adminEmail;
  const isAdmin = isAuthenticated && user && (hasAdminRole || hasAdminLabel || hasAdminEmail);


  // Load active campaign announcements & coupons on mount
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAdmin) return;

    loadProductCatalog();
    loadCustomerOrders();
    loadSlides();
    loadOffersList();

    // Hydrate campaigns
    campaignService.getPromoText()
      .then(text => {
        if (text) setCampaignPromoText(text);
      })
      .catch(err => console.error("Failed to load promo text:", err));

    campaignService.getCoupons()
      .then(couponsList => {
        if (couponsList) setCampaignCoupons(couponsList);
      })
      .catch(err => console.error("Failed to load coupons:", err));

    campaignService.getNewsletterSubscribers()
      .then(subs => {
        if (subs) setNewsletterSubscribers(subs);
      })
      .catch(err => console.error("Failed to load subscribers:", err));

    campaignService.getCampaignHistory()
      .then(hist => {
        if (hist) setCampaignHistory(hist);
      })
      .catch(err => console.error("Failed to load campaign history:", err));
  }, [isAdmin]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const onSubmit = async (data) => {
    if (data.is_featured) {
      const featuredCount = products.filter(p => 
        (p.is_featured === true || p.is_featured === 'true' || p.is_featured === 1 || p.is_featured === '1') &&
        (p.$id !== editingId && p.id !== editingId)
      ).length;

      if (featuredCount >= 4) {
        showToast("⚠️ Limit Exceeded: Maximum of 4 featured products are allowed on the homepage. Please un-feature another product first.", "error");
        return;
      }
    }

    setActionLoading(true);

    const searchKeywords = data.search_keywords
      ? data.search_keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];
    const backImageLinks = BACK_IMAGE_FIELDS
      .map((fieldName) => data[fieldName]?.trim())
      .filter(Boolean);

    // Build size-wise stock map
    const stockMap = {};
    const selectedSizes = [];
    SIZE_OPTIONS.forEach(size => {
      const stockInput = data[`stock_${size}`];
      if (stockInput !== undefined && stockInput !== '') {
        const stockVal = Number(stockInput || 0);
        stockMap[size] = stockVal;
        selectedSizes.push(size);
      }
    });

    // Assign simple colorName and colorHex fields
    const finalColorName = data.color_name?.trim() || "";
    const finalColorHex = data.color_hex?.trim() || "";

    // Helper to format/slugify custom category
    const slugifyCategory = (cat) => {
      return (cat || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    };

    // Format product database payload
    const productPayload = {
      name: data.name.trim(),
      price: String(data.price).trim(),
      tags: searchKeywords,
      category: slugifyCategory(data.category),
      front_image_link: data.front_image_link.trim(),
      description: data.description?.trim() || "",
      return_policy: data.return_policy || "7 Day Return",
      sizes: selectedSizes,
      back_image_links: backImageLinks,
      sizes_stock: JSON.stringify(stockMap), // Stringified stock mapping
      tag: data.single_tag?.trim() || "",
      discount_percent: Number(data.discount_percent || 0),
      color_group_id: data.color_group_id?.trim() || "",
      color_name: finalColorName,
      color_hex: finalColorHex,
      fit_type: data.fit_type?.trim() || "",
      fabric_gsm: data.fabric_gsm?.trim() || "",
      compare_at_price: data.compare_at_price ? Number(data.compare_at_price) : 0,
      is_featured: !!data.is_featured,
      is_vip_only: !!data.is_vip_only,
      is_live: !!data.is_live,
      slug: data.slug?.trim() || data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ""
    };

    const updateHelper = async (id, payload) => {
      try {
        return await productsService.updateProduct(id, payload);
      } catch (err) {
        if (
          err.message?.toLowerCase().includes("attribute") ||
          err.message?.toLowerCase().includes("not found") ||
          err.message?.toLowerCase().includes("structure") ||
          err.code === 400 ||
          err.status === 400
        ) {
          console.warn("Schema mismatch. Retrying with basic fields.");
          const stripped = { ...payload };
          delete stripped.sizes_stock;
          delete stripped.compare_at_price;
          delete stripped.is_featured;
          delete stripped.is_vip_only;
          delete stripped.slug;
          delete stripped.return_policy;
          delete stripped.is_live;
          return await productsService.updateProduct(id, stripped);
        }
        throw err;
      }
    };

    const createHelper = async (payload) => {
      try {
        return await productsService.createProduct(payload);
      } catch (err) {
        if (
          err.message?.toLowerCase().includes("attribute") ||
          err.message?.toLowerCase().includes("not found") ||
          err.message?.toLowerCase().includes("structure") ||
          err.code === 400 ||
          err.status === 400
        ) {
          console.warn("Schema mismatch. Retrying with basic fields.");
          const stripped = { ...payload };
          delete stripped.sizes_stock;
          delete stripped.compare_at_price;
          delete stripped.is_featured;
          delete stripped.is_vip_only;
          delete stripped.slug;
          delete stripped.return_policy;
          delete stripped.is_live;
          return await productsService.createProduct(stripped);
        }
        throw err;
      }
    };

    try {
      if (editingId) {
        await updateHelper(editingId, productPayload);
        showToast('🔥 Drop variations updated in cloud servers successfully!', 'success');
      } else {
        await createHelper(productPayload);
        showToast('⚡ Fresh Vakrayan Drop Deployed Globally!', 'success');
      }
    } catch (cloudError) {
      console.error("Firebase product write failed:", cloudError.message);
      showToast("Failed to save product. Check Firebase connection.", "error");
    } finally {
      // Clear form
      reset();
      SIZE_OPTIONS.forEach(size => {
        setValue(`stock_${size}`, '');
      });
      setValue('compare_at_price', '');
      setValue('is_featured', false);
      setValue('is_vip_only', false);
      setValue('is_live', false);
      setValue('slug', '');
      setValue('return_policy', '7 Day Return');
      setBackImageCount(1);
      setEditingId(null);
      setIsCustomCategory(false);
      setProductsSubTab('list');
      setActionLoading(false);
      await loadProductCatalog(); // Refresh catalog view
    }
  };

  const handleEdit = useCallback((id) => {
    const product = products.find(p => p.id === id || p.$id === id);
    if (product) {
      setIsCustomCategory(false);
      setValue('name', product.name);
      
      const numericPrice = typeof product.price === 'string'
        ? Number(product.price.replace(/[^0-9]/g, ''))
        : product.price;
      setValue('price', numericPrice || '');
      
      const tagsArray = Array.isArray(product.tags) ? product.tags : [];
      setValue('search_keywords', tagsArray.join(', '));
      setValue('category', product.category);
      setValue('front_image_link', product.front_image_link || product.image_url || product.image || '');
      const rawDesc = product.description || '';
      const rpMatch = rawDesc.match(/\[RETURN_POLICY\]:\s*(.+)/);
      const returnPolicy = product.return_policy || (rpMatch ? rpMatch[1].trim() : '7 Day Return');
      const cleanDesc = rawDesc.replace(/\[RETURN_POLICY\]:\s*(.+)/, '').trim();

      setValue('description', cleanDesc);
      setValue('return_policy', returnPolicy);
      
      // Hydrate Stocks
      let parsedStock = {};
      try {
        parsedStock = JSON.parse(product.sizes_stock || '{}');
      } catch {
        parsedStock = {};
      }

      SIZE_OPTIONS.forEach(size => {
        const isOffered = product.sizes?.includes(size);
        setValue(
          `stock_${size}`,
          parsedStock[size] !== undefined 
            ? parsedStock[size] 
            : (isOffered ? 10 : '')
        );
      });

      const backImageLinks = Array.isArray(product.back_image_links)
        ? product.back_image_links
        : [product.back_image_link].filter(Boolean);

      setBackImageCount(Math.max(1, backImageLinks.length));

      BACK_IMAGE_FIELDS.forEach((fieldName, index) => {
        setValue(fieldName, backImageLinks[index] || '');
      });
      setValue('single_tag', product.tag || '');
      setValue('discount_percent', product.discount_percent || 0);
      setValue('color_group_id', product.color_group_id || '');

      setValue('color_name', product.color_name || '');
      setValue('color_hex', product.color_hex || '');

      setValue('fit_type', product.fit_type || '');
      setValue('fabric_gsm', product.fabric_gsm || '');
      setValue('compare_at_price', product.compare_at_price || '');
      setValue('is_featured', product.is_featured === true || product.is_featured === 'true' || product.is_featured === 1 || product.is_featured === '1');
      setValue('is_vip_only', product.is_vip_only === true || product.is_vip_only === 'true' || product.is_vip_only === 1 || product.is_vip_only === '1');
      setValue('is_live', product.is_live === true || product.is_live === 'true' || product.is_live === 1 || product.is_live === '1');
      setValue('slug', product.slug || '');
      setEditingId(id);
      setProductsSubTab('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [products, setValue]);

  useEffect(() => {
    if (isAdmin && products.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      const editIdFromQuery = searchParams.get('edit');
      const targetEditId = location.state?.editProductId || editIdFromQuery;
      
      if (targetEditId) {
        const found = products.find(p => p.id === targetEditId || p.$id === targetEditId);
        if (found) {
          setTimeout(() => {
            setActiveTab('products');
            handleEdit(targetEditId);
          }, 0);
          
          // Clean up location state and URL query parameter to prevent loop/stale edit state
          window.history.replaceState({}, document.title);
        }
      }
    }
  }, [location, products, isAdmin, handleEdit]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleCancelEdit = () => {
    reset();
    SIZE_OPTIONS.forEach(size => {
      setValue(`stock_${size}`, '');
    });
    setValue('search_keywords', '');
    setValue('single_tag', '');
    setValue('discount_percent', '');
    setValue('color_group_id', '');
    setValue('color_name', '');
    setValue('color_hex', '');
    setValue('fit_type', '');
    setValue('fabric_gsm', '');
    setValue('compare_at_price', '');
    setValue('is_featured', false);
    setValue('is_vip_only', false);
    setValue('is_live', false);
    setValue('slug', '');
    setValue('color_hex', '');
    setValue('fit_type', '');
    setValue('fabric_gsm', '');
    setValue('return_policy', '7 Day Return');
    setBackImageCount(1);
    setEditingId(null);
    setIsCustomCategory(false);
    setProductsSubTab('list');
  };

  const handleRemoveProductItem = async (targetId) => {
    setSweepTargetProductId(targetId);
    setIsSweepProductModalOpen(true);
  };

  const confirmSweepProductItem = async () => {
    if (!sweepTargetProductId) return;
    setIsSweepProductModalOpen(false);
    try {
      await productsService.deleteProduct(sweepTargetProductId);
      showToast('🗑️ Live Drop Revoked From Firebase Repository Pool!', 'success');
    } catch (err) {
      console.error("Failed to delete product:", err.message);
      showToast("Failed to delete product. Check Firebase connection.", "error");
    } finally {
      setSweepTargetProductId(null);
      await loadProductCatalog();
    }
  };

  const handleToggleLiveStatus = async (productId, currentIsLive) => {
    setActionLoading(true);
    try {
      await productsService.updateProduct(productId, { is_live: !currentIsLive });
      showToast(`Product ${!currentIsLive ? 'published Live' : 'saved to Draft'} successfully!`, 'success');
      await loadProductCatalog();
    } catch (err) {
      console.error("Failed to toggle live status:", err);
      showToast("Failed to update status. Check Firebase connection.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveOrder = (order) => {
    setDeleteTargetOrder(order);
    setIsDeleteOrderModalOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteTargetOrder) return;
    const orderId = deleteTargetOrder.$id || deleteTargetOrder.id;
    setIsDeleteOrderModalOpen(false);
    setActionLoading(true);
    try {
      await ordersService.deleteOrder(orderId);
      showToast('🗑️ Order records purged from database!', 'success');
    } catch (err) {
      console.error("Failed to delete order:", err.message);
      showToast("Failed to delete order. Check Firebase connection.", "error");
    } finally {
      setDeleteTargetOrder(null);
      setActionLoading(false);
      loadCustomerOrders();
    }
  };

  const handleExportOrdersToCSV = () => {
    if (orders.length === 0) {
      showToast("No orders available to export.", "error");
      return;
    }

    const headers = [
      "Order Number",
      "Customer Name",
      "Email Address",
      "Contact Phone",
      "Total Amount (INR)",
      "Order Status",
      "Fulfillment Address",
      "Garments Checked Out",
      "Timestamp"
    ];

    const csvRows = [headers.join(",")];

    orders.forEach(order => {
      let parsedItems;
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
      } catch (err) {
        console.warn("CSV items parsing failed:", err.message);
        parsedItems = [];
      }

      let parsedAddr = order.address || '';
      try {
        const addrJSON = JSON.parse(order.address);
        if (addrJSON && typeof addrJSON === 'object') {
          parsedAddr = addrJSON.customerAddress || order.address;
        }
      } catch {
        parsedAddr = order.address || '';
      }

      const orderNumber = order.order_number || order.$id?.substring(0, 12).toUpperCase();
      const garmentsList = parsedItems.map(i => `${i.name} (Size: ${i.size || 'M'}, Qty: ${i.quantity})`).join(" | ");
      const orderDate = new Date(order.$createdAt || order.createdAt || '1970-01-01').toLocaleString('en-IN');

      const values = [
        `"${String(orderNumber).replace(/"/g, '""')}"`,
        `"${String(order.customerName || '').replace(/"/g, '""')}"`,
        `"${String(order.email || '').replace(/"/g, '""')}"`,
        `"${String(order.phone || '').replace(/"/g, '""')}"`,
        `"${order.total || 0}"`,
        `"${order.status || 'PENDING'}"`,
        `"${String(parsedAddr).replace(/"/g, '""')}"`,
        `"${String(garmentsList).replace(/"/g, '""')}"`,
        `"${orderDate}"`
      ];

      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vakrayan_orders_manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("✅ Shipping manifest CSV generated and downloaded!", "success");
  };

  const getFilteredOrders = () => {
    return orders.filter(order => {
      const status = order.status || 'PENDING';
      if (orderFilter !== 'ALL' && status !== orderFilter) return false;
      
      if (orderSearchQuery.trim()) {
        const query = orderSearchQuery.toLowerCase().trim();
        const uniqueId = order.$id || order.id || '';
        let orderNumber = order.order_number || '';
        try {
          const parsed = JSON.parse(order.address);
          if (parsed && typeof parsed === 'object' && parsed.metadata && parsed.metadata.order_number) {
            orderNumber = parsed.metadata.order_number;
          }
        } catch (err) {
          console.warn("JSON address parsing failed for search:", err.message);
        }
        const customerName = order.customerName || '';
        const email = order.email || '';
        
        return uniqueId.toLowerCase().includes(query) ||
               orderNumber.toLowerCase().includes(query) ||
               customerName.toLowerCase().includes(query) ||
               email.toLowerCase().includes(query);
      }
      
      return true;
    });
  };

  const handlePrintShippingLabels = () => {
    const filtered = getFilteredOrders();
    if (filtered.length === 0) {
      showToast("No orders available to print.", "error");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Pop-up blocker is preventing shipping slips from opening.", "error");
      return;
    }

    const labelsHtml = filtered.map(order => {
      let addressText = order.address || '';
      let metadata = {
        order_number: order.order_number || `ORD-${new Date(order.$createdAt || '2026-01-01').getFullYear()}-${order.$id?.substring(0, 6).toUpperCase() || 'UNKNOWN'}`,
        customer_name: order.customerName || 'Customer',
        customer_phone: order.phone || '',
        customer_email: order.email || ''
      };

      try {
        const parsed = JSON.parse(order.address);
        if (parsed && typeof parsed === 'object' && 'customerAddress' in parsed) {
          let rawAddr = parsed.customerAddress;
          if (typeof rawAddr === 'string' && rawAddr.trim().startsWith('{')) {
            try {
              const innerParsed = JSON.parse(rawAddr);
              if (innerParsed && typeof innerParsed === 'object') {
                const line = innerParsed.line || '';
                const city = innerParsed.city || '';
                const state = innerParsed.state || '';
                const pincode = innerParsed.pincode || '';
                const country = innerParsed.country || 'India';
                rawAddr = [line, city, state, pincode, country].filter(Boolean).join(', ');
              }
            } catch (innerErr) {
              console.warn("Could not parse nested customer address:", innerErr.message);
            }
          }
          addressText = rawAddr;
          if (parsed.metadata) {
            metadata = { ...metadata, ...parsed.metadata };
          }
        }
      } catch (outerErr) {
        console.warn("Could not parse order address or metadata JSON:", outerErr.message);
      }

      if (typeof addressText === 'string') {
        addressText = addressText.replace(/\[Payment:\s*\w+\]/i, '').trim();
        if (addressText.endsWith(',')) {
          addressText = addressText.slice(0, -1).trim();
        }
      }

      let parsedItems;
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
      } catch {
        parsedItems = [];
      }

      // Group identical products by name and size to ensure correct quantities per size
      const groupedItemsMap = {};
      parsedItems.forEach(item => {
        const name = (item.name || '').trim();
        const sizeStr = (item.size || 'M').trim();
        const key = `${name.toLowerCase()}||${sizeStr.toLowerCase()}`;
        if (!name) return;

        if (!groupedItemsMap[key]) {
          groupedItemsMap[key] = {
            name: name,
            size: sizeStr,
            quantity: 0
          };
        }
        groupedItemsMap[key].quantity += Number(item.quantity || 0);
      });

      const itemsListHtml = Object.values(groupedItemsMap).map(item => {
        return `
          <div style="font-size: 11px; font-weight: bold; border-bottom: 1px dashed #ddd; padding: 4px 0; display: flex; justify-content: space-between;">
            <span>${item.name.toUpperCase()} (${item.size.toUpperCase()})</span>
            <span>QTY: ${item.quantity}</span>
          </div>
        `;
      }).join('');

      const isCod = order.paymentMethod === 'COD' || (!order.paymentMethod && !order.address?.includes('[Payment: ONLINE]'));
      const paymentType = isCod ? 'COD' : 'PREPAID';

      const codInstructionHtml = isCod
        ? `<div style="border: 2px solid #000; padding: 6px; text-align: center; font-weight: 900; font-size: 14px; margin-top: 10px; background-color: #000; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">
             COLLECT CASH: ₹${Number(order.total).toLocaleString('en-IN')}
           </div>`
        : `<div style="border: 2px solid #000; padding: 6px; text-align: center; font-weight: 900; font-size: 11px; margin-top: 10px; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">
             PREPAID - DO NOT COLLECT CASH
           </div>`;

      const orderDate = order.$createdAt || order.createdAt || new Date().toISOString();

      return `
        <div class="label-card">
          <div class="header">
            <div class="store-name">VAKRAYAN</div>
            <div class="carrier">${paymentType}</div>
          </div>
          
          <div class="barcode-area">
            <div class="order-num"># ${metadata.order_number}</div>
            <div style="font-size: 9px; font-family: monospace; color: #666; margin-top: 2px;">ID: ${order.$id || order.id}</div>
          </div>

          <div class="address-section">
            <div class="section-title">SHIP TO:</div>
            <div class="customer-name">${metadata.customer_name.toUpperCase()}</div>
            <div class="address-text">${addressText.toUpperCase()}</div>
            <div class="phone-text">PHONE: ${metadata.customer_phone || 'N/A'}</div>
          </div>

          <div class="items-section">
            <div class="section-title">PACKAGE CONTENT:</div>
            ${itemsListHtml}
          </div>

          ${codInstructionHtml}

          <div class="footer">
            <div>DATE: ${new Date(orderDate).toLocaleDateString('en-IN')}</div>
            <div style="font-weight: bold;">TOTAL: ₹${Number(order.total).toLocaleString('en-IN')}</div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Shipping Slips - Bulk Print</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6; }
            .label-card {
              background-color: #fff;
              width: 380px;
              min-height: 480px;
              border: 2px solid #000;
              margin: 0 auto 30px auto;
              padding: 15px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
              break-inside: avoid;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .store-name {
              font-size: 20px;
              font-weight: 950;
              letter-spacing: 1.5px;
            }
            .carrier {
              font-size: 11px;
              font-weight: 900;
              background-color: #000;
              color: #fff;
              padding: 3px 8px;
              letter-spacing: 1px;
            }
            .barcode-area {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .order-num {
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 1px;
            }
            .address-section {
              border-bottom: 2px solid #000;
              padding-bottom: 12px;
              margin-bottom: 10px;
              flex-grow: 1;
            }
            .section-title {
              font-size: 9px;
              font-weight: 900;
              color: #555;
              letter-spacing: 1px;
              margin-bottom: 5px;
            }
            .customer-name {
              font-size: 14px;
              font-weight: 900;
              margin-bottom: 4px;
            }
            .address-text {
              font-size: 11px;
              font-weight: 700;
              line-height: 1.4;
              color: #111;
            }
            .phone-text {
              font-size: 11px;
              font-weight: 900;
              margin-top: 6px;
              font-family: monospace;
            }
            .items-section {
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
              max-height: 180px;
              overflow: hidden;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              font-weight: bold;
              font-family: monospace;
            }
            @media print {
              body { background-color: #fff; padding: 0; margin: 0; }
              .label-card { margin: 0 auto; border: 2px solid #000; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Orders Fulfillment Operations
  const handleOrderStatusShift = async (order, targetStatus, providedExtraData = {}) => {
    const orderId = order.$id || order.id;
    const previousStatus = order.status || 'PENDING';
    
    if (previousStatus === targetStatus) return; // No change

    let extraData = { ...providedExtraData };
    if (targetStatus === 'DELIVERED') {
      extraData.paymentStatus = 'PAID';
      extraData.payment_status = 'PAID';
    }

    setActionLoading(true);
    try {
      // 1. Handle stock restoration or depletion if transition involves CANCELLED
      if (previousStatus !== 'CANCELLED' && targetStatus === 'CANCELLED') {
        // Transition TO CANCELLED -> Restore stock
        let items = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
        } catch {
          items = [];
        }
        for (const item of items) {
          if (item.product_id) {
            try {
              const liveProduct = await productsService.getProductById(item.product_id);
              if (liveProduct) {
                let stocks = {};
                try {
                  stocks = JSON.parse(liveProduct.sizes_stock || '{}');
                } catch {
                  stocks = {};
                }
                const baseSize = item.size ? String(item.size).split('/')[0].trim() : 'M';
                const currentStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
                stocks[baseSize] = currentStock + Number(item.quantity);
                
                await productsService.updateProduct(item.product_id, {
                  sizes_stock: JSON.stringify(stocks)
                });
              }
            } catch (err) {
              console.error(`Failed to restore stock for product ${item.product_id}:`, err.message);
            }
          }
        }
      } else if (previousStatus === 'CANCELLED' && targetStatus !== 'CANCELLED') {
        // Transition FROM CANCELLED to active status -> Deplete stock
        let items = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
        } catch {
          items = [];
        }
        for (const item of items) {
          if (item.product_id) {
            try {
              const liveProduct = await productsService.getProductById(item.product_id);
              if (liveProduct) {
                let stocks = {};
                try {
                  stocks = JSON.parse(liveProduct.sizes_stock || '{}');
                } catch {
                  stocks = {};
                }
                const baseSize = item.size ? String(item.size).split('/')[0].trim() : 'M';
                const currentStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
                stocks[baseSize] = Math.max(0, currentStock - Number(item.quantity));
                
                await productsService.updateProduct(item.product_id, {
                  sizes_stock: JSON.stringify(stocks)
                });
              }
            } catch (err) {
              console.error(`Failed to deplete stock for product ${item.product_id}:`, err.message);
            }
          }
        }
      }

      // 2. Perform status change
      await ordersService.updateOrderStatus(orderId, targetStatus, extraData);

      // If cancelling or returning, credit back to user wallet
      if (
        (targetStatus === 'CANCELLED' && (order.paymentMethod === 'ONLINE' || order.paymentMethod === 'WALLET')) ||
        (targetStatus === 'RETURNED')
      ) {
        let orderNumber = order.order_number;
        try {
          const parsed = JSON.parse(order.address);
          if (parsed?.metadata?.order_number) orderNumber = parsed.metadata.order_number;
        } catch {
          // ignore parsing error
        }
        orderNumber = orderNumber || order.$id?.substring(0, 8).toUpperCase();

        try {
          await walletService.createWalletTransaction({
            userId: order.userId,
            amount: order.total,
            type: 'credit',
            title: targetStatus === 'RETURNED' ? `Refund for Returned Order ${orderNumber}` : `Refund for Order ${orderNumber}`,
            referenceId: orderId
          });
        } catch (walletErr) {
          console.error("Failed to write credit wallet transaction on admin action:", walletErr.message);
        }
      }

      // Send Telegram notification if order status changed to CANCELLED
      if (targetStatus === 'CANCELLED') {
        let rawItems = [];
        try { rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []; } catch { rawItems = []; }
        sendWebhookNotification('order.cancelled', {
          orderId: order.$id || order.id,
          orderNumber: order.order_number || 'ORDER',
          customerName: order.name || order.customerName || 'Customer',
          email: order.email || '',
          total: Math.round(order.total || 0),
          reason: extraData?.cancel_reason || 'Cancelled by Store Admin',
          items: rawItems
        });
      }

      showToast(`✅ Order status transitioned to ${targetStatus}!`, 'success');
      await loadProductCatalog(); // Update active catalog stock display
    } catch (err) {
      console.error("Status update failed:", err.message);
      showToast(`Failed to update order status. Check Firebase connection.`, "error");
    } finally {
      setActionLoading(false);
      loadCustomerOrders();
    }
  };

  const submitAdminCancelOrder = async () => {
    if (!cancelTargetOrder) return;
    
    let finalReason = adminCancelReason;
    if (adminCancelReason === "Other") {
      finalReason = adminCancelCustomText.trim() || "Cancelled by Admin";
    } else if (adminCancelCustomText.trim()) {
      finalReason = `${adminCancelReason} - ${adminCancelCustomText.trim()}`;
    }

    setIsAdminCancelModalOpen(false);
    await handleOrderStatusShift(cancelTargetOrder, 'CANCELLED', { 
      cancel_reason: finalReason,
      cancelled_by: 'admin'
    });
    setCancelTargetOrder(null);
  };

  const submitAdminShippedOrder = async () => {
    if (!shippedTargetOrder) return;
    if (!adminTrackingNumber.trim()) {
      showToast("Tracking number is required to dispatch shipment.", "error");
      return;
    }

    const trackingNum = adminTrackingNumber.trim();
    const trackingUrl = adminTrackingUrl.trim() || `https://track.delhivery.com/query?id=${trackingNum}`;

    setIsShippedModalOpen(false);
    await handleOrderStatusShift(shippedTargetOrder, 'SHIPPED', {
      tracking_number: trackingNum,
      tracking_url: trackingUrl
    });
    setShippedTargetOrder(null);
  };

  const handleApproveReturnExchange = async (order, requestItem, instructions = "") => {
    setActionLoading(true);
    try {
      let liveProduct = null;
      if (requestItem.productId) {
        liveProduct = await productsService.getProductById(requestItem.productId);
      }
      
      let stocks = {};
      if (liveProduct) {
        try {
          stocks = JSON.parse(liveProduct.sizes_stock || '{}');
        } catch {
          stocks = {};
        }
      }
      
      if (requestItem.type === 'EXCHANGE') {
        const targetSize = requestItem.exchangeTargetSize;
        const currentTargetStock = stocks[targetSize] !== undefined ? Number(stocks[targetSize]) : 0;
        if (currentTargetStock <= 0) {
          showToast(`Cannot approve exchange. Desired size ${targetSize} is out of stock!`, 'error');
          setActionLoading(false);
          return;
        }
        
        const originalSize = requestItem.originalSize;
        if (stocks[originalSize] !== undefined) {
          stocks[originalSize] = stocks[originalSize] + 1;
        } else {
          stocks[originalSize] = 1;
        }
        stocks[targetSize] = Math.max(0, currentTargetStock - 1);
        
        await productsService.updateProduct(requestItem.productId, {
          sizes_stock: JSON.stringify(stocks)
        });
      } else if (requestItem.type === 'RETURN') {
        const originalSize = requestItem.originalSize;
        if (stocks[originalSize] !== undefined) {
          stocks[originalSize] = stocks[originalSize] + 1;
        } else {
          stocks[originalSize] = 1;
        }
        
        await productsService.updateProduct(requestItem.productId, {
          sizes_stock: JSON.stringify(stocks)
        });
      }
      
      let parsedAddr = {};
      try {
        parsedAddr = JSON.parse(order.address);
      } catch {
        parsedAddr = {};
      }
      
      let currentRequests = parsedAddr.metadata?.return_requests || [];
      currentRequests = currentRequests.map(r => {
        if (r.itemIndex === requestItem.itemIndex) {
          return { 
            ...r, 
            status: 'APPROVED', 
            adminComment: instructions,
            updatedAt: new Date().toISOString() 
          };
        }
        return r;
      });
      
      const nextStatus = requestItem.type === 'RETURN' ? 'RETURNED' : 'EXCHANGED';
      
      await ordersService.updateOrderStatus(order.$id || order.id, nextStatus, {
        return_requests: currentRequests
      });
      
      showToast(`✅ Request Approved! Order status transitioned to ${nextStatus}.`, 'success');
      await loadProductCatalog();
      loadCustomerOrders();
    } catch (err) {
      console.error("Failed to approve request:", err);
      showToast("Verification server timed out. Check connection.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const submitAdminApproveRequest = async () => {
    if (!approveTargetOrder || !approveTargetRequest) return;
    
    let finalInstructions = adminApproveInstructions;
    if (adminApproveInstructions === "Other") {
      finalInstructions = adminApproveCustomText.trim() || "Approved by Admin";
    } else if (adminApproveCustomText.trim()) {
      finalInstructions = `${adminApproveInstructions} - ${adminApproveCustomText.trim()}`;
    }
    
    setIsApproveModalOpen(false);
    await handleApproveReturnExchange(approveTargetOrder, approveTargetRequest, finalInstructions);
    setApproveTargetOrder(null);
    setApproveTargetRequest(null);
  };

  const submitAdminRejectRequest = async () => {
    if (!rejectTargetOrder || rejectTargetItemIndex === null) return;
    
    let finalReason = adminRejectReason;
    if (adminRejectReason === "Other") {
      finalReason = adminRejectCustomText.trim() || "Rejected by Admin";
    } else if (adminRejectCustomText.trim()) {
      finalReason = `${adminRejectReason} - ${adminRejectCustomText.trim()}`;
    }
    
    setIsRejectModalOpen(false);
    setActionLoading(true);
    try {
      let parsedAddr = {};
      try {
        parsedAddr = JSON.parse(rejectTargetOrder.address);
      } catch {
        parsedAddr = {};
      }
      
      let currentRequests = parsedAddr.metadata?.return_requests || [];
      currentRequests = currentRequests.map(r => {
        if (r.itemIndex === rejectTargetItemIndex) {
          return { 
            ...r, 
            status: 'REJECTED', 
            adminComment: finalReason,
            updatedAt: new Date().toISOString() 
          };
        }
        return r;
      });
      
      await ordersService.updateOrderStatus(rejectTargetOrder.$id || rejectTargetOrder.id, 'DELIVERED', {
        return_requests: currentRequests
      });
      
      showToast("❌ Request Rejected. Order status reverted to DELIVERED.", "success");
      loadCustomerOrders();
    } catch (err) {
      console.error("Failed to reject request:", err);
      showToast("Failed to record request rejection.", "error");
    } finally {
      setActionLoading(false);
      setRejectTargetOrder(null);
      setRejectTargetItemIndex(null);
    }
  };

  // Campaign & Coupons Operations
  const saveCampaignPromoText = async () => {
    try {
      await campaignService.savePromoText(campaignPromoText);
      showToast('📢 Announcement Marquee updated dynamically!', 'success');
    } catch (err) {
      console.error("Failed to update announcement:", err);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignSubject.trim()) {
      showToast("Please enter a campaign subject.", "error");
      return;
    }
    if (!campaignBody.trim()) {
      showToast("Please write a campaign message.", "error");
      return;
    }

    // Determine recipients based on broadcastTarget
    let recipientList = [];
    if (broadcastTarget === 'subscribers') {
      const subs = await campaignService.getNewsletterSubscribers();
      recipientList = subs.map(s => ({ email: s.email, name: s.name || s.email }));
    } else if (broadcastTarget === 'customers') {
      // Unique emails from orders
      const seen = new Set();
      orders.forEach(o => {
        const email = o.userEmail || o.email || o.user?.email;
        if (email && !seen.has(email)) { seen.add(email); recipientList.push({ email, name: o.userName || o.name || email }); }
      });
      // Also include subscribers in customers mode
      const subs = await campaignService.getNewsletterSubscribers();
      subs.forEach(s => { if (!seen.has(s.email)) { seen.add(s.email); recipientList.push({ email: s.email, name: s.name || s.email }); } });
    } else if (broadcastTarget === 'manual') {
      recipientList = Array.from(selectedEmails).map(email => ({ email, name: email }));
    }

    const total = recipientList.length;
    if (total === 0) {
      showToast('No recipients selected. Please select at least one email.', 'error');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastingProgress(0);

    const subjectText = campaignSubject.trim();
    const bodyText = campaignBody.trim();

    if (isEmailJSConfigured) {
      let successCount = 0;
      let failCount = 0;

      // Send actual emails sequentially and update progress
      for (let i = 0; i < total; i++) {
        const recipient = recipientList[i];
        const emailAddress = recipient.email;
        try {
          await campaignService.sendEmailViaEmailJS(emailAddress, subjectText, bodyText);
          successCount++;
        } catch (error) {
          console.error(`Failed to send email to ${emailAddress}:`, error);
          failCount++;
        }
        setBroadcastingProgress(i + 1);
      }

      try {
        await campaignService.sendCampaign(subjectText, bodyText, total);
        const updatedHistory = await campaignService.getCampaignHistory();
        setCampaignHistory(updatedHistory);

        if (failCount === 0) {
          showToast(`🚀 Campaign sent successfully to all ${successCount} subscribers!`, "success");
        } else {
          showToast(`🚀 Campaign sent. Succeeded: ${successCount}, Failed: ${failCount}.`, failCount === total ? "error" : "warning");
        }
        setCampaignSubject('');
        setCampaignBody('');
      } catch (err) {
        console.error("Failed to save campaign history:", err);
        showToast("Failed to save campaign history.", "error");
      } finally {
        setIsBroadcasting(false);
      }
    } else {
      // Simulation Mode
      let sentCount = 0;
      const interval = setInterval(async () => {
        sentCount += Math.ceil(total / 5);
        if (sentCount >= total) {
          sentCount = total;
          clearInterval(interval);
          
          try {
            await campaignService.sendCampaign(subjectText, bodyText, total);
            const updatedHistory = await campaignService.getCampaignHistory();
            setCampaignHistory(updatedHistory);
            
            showToast(`🚀 [SIMULATION] Campaign broadcasted to ${total} subscribers!`, "success");
            setCampaignSubject('');
            setCampaignBody('');
          } catch (err) {
            console.error("Failed to save campaign:", err);
            showToast("Failed to complete campaign broadcast.", "error");
          } finally {
            setIsBroadcasting(false);
          }
        }
        setBroadcastingProgress(sentCount);
      }, 300);
    }
  };

  const handleAddCoupon = async () => {
    if (!newCouponCode.trim()) return;
    const cleanCode = newCouponCode.trim().toUpperCase();
    
    if (campaignCoupons.some(c => c.code === cleanCode)) {
      showToast("This coupon already exists.", "error");
      return;
    }

    try {
      await campaignService.createCoupon(cleanCode, Number(newCouponDiscount), {
        min_order_value: newCouponMinOrderValue ? Number(newCouponMinOrderValue) : 0,
        valid_until: newCouponValidUntil || ''
      });
      const response = await campaignService.getCoupons();
      setCampaignCoupons(response || []);
      showToast(`🎟️ Coupon ${cleanCode} activated successfully!`, 'success');
      setNewCouponCode('');
      setNewCouponMinOrderValue('');
      setNewCouponValidUntil('');
    } catch (err) {
      console.error("Failed to add coupon:", err);
    }
  };

  const handleStartEditCoupon = (coupon) => {
    setNewCouponCode(coupon.code);
    setNewCouponDiscount(Number(coupon.discount));
    setNewCouponMinOrderValue(coupon.min_order_value !== undefined ? String(coupon.min_order_value) : '');
    setNewCouponValidUntil(coupon.valid_until || '');
    setEditingCouponId(coupon.$id || coupon.id);
    setIsEditingCoupon(true);
  };

  const handleCancelEditCoupon = () => {
    setNewCouponCode('');
    setNewCouponDiscount(10);
    setNewCouponMinOrderValue('');
    setNewCouponValidUntil('');
    setEditingCouponId(null);
    setIsEditingCoupon(false);
  };

  const handleUpdateCoupon = async () => {
    if (!newCouponCode.trim() || !editingCouponId) return;
    const cleanCode = newCouponCode.trim().toUpperCase();

    if (campaignCoupons.some(c => c.code === cleanCode && (c.$id || c.id) !== editingCouponId)) {
      showToast("Another coupon with this code already exists.", "error");
      return;
    }

    try {
      await campaignService.updateCoupon(editingCouponId, cleanCode, Number(newCouponDiscount), {
        min_order_value: newCouponMinOrderValue ? Number(newCouponMinOrderValue) : 0,
        valid_until: newCouponValidUntil || ''
      });
      const response = await campaignService.getCoupons();
      setCampaignCoupons(response || []);
      showToast(`🎟️ Coupon ${cleanCode} updated successfully!`, 'success');
      handleCancelEditCoupon();
    } catch (err) {
      console.error("Failed to update coupon:", err);
      showToast("Failed to update coupon.", "error");
    }
  };

  const handleDeleteCoupon = async (couponCode) => {
    const coupon = campaignCoupons.find(c => c.code === couponCode);
    if (!coupon) return;

    try {
      const docId = coupon.$id || coupon.id || '';
      await campaignService.deleteCoupon(docId, couponCode);
      const response = await campaignService.getCoupons();
      setCampaignCoupons(response || []);
      showToast('🗑️ Coupon deactivated.', 'success');
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    }
  };

  const handleDeleteRestock = async (documentId) => {
    if (!documentId) return;
    setActionLoading(true);
    try {
      await restockService.deleteRestockNotification(documentId);
      showToast('🗑️ Restock request deleted successfully.', 'success');
      await loadStoreTelemetry();
    } catch (err) {
      console.error("Failed to delete restock notification:", err.message);
      showToast("Failed to delete restock notification.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRestock = async (documentId) => {
    if (!documentId) return;
    setActionLoading(true);
    try {
      await restockService.updateRestockNotification(documentId, { notified: true });
      showToast('✔️ Restock request marked as notified.', 'success');
      await loadStoreTelemetry();
    } catch (err) {
      console.error("Failed to confirm restock notification:", err.message);
      showToast("Failed to confirm restock notification.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const allCategories = [...DEFAULT_CATEGORIES];
  uniqueCategories.forEach(cat => {
    const val = cat.toLowerCase().trim();
    if (!allCategories.some(c => c.value === val)) {
      allCategories.push({ value: val, label: cat.replace(/-/g, ' ').toUpperCase() });
    }
  });

  const pendingOrdersCount = orders.filter(o => o.status === 'PENDING').length;
  const activeOrdersCount = orders.filter(o => ['PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'CANCELLATION_REQUESTED'].includes(o.status)).length;

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] py-6 px-4 md:py-10 md:px-8 relative selection:bg-[var(--color-accent)] selection:text-white">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/12 w-96 h-96 bg-[var(--color-accent)]/5 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/12 w-96 h-96 bg-[var(--color-info)]/5 rounded-full blur-3xl pointer-events-none z-0"></div>

      <div className="relative z-20 max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar Navigation - Glassmorphic, Sticky on Desktop */}
          <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-8 z-30">
            <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] rounded-2xl shadow-glass p-6 space-y-6">
              <div className="pb-4 border-b border-[var(--color-border)]">
                <h4 className="text-[10px] tracking-[0.3em] text-[var(--color-muted)] font-black uppercase mb-1">HQ Operations</h4>
                <h1 className="text-xl font-black tracking-widest uppercase text-[var(--color-text)] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[var(--color-accent)] rounded-full animate-pulse"></span>
                  Console
                </h1>
              </div>

              {/* Navigation Menu */}
              <nav className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
                <button 
                  onClick={() => { setActiveTab('analytics'); }}
                  className={`flex items-center gap-2.5 text-[10px] font-mono font-black tracking-[0.15em] uppercase px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 w-fit lg:w-full ${
                    activeTab === 'analytics' 
                      ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20' 
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <FiTrendingUp className="text-xs" />
                  <span>Analytics Overview</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('products'); }}
                  className={`flex items-center gap-2.5 text-[10px] font-mono font-black tracking-[0.15em] uppercase px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 w-fit lg:w-full ${
                    activeTab === 'products' 
                      ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20' 
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <FiPackage className="text-xs" />
                  <span>Drops Manager</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('orders'); loadCustomerOrders(); }}
                  className={`flex items-center gap-2.5 text-[10px] font-mono font-black tracking-[0.15em] uppercase px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 w-fit lg:w-full ${
                    activeTab === 'orders' 
                      ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20' 
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <FiTruck className="text-xs" />
                  <span>Fulfillment ({activeOrdersCount})</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('campaigns'); }}
                  className={`flex items-center gap-2.5 text-[10px] font-mono font-black tracking-[0.15em] uppercase px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 w-fit lg:w-full ${
                    activeTab === 'campaigns' 
                      ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20' 
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <FiMail className="text-xs" />
                  <span>Campaign Panel</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('slider'); loadSlides(); }}
                  className={`flex items-center gap-2.5 text-[10px] font-mono font-black tracking-[0.15em] uppercase px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 w-fit lg:w-full ${
                    activeTab === 'slider' 
                      ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20' 
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <FiImage className="text-xs" />
                  <span>Hero Slider</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('telemetry'); loadStoreTelemetry(); }}
                  className={`flex items-center gap-2.5 text-[10px] font-mono font-black tracking-[0.15em] uppercase px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 w-fit lg:w-full ${
                    activeTab === 'telemetry' 
                      ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20' 
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <FiActivity className="text-xs" />
                  <span>Activity Logs</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('categories'); }}
                  className={`flex items-center gap-2.5 text-[10px] font-mono font-black tracking-[0.15em] uppercase px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 w-fit lg:w-full ${
                    activeTab === 'categories' 
                      ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20' 
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <FiLayers className="text-xs" />
                  <span>Categories</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('offers'); loadOffersList(); }}
                  className={`flex items-center gap-2.5 text-[10px] font-mono font-black tracking-[0.15em] uppercase px-4 py-3 rounded-xl transition-all cursor-pointer shrink-0 w-fit lg:w-full ${
                    activeTab === 'offers' 
                      ? 'bg-[var(--color-accent)] text-white shadow-sm shadow-[var(--color-accent)]/20' 
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <FiTag className="text-xs" />
                  <span>Bundle Offers</span>
                </button>
              </nav>

              <div className="pt-4 border-t border-[var(--color-border)] flex flex-col gap-2.5">
                <Link to="/" className="w-full text-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[10px] font-black tracking-widest px-4 py-3 rounded-xl uppercase transition-all shadow-xs hover:shadow-sm hover:translate-y-[-1px] active:scale-[0.98]">
                  HOME
                </Link>
                <div className="w-full text-center border border-[var(--color-border)] text-slate-300 text-[9px] font-mono font-black tracking-widest px-4 py-2.5 rounded-xl uppercase bg-[var(--color-surface-alt)]">
                  Admin Mode Active
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Pane */}
          <div className="flex-grow w-full space-y-6 min-w-0">
            {/* Header Block inside main area */}
            <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 md:p-8 rounded-2xl shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-[10px] tracking-[0.3em] text-[var(--color-muted)] font-black uppercase mb-1">HQ Operations Console</h4>
                <h1 className="text-2xl font-black tracking-widest uppercase text-[var(--color-text)]">
                  {activeTab === 'analytics' && 'Analytics Overview'}
                  {activeTab === 'products' && 'Drops Manager'}
                  {activeTab === 'orders' && 'Fulfillment Engine'}
                  {activeTab === 'campaigns' && 'Campaigns & Coupons'}
                  {activeTab === 'slider' && 'Hero Slider Manager'}
                  {activeTab === 'telemetry' && 'Store Activity Logs'}
                  {activeTab === 'categories' && 'Category Manager'}
                  {activeTab === 'offers' && 'Bundle Offers Manager'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-250 text-[9px] font-black tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                  Active Registry
                </span>
              </div>
            </div>

          {/* ==========================================
              TAB 0: ANALYTICS OVERVIEW
              ========================================== */}
          {activeTab === 'analytics' && (
            <AdminAnalytics orders={orders} products={products} />
          )}

          {/* ==========================================
              TAB 1: DROPS CATALOG & LAUNCH DROP
              ========================================== */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Products Sub-Tab Menu */}
              <div className="flex gap-6 border-b border-[var(--color-border)] pb-3 mb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setProductsSubTab('list')}
                  className={`text-[10px] font-mono font-black tracking-[0.2em] uppercase pb-1.5 transition-all border-b-2 cursor-pointer ${
                    productsSubTab === 'list' 
                      ? 'text-[var(--color-text)] border-[var(--color-border)]' 
                      : 'text-[var(--color-muted)] border-transparent hover:text-[var(--color-text)]'
                  }`}
                >
                  Deployed Drops Pool ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editingId) {
                      handleCancelEdit();
                    }
                    setProductsSubTab('form');
                  }}
                  className={`text-[10px] font-mono font-black tracking-[0.2em] uppercase pb-1.5 transition-all border-b-2 cursor-pointer ${
                    productsSubTab === 'form' 
                      ? 'text-[var(--color-text)] border-[var(--color-border)]' 
                      : 'text-[var(--color-muted)] border-transparent hover:text-[var(--color-text)]'
                  }`}
                >
                  {editingId ? '⚡ Edit Drop Details' : '➕ Launch New Drop'}
                </button>
              </div>

              {productsSubTab === 'form' ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 md:col-span-2 w-full text-left">
                  
                  {/* CARD 1: GENERAL SPECIFICATIONS */}
                  <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 rounded-2xl shadow-glass space-y-6">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center gap-2">
                      <FiPackage className="text-[var(--color-accent)] text-lg" />
                      <h3 className="text-xs font-black tracking-widest uppercase text-[var(--color-text)]">General Specs & Pricing</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Product Name */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Product Name</label>
                <input
                  type="text"
                  disabled={actionLoading}
                  placeholder="E.G., GOTHIC OVERSIZED HOODIE"
                  className={`w-full bg-[var(--color-subtle)] border ${errors.name ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)]'} rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors font-medium disabled:opacity-50`}
                  {...register('name', { required: 'Product name is required' })}
                />
                {errors.name && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.name.message}</span>}
              </div>

              {/* Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Price (INR)</label>
                <input
                  type="number"
                  placeholder="1499"
                  disabled={actionLoading}
                  className={`w-full bg-[var(--color-subtle)] border ${errors.price ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)]'} rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors font-medium disabled:opacity-50`}
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 1, message: 'Price must be greater than 0' }
                  })}
                />
                {errors.price && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.price.message}</span>}
              </div>

              {/* Compare-at Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Compare-At Price (INR)</label>
                <input
                  type="number"
                  placeholder="1999"
                  disabled={actionLoading}
                  className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors font-medium disabled:opacity-50"
                  {...register('compare_at_price')}
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Category</label>
                {!isCustomCategory ? (
                  <div className="relative">
                    <select
                      disabled={actionLoading}
                      className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl px-4 py-3.5 pr-10 text-sm text-[var(--color-text)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors font-medium appearance-none cursor-pointer disabled:opacity-50 uppercase"
                      {...register('category', { 
                        required: 'Category is required',
                        onChange: (e) => {
                          if (e.target.value === 'custom') {
                            setIsCustomCategory(true);
                            setValue('category', '');
                          }
                        }
                      })}
                    >
                      <option value="">-- SELECT CATEGORY --</option>
                      {allCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                      <option value="custom">➕ ADD NEW CUSTOM CATEGORY</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-muted)]">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={actionLoading}
                      placeholder="E.G., CARGO PANTS"
                      className="grow bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors font-medium disabled:opacity-50"
                      {...register('category', { required: 'Category is required' })}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(false);
                        setValue('category', 'printed-tshirt'); // Reset to default
                      }}
                      className="bg-[var(--color-subtle)] hover:bg-[var(--color-border)] text-[var(--color-text)] px-4 py-3.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {errors.category && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.category.message}</span>}
              </div>

              {/* Custom URL Slug */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Custom URL Slug</label>
                <input
                  type="text"
                  placeholder="gothic-oversized-hoodie"
                  disabled={actionLoading}
                  className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors font-medium disabled:opacity-50 lowercase"
                  {...register('slug')}
                />
              </div>

              {/* Search Keywords */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Search Keywords (Comma Separated)</label>
                <input
                  type="text"
                  disabled={actionLoading}
                  placeholder="E.G., OVERSIZED, HEAVYWEIGHT, BLACK, GRAPHIC, COTTON"
                  className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors font-medium disabled:opacity-50"
                  {...register('search_keywords')}
                />
              </div>

                    </div>
                  </div>

                  {/* CARD 2: MEDIA & IMAGES */}
                  <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 rounded-2xl shadow-glass space-y-6">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center gap-2">
                      <FiImage className="text-[var(--color-accent)] text-lg" />
                      <h3 className="text-xs font-black tracking-widest uppercase text-[var(--color-text)]">Media & Image Views</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Front Image Link */}
                      <div className="md:col-span-2">
                        {renderImageUploader('front_image_link', 'Front Image Link (Primary View)', { required: 'Front image link is required' })}
                      </div>

                      {/* Gallery Images */}
                      <div className="flex flex-col gap-3 md:col-span-2 border-t border-[var(--color-border)]/40 pt-4 mt-2">
                        <div className="flex justify-between items-center pb-1">
                          <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">
                            Back Image Links ({backImageCount} Views)
                          </label>
                          {backImageCount < 8 && (
                            <button
                              type="button"
                              onClick={() => setBackImageCount(prev => prev + 1)}
                              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono font-bold text-[9px] px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all cursor-pointer inline-flex items-center gap-1 border border-[var(--color-border)]/10"
                            >
                              <FiPlus className="text-xs" /> Add View
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Array.from({ length: backImageCount }).map((_, index) => {
                            const fieldName = `back_image_link_${index + 1}`;
                            return (
                              <div key={fieldName} className="w-full">
                                {renderImageUploader(fieldName, `Back Image View ${index + 1}`, index === 0 ? { required: 'At least one back view link is required.' } : undefined)}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* CARD 3: INVENTORY, VARIATIONS & POLICIES */}
                  <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 rounded-2xl shadow-glass space-y-6">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center gap-2">
                      <FiSliders className="text-[var(--color-accent)] text-lg" />
                      <h3 className="text-xs font-black tracking-widest uppercase text-[var(--color-text)]">Inventory, Variations & Policies</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Size-wise Stock Management (Option 2) */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Size-wise Stock Inventory Configuration</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-subtle)]/50 p-4">
                  {SIZE_OPTIONS.map((size) => (
                    <div key={size} className="flex flex-col gap-1.5 p-2 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                      <span className="text-[10px] font-black text-[var(--color-text)] tracking-wider text-center">{size} STOCK</span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        disabled={actionLoading}
                        className="w-full text-center text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        {...register(`stock_${size}`)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Metadata & Custom Variations */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Product Metadata & Custom Variations</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-subtle)]/50 p-4">
                  {/* Status Badge Tag */}
                  <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                    <label className="text-[9px] font-black text-[var(--color-muted)] uppercase">Status Badge Tag</label>
                    <select
                      disabled={actionLoading}
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase appearance-none cursor-pointer text-[var(--color-text)]"
                      {...register('single_tag')}
                    >
                      <option value="">NONE / NO BADGE</option>
                      {TAG_OPTIONS.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>

                  {/* Discount Percent */}
                  <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                    <label className="text-[9px] font-black text-[var(--color-muted)] uppercase">Discount Percent (%)</label>
                    <input
                      type="number"
                      disabled={actionLoading}
                      placeholder="0"
                      min="0"
                      max="100"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1"
                      {...register('discount_percent')}
                    />
                  </div>

                      {/* Color Group ID */}
                      <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                        <label className="text-[9px] font-black text-[var(--color-muted)] uppercase">Color Group ID</label>
                        <input
                          type="text"
                          disabled={actionLoading}
                          placeholder="E.G., CG-TEE-01"
                          className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase"
                          {...register('color_group_id')}
                        />
                      </div>

                      {/* Color Name */}
                      <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                        <label className="text-[9px] font-black text-[var(--color-muted)] uppercase">Color Name</label>
                        <input
                          type="text"
                          disabled={actionLoading}
                          placeholder="E.G., JET BLACK"
                          className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1"
                          {...register('color_name')}
                        />
                      </div>

                      {/* Color Hex */}
                      <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                        <label className="text-[9px] font-black text-[var(--color-muted)] uppercase">Color Hex Code</label>
                        <input
                          type="text"
                          disabled={actionLoading}
                          placeholder="E.G., #000000"
                          className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase"
                          {...register('color_hex')}
                        />
                      </div>

                  {/* Fit Type */}
                  <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                    <label className="text-[9px] font-black text-[var(--color-muted)] uppercase">Fit Type</label>
                    <input
                      type="text"
                      disabled={actionLoading}
                      placeholder="E.G., OVERSIZED BOX FIT"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1"
                      {...register('fit_type')}
                    />
                  </div>

                  {/* Fabric GSM */}
                  <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] sm:col-span-2 md:col-span-3">
                    <label className="text-[9px] font-black text-[var(--color-muted)] uppercase">Fabric GSM</label>
                    <input
                      type="text"
                      disabled={actionLoading}
                      placeholder="E.G., 240 GSM 100% COMBED COTTON"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1"
                      {...register('fabric_gsm')}
                    />
                  </div>

                  {/* Featured Product Flag */}
                  <div className="flex items-center gap-3 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] sm:col-span-2 md:col-span-3">
                    <input
                      type="checkbox"
                      id="is_featured"
                      disabled={actionLoading}
                      className="w-4 h-4 text-[var(--color-text)] border-[var(--color-border)] focus:ring-0 focus:ring-offset-0 rounded-xl accent-[var(--color-accent)] cursor-pointer"
                      {...register('is_featured')}
                    />
                    <label htmlFor="is_featured" className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest cursor-pointer select-none">
                      ★ Mark as Featured (Display in Heavyweight Drops on Homepage)
                    </label>
                  </div>

                  {/* Live Status Flag */}
                  <div className="flex items-center gap-3 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)] sm:col-span-2 md:col-span-3">
                    <input
                      type="checkbox"
                      id="is_live"
                      disabled={actionLoading}
                      className="w-4 h-4 text-[var(--color-text)] border-[var(--color-border)] focus:ring-0 focus:ring-offset-0 rounded-xl accent-[var(--color-accent)] cursor-pointer"
                      {...register('is_live')}
                    />
                    <label htmlFor="is_live" className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest cursor-pointer select-none">
                      🚀 Go Live / Publish Drop (Visible to customers on the site)
                    </label>
                  </div>



                </div>
              </div>

              {/* Description Spec */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Description (Optional)</label>
                <textarea
                  rows="3"
                  disabled={actionLoading}
                  placeholder="E.G., 280 GSM 100% FRENCH TERRY COTTON. BOOTCUT BOXED DROP LAYOUT SPEC..."
                  className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors font-medium resize-none disabled:opacity-50"
                  {...register('description')}
                />
              </div>

              {/* Return Policy Select Input */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Return Policy *</label>
                <select
                  disabled={actionLoading}
                  className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] hover:border-neutral-450 focus:border-[var(--color-border)] rounded-xl px-4 py-3.5 text-sm text-[var(--color-text)] outline-hidden tracking-wider transition-colors font-medium disabled:opacity-50 uppercase cursor-pointer"
                  {...register('return_policy')}
                >
                  <option value="7 Day Return">7 Day Return & Exchange</option>
                  <option value="Return Only">Return Only (No Exchange)</option>
                  <option value="Exchange Only">Exchange Only (No Refund)</option>
                  <option value="No Return">No Return or Exchange (Final Sale)</option>
                </select>
              </div>

                    </div>
                  </div>

              {/* Form actions and submission */}
              <div className="md:col-span-2 mt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl border border-[var(--color-border)] transition-all active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                >
                  {actionLoading ? 'PROCESSING REQUEST...' : editingId ? 'UPDATE DROP SPECIFICATION' : 'DEPLOY DROP TO PUBLIC'}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancelEdit}
                  className="px-6 bg-[var(--color-subtle)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-black text-xs tracking-widest uppercase py-4 rounded-xl border border-[var(--color-border)] transition-all active:scale-[0.99] cursor-pointer"
                >
                  {editingId ? 'CANCEL' : 'RETURN TO POOL'}
                </button>
              </div>
            </form>
              ) : (
                (() => {
                  const filteredProducts = products.filter(p => {
                    // Search filter
                    if (productSearchQuery.trim()) {
                      const query = productSearchQuery.toLowerCase().trim();
                      const nameMatch = (p.name || '').toLowerCase().includes(query);
                      const slugMatch = (p.slug || '').toLowerCase().includes(query);
                      const descMatch = (p.description || '').toLowerCase().includes(query);
                      const tagBadgeMatch = (p.tag || '').toLowerCase().includes(query);
                      const categoryMatch = (p.category || '').toLowerCase().includes(query);
                      const colorNameMatch = (p.color_name || '').toLowerCase().includes(query);
                      const keywordMatch = Array.isArray(p.tags) && p.tags.some(t => String(t).toLowerCase().includes(query));
                      if (!nameMatch && !slugMatch && !descMatch && !tagBadgeMatch && !categoryMatch && !colorNameMatch && !keywordMatch) return false;
                    }

                    // Category filter
                    if (productCategoryFilter !== 'ALL' && p.category !== productCategoryFilter) {
                      return false;
                    }

                    // Tag filter
                    if (productTagFilter !== 'ALL' && p.tag !== productTagFilter) {
                      return false;
                    }

                    // Stock filter
                    if (productStockFilter !== 'ALL') {
                      let parsedStock;
                      try {
                        parsedStock = JSON.parse(p.sizes_stock || '{}');
                      } catch {
                        parsedStock = {};
                      }
                      const totalStock = Object.values(parsedStock).reduce((acc, v) => acc + Number(v), 0);
                      const isOut = totalStock === 0;

                      if (productStockFilter === 'IN_STOCK' && isOut) return false;
                      if (productStockFilter === 'OUT_STOCK' && !isOut) return false;
                    }

                    return true;
                  });

                  return (
                    <div className="space-y-6">
                      {/* Search & Filter Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[var(--color-subtle)]/30 p-5 border border-[var(--glass-border-green)] rounded-2xl backdrop-blur-sm shadow-xs">
                        {/* Search Input */}
                        <div className="flex flex-col gap-1.5 sm:col-span-1">
                          <span className="text-[8px] font-mono text-[var(--color-muted)] font-bold uppercase tracking-widest">Search Drops</span>
                          <input
                            type="text"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            placeholder="Search name, slug, tag..."
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono font-bold px-3 py-2 outline-hidden placeholder-neutral-450 uppercase tracking-wider rounded-xl focus:border-[var(--color-border)] focus:bg-[var(--color-surface)]"
                          />
                        </div>
                        {/* Category Selector */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono text-[var(--color-muted)] font-bold uppercase tracking-widest">Filter Category</span>
                          <select
                            value={productCategoryFilter}
                            onChange={(e) => setProductCategoryFilter(e.target.value)}
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] outline-hidden tracking-wider focus:border-[var(--color-border)] uppercase cursor-pointer rounded-xl px-2 py-2"
                          >
                            <option value="ALL">ALL CATEGORIES</option>
                            {allCategories.map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        {/* Tag Selector */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono text-[var(--color-muted)] font-bold uppercase tracking-widest">Filter Badge</span>
                          <select
                            value={productTagFilter}
                            onChange={(e) => setProductTagFilter(e.target.value)}
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] outline-hidden tracking-wider focus:border-[var(--color-border)] uppercase cursor-pointer rounded-xl px-2 py-2"
                          >
                            <option value="ALL">ALL BADGES</option>
                            <option value="NEW DROP">NEW DROP</option>
                            <option value="BEST SELLER">BEST SELLER</option>
                            <option value="FEW LEFT">FEW LEFT</option>
                            <option value="LIMITED ITEM">LIMITED ITEM</option>
                          </select>
                        </div>
                        {/* Stock Selector */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono text-[var(--color-muted)] font-bold uppercase tracking-widest">Filter Stock</span>
                          <select
                            value={productStockFilter}
                            onChange={(e) => setProductStockFilter(e.target.value)}
                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono font-bold text-[var(--color-text)] outline-hidden tracking-wider focus:border-[var(--color-border)] uppercase cursor-pointer rounded-xl px-2 py-2"
                          >
                            <option value="ALL">ALL STOCK STATUS</option>
                            <option value="IN_STOCK">IN STOCK ONLY</option>
                            <option value="OUT_STOCK">OUT OF STOCK ONLY</option>
                          </select>
                        </div>
                      </div>

                      {filteredProducts.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-subtle)]/50">
                          <p className="text-xs font-mono font-black tracking-widest text-[var(--color-muted)] uppercase">
                            No active product drops match the search criteria or filters.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredProducts.map((p) => {
                            const targetId = p.$id || p.id;
                            const coverThumbnailUrl = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x100?text=No+Asset';
                            // Parse sizes and stock
                            let parsedStock = {};
                            try {
                              parsedStock = JSON.parse(p.sizes_stock || '{}');
                            } catch (err) {
                              console.warn("Stock parsing failed for catalog list:", err.message);
                              parsedStock = {};
                            }

                            const totalStock = (p.sizes || []).reduce((sum, size) => {
                              const stock = parsedStock[size] !== undefined ? Number(parsedStock[size]) : 10;
                              return sum + stock;
                            }, 0);
                            const backImagesArrayCount = Array.isArray(p.back_image_links) ? p.back_image_links.length : p.back_image_link ? 1 : 0;

                            const isProductLive = p.is_live === true || p.is_live === 'true' || p.is_live === 1 || p.is_live === '1';
                            return (
                              <div key={targetId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-subtle)]/30 transition-all rounded-2xl shadow-xs">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <img src={coverThumbnailUrl} alt={p.name} className="w-14 h-14 object-cover border border-[var(--color-border)] shrink-0 rounded-xl shadow-xs" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-black uppercase tracking-wide text-[var(--color-text)] truncate">{p.name}</p>
                                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        isProductLive 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' 
                                        : 'bg-slate-800 text-[var(--color-muted)] border border-slate-700'
                                      }`}>
                                        {isProductLive ? 'LIVE' : 'DRAFT'}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-[var(--color-muted)] uppercase tracking-tight font-medium">
                                      <span className="font-bold text-[var(--color-text)] text-xs">₹{p.price}</span>
                                      {p.tag && (
                                        <>
                                          <span>·</span>
                                          <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-border)]/20 px-2 py-0.5 text-[8px] font-bold rounded-full tracking-wider">
                                            {p.tag}
                                          </span>
                                        </>
                                      )}
                                      <span>·</span>
                                      <span className={totalStock > 0 ? 'text-[var(--color-text)]' : 'text-rose-500 font-bold'}>
                                        {totalStock > 0 ? `STOCK: ${totalStock} QTY` : 'OUT OF STOCK'}
                                      </span>
                                      <span>·</span>
                                      <span>
                                        {backImagesArrayCount + 1} IMAGES
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLiveStatus(targetId, isProductLive)}
                                    className={`text-[9px] px-3.5 py-2 font-mono font-black uppercase tracking-widest cursor-pointer transition-all duration-150 rounded-xl border ${
                                      isProductLive
                                      ? 'bg-amber-500/10 text-amber-700 border-amber-300 hover:bg-amber-600 hover:text-white'
                                      : 'bg-emerald-500/10 text-emerald-700 border-emerald-300 hover:bg-emerald-600 hover:text-white'
                                    }`}
                                  >
                                    {isProductLive ? 'Set Draft' : 'Go Live'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(targetId)}
                                    className="text-[9px] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-accent)] hover:text-white px-3.5 py-2 font-mono font-black text-[var(--color-text)] uppercase tracking-widest cursor-pointer transition-all duration-150 rounded-xl shadow-xs"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProductItem(targetId)}
                                    className="text-[9px] bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-950 text-rose-950 hover:text-white px-3.5 py-2 font-mono font-black text-rose-950 uppercase tracking-widest cursor-pointer transition-all duration-150 rounded-xl shadow-xs"
                                  >
                                    Sweep
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* ==========================================
              TAB 2: ORDER MANAGEMENT
              ========================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <h2 className="text-xs font-black tracking-[0.4em] text-[var(--color-accent)] uppercase">Incoming Customer Orders</h2>
                <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase font-black">{orders.length} TOTAL ORDERS</span>
              </div>

              {/* Telemetry Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">TOTAL SALES REVENUE</span>
                  <span className="text-lg font-black text-[var(--color-text)]">
                    ₹{orders
                      .filter(o => o.status !== 'CANCELLED')
                      .reduce((acc, o) => acc + Number(o.total || 0), 0)
                      .toLocaleString('en-IN')
                    }
                  </span>
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">Total from active orders</span>
                </div>
                <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">PENDING ORDERS</span>
                  <span className="text-lg font-black text-amber-600">
                    {orders.filter(o => (o.status || 'PENDING') === 'PENDING').length} ORDERS
                  </span>
                  <span className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Awaiting shipping</span>
                </div>
                <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">RETURN/EXCHANGE REQS</span>
                  <span className="text-lg font-black text-[var(--color-accent)]">
                    {orders.filter(o => o.status === 'RETURN_REQUESTED' || o.status === 'EXCHANGE_REQUESTED').length} REQS
                  </span>
                  <span className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Requires resolution</span>
                </div>
                <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">CANCELLED ORDERS</span>
                  <span className="text-lg font-black text-rose-600">
                    {orders.filter(o => o.status === 'CANCELLED').length} ORDERS
                  </span>
                  <span className="text-[8px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Cancelled order count</span>
                </div>
              </div>

              {/* Sales Revenue Trend Chart */}
              {(() => {
                const chartData = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const dateStr = d.toISOString().split('T')[0];
                  
                  const total = orders
                    .filter(o => {
                      if (o.status === 'CANCELLED') return false;
                      const oDate = new Date(o.$createdAt || o.createdAt);
                      return oDate.toISOString().split('T')[0] === dateStr;
                    })
                    .reduce((sum, o) => sum + Number(o.total || 0), 0);

                  const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                  chartData.push({ date: dateStr, label, revenue: total });
                }

                const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1000);
                const points = chartData.map((d, i) => {
                  const x = 50 + (i / 6) * 410;
                  const y = 120 - (d.revenue / maxRevenue) * 90;
                  return { ...d, x, y };
                });
                const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
                const areaPoints = `50,120 ${polylinePoints} 460,120`;

                return (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl space-y-4 shadow-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-150">
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-black tracking-[0.2em] text-[var(--color-text)] uppercase">📈 Sales Revenue Trend</h3>
                        <p className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase">Daily revenue trajectory from active customer orders (last 7 days)</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase">PEAK DAILY VALUE</span>
                        <span className="text-xs font-mono font-black text-[var(--color-text)]">₹{Math.max(...chartData.map(d => d.revenue)).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="relative pt-2">
                      <svg viewBox="0 0 500 150" className="w-full h-36 sm:h-48 overflow-visible">
                        <defs>
                          <linearGradient id="salesChartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#000000" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Grid Lines */}
                        <line x1="50" y1="30" x2="460" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="50" y1="75" x2="460" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                        <line x1="50" y1="120" x2="460" y2="120" stroke="#e2e8f0" strokeWidth="1.5" />
                        
                        {/* Y-Axis Labels */}
                        <text x="42" y="33" textAnchor="end" className="text-[8px] font-mono font-bold fill-neutral-450">₹{Math.round(maxRevenue).toLocaleString('en-IN')}</text>
                        <text x="42" y="78" textAnchor="end" className="text-[8px] font-mono font-bold fill-neutral-450">₹{Math.round(maxRevenue / 2).toLocaleString('en-IN')}</text>
                        <text x="42" y="123" textAnchor="end" className="text-[8px] font-mono font-bold fill-neutral-450">₹0</text>
                        
                        {/* Area under line */}
                        <polygon points={areaPoints} fill="url(#salesChartGrad)" />
                        
                        {/* Trend Line path */}
                        <polyline 
                          points={polylinePoints} 
                          fill="none" 
                          stroke="#000000" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                        />
                        
                        {/* Circles & Labels */}
                        {points.map((p, i) => (
                          <g key={i} className="group cursor-pointer">
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="3.5" 
                              className="fill-white stroke-black stroke-2 hover:r-5 hover:fill-black transition-all duration-150"
                            />
                            {/* Tooltip on Hover */}
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                              <rect 
                                x={p.x - 35} 
                                y={p.y - 24} 
                                width="70" 
                                height="16" 
                                rx="3" 
                                fill="#0f172a" 
                              />
                              <text 
                                x={p.x} 
                                y={p.y - 13} 
                                textAnchor="middle" 
                                className="text-[7.5px] font-mono font-black fill-white"
                              >
                                ₹{p.revenue.toLocaleString('en-IN')}
                              </text>
                            </g>
                            <text 
                              x={p.x} 
                              y="135" 
                              textAnchor="middle" 
                              className="text-[8px] font-mono font-bold fill-neutral-450 uppercase"
                            >
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                );
              })()}

              {/* Search and Export Utilities Row */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/60 border border-[var(--color-border)] p-4 rounded-xl shadow-md">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search name, email, or order ID..."
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-border)] text-xs font-semibold px-4 py-2.5 outline-hidden placeholder-[var(--color-muted)] uppercase tracking-wider rounded-lg font-sans"
                  />
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrintShippingLabels}
                    className="bg-[var(--color-accent)] hover:bg-indigo-700 text-white font-mono font-black text-[10px] tracking-widest uppercase px-5 py-3.5 rounded-lg cursor-pointer transition-all duration-300 text-center flex items-center gap-1.5 shadow-xs"
                  >
                    <FiFileText className="text-xs" /> Print Shipping Slips
                  </button>
                  <button
                    type="button"
                    onClick={handleExportOrdersToCSV}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono font-black text-[10px] tracking-widest uppercase px-5 py-3.5 rounded-lg cursor-pointer transition-all duration-300 text-center"
                  >
                    Export Orders list to CSV
                  </button>
                </div>
              </div>

              {/* Order Status Filters */}
              <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)]/60 pb-4">
                {['ALL', 'PENDING', 'CANCELLATION_REQUESTED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'EXCHANGE_REQUESTED', 'RETURNED', 'EXCHANGED'].map((filterVal) => {
                  const count = filterVal === 'ALL' 
                    ? orders.length 
                    : orders.filter(o => (o.status || 'PENDING') === filterVal).length;
                  return (
                    <button
                      key={filterVal}
                      onClick={() => setOrderFilter(filterVal)}
                      className={`px-3.5 py-2 text-[9px] font-black uppercase tracking-wider transition-all rounded-lg border cursor-pointer relative ${
                        orderFilter === filterVal
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-border)] shadow-xs'
                          : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-neutral-450'
                      }`}
                    >
                      {count > 0 && (
                        <span className={`absolute -top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs animate-pulse ${
                          orderFilter === filterVal ? 'bg-amber-400' : 'bg-[var(--color-accent)]'
                        }`} />
                      )}
                      {filterVal} ({count})
                    </button>
                  );
                })}
              </div>

              {(() => {
                const filteredOrders = getFilteredOrders();

                if (filteredOrders.length === 0) {
                  return (
                    <div className="py-20 text-center border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-subtle)]/50">
                      <p className="text-xs font-black tracking-widest text-[var(--color-muted)] uppercase">
                        No orders match the filters or search query &ldquo;{orderSearchQuery || orderFilter}&rdquo;.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filteredOrders.map((order, idx) => {
                      const uniqueOrderId = order.$id || order.id;
                      let parsedItems;
                      try {
                        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
                      } catch {
                        parsedItems = [];
                      }

                      // Parse address — handles both old JSON format and new plain string
                      let displayAddress = order.address || '';
                      let orderNumber = order.order_number || uniqueOrderId?.substring(0, 12).toUpperCase();
                      let cancelReason = '';
                      let parsedAddr = {};
                      try {
                        const parsed = JSON.parse(order.address);
                        if (parsed && typeof parsed === 'object') {
                          parsedAddr = parsed;
                          let rawAddr = parsed.customerAddress || order.address;
                          // Handle if customerAddress is itself a JSON string
                          if (typeof rawAddr === 'string' && rawAddr.trim().startsWith('{')) {
                            try {
                              const innerParsed = JSON.parse(rawAddr);
                              if (innerParsed && typeof innerParsed === 'object') {
                                const line = innerParsed.line || '';
                                const city = innerParsed.city || '';
                                const state = innerParsed.state || '';
                                const pincode = innerParsed.pincode || '';
                                const country = innerParsed.country || 'India';
                                rawAddr = [line, city, state, pincode, country].filter(Boolean).join(', ');
                              }
                            } catch (err) {
                              console.warn("Could not parse inner customer address JSON:", err.message);
                            }
                          }
                          displayAddress = rawAddr;
                          if (parsedAddr.metadata?.order_number) {
                            orderNumber = parsedAddr.metadata.order_number;
                          }
                          if (parsedAddr.metadata?.cancel_reason) {
                            cancelReason = parsedAddr.metadata.cancel_reason;
                          }
                        }
                      } catch {
                        // Plain string address (new format after fix)
                        displayAddress = order.address || '';
                      }

                      return (
                        <div key={uniqueOrderId || idx} className="bg-[var(--color-subtle)] p-6 rounded-2xl border border-[var(--color-border)] flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--color-border)]/60 pb-3 gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] font-mono font-black text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2 py-0.5 rounded uppercase tracking-wider">#{idx + 1}</span>
                                <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase">ORDER ID: {orderNumber}</span>
                              </div>
                              <span className="text-sm font-black text-[var(--color-text)] uppercase tracking-wide">{order.customerName}</span>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase">
                                  📅 {new Date(order.$createdAt || order.createdAt || '').toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {order.paymentMethod && (
                                  <span className="text-[9px] font-mono font-black text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 rounded uppercase tracking-wider">
                                    💳 {order.paymentMethod}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Dynamic Order Status Badge */}
                              <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                order.status === 'DELIVERED' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' 
                                : order.status === 'SHIPPED' 
                                ? 'bg-amber-50 text-amber-600 border border-amber-250' 
                                : order.status === 'CANCELLED'
                                ? 'bg-[var(--color-subtle)] text-[var(--color-muted)] border border-[var(--color-border)]'
                                : order.status === 'CANCELLATION_REQUESTED'
                                ? 'bg-rose-100 text-rose-750 border border-rose-350 animate-pulse font-bold'
                                : order.status === 'RETURN_REQUESTED' || order.status === 'EXCHANGE_REQUESTED'
                                ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse font-bold'
                                : order.status === 'RETURNED' || order.status === 'RETURN_APPROVED'
                                ? 'bg-rose-50 text-rose-600 border border-rose-250 font-bold'
                                : order.status === 'EXCHANGED' || order.status === 'EXCHANGE_APPROVED'
                                ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-indigo-250 font-bold'
                                : 'bg-rose-50 text-rose-600 border border-rose-250 animate-pulse'
                              }`}>
                                {order.status || 'PENDING'}
                              </span>
                              
                              <span className="text-xs font-mono font-black text-[var(--color-text)]">₹{order.total?.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* Fulfillment Stepper */}
                          {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                            <div className="py-4 px-3 bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl mt-1 select-none">
                              <div className="flex justify-between items-center relative max-w-md mx-auto">
                                {/* Track Line */}
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-200 -translate-y-1/2 z-0"></div>
                                {/* Active progress line */}
                                <div className="absolute top-1/2 left-0 h-0.5 bg-[var(--color-accent)] -translate-y-1/2 z-0 transition-all duration-500"
                                  style={{
                                    width: order.status === 'PENDING' ? '0%' :
                                           order.status === 'PROCESSING' ? '33%' :
                                           order.status === 'SHIPPED' ? '66%' : '100%'
                                  }}
                                ></div>
                                
                                {/* Steps */}
                                {[
                                  { label: 'Pending', status: 'PENDING' },
                                  { label: 'Processing', status: 'PROCESSING' },
                                  { label: 'Shipped', status: 'SHIPPED' },
                                  { label: 'Delivered', status: 'DELIVERED' }
                                ].map((step, stepIdx) => {
                                  const isCurrent = order.status === step.status;
                                  const isCompleted = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].indexOf(order.status) >= ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].indexOf(step.status);
                                  
                                  return (
                                    <div key={step.status} className="flex flex-col items-center z-10">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border transition-all duration-300 ${
                                        isCurrent 
                                          ? 'bg-white border-[var(--color-accent)] text-[var(--color-accent)] ring-4 ring-[var(--color-accent-glow)]' 
                                          : isCompleted 
                                            ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' 
                                            : 'bg-white border-neutral-250 text-neutral-400'
                                      }`}>
                                        {isCompleted && !isCurrent ? '✓' : stepIdx + 1}
                                      </div>
                                      <span className={`text-[8px] font-bold uppercase tracking-wider mt-1.5 ${
                                        isCurrent ? 'text-[var(--color-accent)] font-extrabold' : isCompleted ? 'text-[var(--color-text)]' : 'text-neutral-400'
                                      }`}>
                                        {step.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {order.status === 'CANCELLED' && cancelReason && (
                            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-rose-750 text-[10px] font-medium uppercase tracking-wide">
                              <span className="font-bold block text-[8px] text-rose-500">CANCELLATION REASON</span>
                              &ldquo;{cancelReason}&rdquo;
                            </div>
                          )}

                          {order.status === 'CANCELLATION_REQUESTED' && cancelReason && (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-amber-700 text-[10px] font-medium uppercase tracking-wide">
                              <span className="font-bold block text-[8px] text-amber-500">REQUESTED CANCELLATION REASON</span>
                              &ldquo;{cancelReason}&rdquo;
                            </div>
                          )}

                          {/* Active Return/Exchange Requests */}
                          {Array.isArray(parsedAddr.metadata?.return_requests) && parsedAddr.metadata.return_requests.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-xl space-y-3">
                              <span className="text-[8px] font-bold text-amber-700 block tracking-widest uppercase">⚠️ Active Return/Exchange Requests</span>
                              <div className="space-y-2">
                                {parsedAddr.metadata.return_requests.map((request, reqIdx) => {
                                  const matchingProd = products.find(p => p.$id === request.productId || p.id === request.productId || p.name.trim().toUpperCase() === request.productName?.trim().toUpperCase());
                                  const imgUrl = matchingProd?.front_image_link || matchingProd?.image_url || matchingProd?.image || 'https://placehold.co/100x100?text=No+Asset';
                                  return (
                                    <div key={reqIdx} className="text-xs border-b border-amber-200/40 pb-2 last:border-b-0 last:pb-0 space-y-1.5 font-medium uppercase tracking-wide">
                                      <div className="flex justify-between items-center gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <a 
                                            href={`/product/${matchingProd?.$id || matchingProd?.id || request.productId}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="hover:opacity-80 transition-opacity shrink-0"
                                          >
                                            <img 
                                              src={imgUrl} 
                                              alt={request.productName} 
                                              className="w-8 h-10 object-cover object-center rounded border border-amber-300 bg-neutral-900" 
                                            />
                                          </a>
                                          <a 
                                            href={`/product/${matchingProd?.$id || matchingProd?.id || request.productId}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="font-black text-[var(--color-text)] truncate max-w-[150px] sm:max-w-xs hover:text-[var(--color-accent)] transition-colors"
                                          >
                                            {request.type === 'RETURN' ? '↩️ Return' : '🔄 Exchange'} for {request.productName}
                                          </a>
                                        </div>
                                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                                          request.status === 'PENDING'
                                          ? 'bg-amber-100 text-amber-700 border border-amber-250 animate-pulse'
                                          : request.status === 'APPROVED'
                                          ? 'bg-emerald-50 text-emerald-600 border-emerald-250'
                                          : 'bg-rose-50 text-rose-600 border-rose-250'
                                        }`}>
                                          {request.status}
                                        </span>
                                      </div>
                                      <p className="text-[var(--color-muted)] text-[10px] font-mono pl-[42px]">
                                        Original Size: {request.originalSize} 
                                        {request.type === 'EXCHANGE' && ` · Desired Size: ${request.exchangeTargetSize}`}
                                      </p>
                                      <p className="text-[var(--color-text)] text-[10px] normal-case italic font-medium pl-[42px]">
                                        Reason: "{request.reason}"
                                      </p>
                                      
                                      {/* Uploaded Condition Verification Photos */}
                                      {Array.isArray(request.images) && request.images.length > 0 && (
                                        <div className="pt-1.5 pb-1 pl-[42px]">
                                          <span className="text-[9px] text-[var(--color-muted)] font-mono block mb-1">📷 Verification Images:</span>
                                          <div className="flex flex-wrap gap-1.5">
                                            {request.images.map((imgUrl, imgIdx) => (
                                              <a href={imgUrl} target="_blank" rel="noopener noreferrer" key={imgIdx} className="block hover:opacity-90 transition-opacity">
                                                <img 
                                                  src={imgUrl} 
                                                  alt={`Verification proof ${imgIdx + 1}`} 
                                                  className="w-16 h-20 object-cover border border-amber-300 rounded hover:scale-105 transition-all cursor-pointer" 
                                                />
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {request.status === 'PENDING' && (
                                        <div className="flex gap-2 pt-1.5 pl-[42px]">
                                          <button
                                            disabled={actionLoading}
                                            onClick={() => {
                                              setApproveTargetOrder(order);
                                              setApproveTargetRequest(request);
                                              setAdminApproveInstructions('Reverse Pickup Scheduled (Courier agent will collect the package in 24-48 hours. Please keep tags intact.)');
                                              setAdminApproveCustomText('');
                                              setIsApproveModalOpen(true);
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[9px] tracking-wider uppercase px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            disabled={actionLoading}
                                            onClick={() => {
                                              setRejectTargetOrder(order);
                                              setRejectTargetItemIndex(request.itemIndex);
                                              setAdminRejectReason('Product has visible wear / tags removed');
                                              setAdminRejectCustomText('');
                                              setIsRejectModalOpen(true);
                                            }}
                                            className="bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-[9px] tracking-wider uppercase px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      )}
  
                                      {request.status === 'REJECTED' && request.adminComment && (
                                        <p className="text-[9px] font-sans text-rose-600 font-semibold normal-case pl-[42px]">
                                          Rejection Note: {request.adminComment}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Customer & shipping info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                            <div>
                              <span className="text-[8px] font-bold text-[var(--color-muted)] block tracking-widest">SHIPPING DESTINATION</span>
                              <span className="text-[var(--color-text)] font-bold block mt-0.5 text-[11px] leading-relaxed">{displayAddress}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-bold text-[var(--color-muted)] block tracking-widest">CONTACT SPEC DETAILS</span>
                              <span className="text-[var(--color-text)] font-bold block mt-0.5">{order.phone} · {order.email}</span>
                            </div>
                          </div>

                          {/* Purchased Garments */}
                          <div className="bg-[var(--color-surface)]/80 p-4 rounded-xl border border-[var(--color-border)]/50 space-y-2">
                            <span className="text-[8px] font-bold text-[var(--color-muted)] block tracking-widest">GARMENTS SPECIFICATION LIST</span>
                            <div className="divide-y divide-slate-850">
                              {parsedItems.map((item, itemIdx) => {
                                const matchingProd = products.find(p => p.$id === item.product_id || p.id === item.product_id || p.name.trim().toUpperCase() === item.name.trim().toUpperCase());
                                const imgUrl = matchingProd?.front_image_link || matchingProd?.image_url || matchingProd?.image || 'https://placehold.co/100x100?text=No+Asset';
                                return (
                                  <div key={itemIdx} className="flex justify-between items-center py-2 text-xs">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <a 
                                        href={`/product/${matchingProd?.$id || matchingProd?.id || item.product_id}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="hover:opacity-80 transition-opacity shrink-0"
                                      >
                                        <img 
                                          src={imgUrl} 
                                          alt={item.name} 
                                          className="w-8 h-10 object-cover object-center rounded border border-[var(--color-border)]/40 bg-neutral-900" 
                                        />
                                      </a>
                                      <a 
                                        href={`/product/${matchingProd?.$id || matchingProd?.id || item.product_id}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-black text-[var(--color-text)] uppercase tracking-wide truncate max-w-[200px] sm:max-w-xs hover:text-[var(--color-accent)] transition-colors"
                                      >
                                        {item.name}
                                      </a>
                                    </div>
                                    <span className="font-mono text-[var(--color-muted)] shrink-0 pl-2">Size: {item.size || 'M'} · Qty: {item.quantity} · ₹{item.price}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Actions to shift status */}
                          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-[var(--color-border)]/40">
                            {/* Reset to Pending button */}
                            {(order.status !== 'PENDING' && order.status !== 'CANCELLED') && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleOrderStatusShift(order, 'PENDING')}
                                className="bg-[var(--color-subtle)] hover:bg-slate-200 text-[var(--color-text)] font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Reset to Pending
                              </button>
                            )}
                            
                            {order.status === 'CANCELLED' && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleRemoveOrder(order)}
                                className="bg-rose-600 hover:bg-rose-750 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-rose-600 cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Delete Order
                              </button>
                            )}
                            
                            {/* Pending State transitions */}
                            {order.status === 'PENDING' && (
                              <>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => handleOrderStatusShift(order, 'PROCESSING')}
                                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-[var(--color-border)] cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  Start Processing
                                </button>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setShippedTargetOrder(order);
                                    setAdminTrackingNumber('');
                                    setAdminTrackingUrl('');
                                    setIsShippedModalOpen(true);
                                  }}
                                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-[var(--color-border)] cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  Mark as Shipped
                                </button>
                              </>
                            )}

                            {/* Processing State transitions */}
                            {order.status === 'PROCESSING' && (
                              <button
                                disabled={actionLoading}
                                onClick={() => {
                                  setShippedTargetOrder(order);
                                  setAdminTrackingNumber('');
                                  setAdminTrackingUrl('');
                                  setIsShippedModalOpen(true);
                                }}
                                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-[var(--color-border)] cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Mark as Shipped
                              </button>
                            )}

                            {/* Shipped State transitions */}
                            {order.status === 'SHIPPED' && (
                              <>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => handleOrderStatusShift(order, 'IN_TRANSIT')}
                                  className="bg-[var(--color-accent)] hover:bg-indigo-755 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-indigo-600 cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  Mark as In Transit
                                </button>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => handleOrderStatusShift(order, 'DELIVERED')}
                                  className="bg-emerald-600 hover:bg-emerald-755 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-emerald-600 cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  Mark as Delivered
                                </button>
                              </>
                            )}

                            {/* In Transit State transitions */}
                            {order.status === 'IN_TRANSIT' && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleOrderStatusShift(order, 'DELIVERED')}
                                className="bg-emerald-600 hover:bg-emerald-755 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-emerald-600 cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Mark as Delivered
                              </button>
                            )}

                            {order.status === 'CANCELLATION_REQUESTED' && (
                              <>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => handleOrderStatusShift(order, 'CANCELLED')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-emerald-600 cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  Approve Cancellation
                                </button>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => handleOrderStatusShift(order, 'PENDING')}
                                  className="bg-neutral-500 hover:bg-neutral-600 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-neutral-500 cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  Reject Request & Process
                                </button>
                              </>
                            )}

                            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'CANCELLATION_REQUESTED' && (
                              <button
                                disabled={actionLoading}
                                onClick={() => {
                                  setCancelTargetOrder(order);
                                  setAdminCancelReason('Out of Stock / Inventory Error');
                                  setAdminCancelCustomText('');
                                  setIsAdminCancelModalOpen(true);
                                }}
                                className="bg-rose-600 hover:bg-rose-750 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg border border-rose-600 cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ==========================================
              TAB 3: CAMPAIGNS & COUPONS ENGINE (Option 4)
              ========================================== */}
          {activeTab === 'campaigns' && (
            <div className="space-y-8">
              
              {/* Marquee Announcer Manager */}
              <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 rounded-2xl shadow-glass space-y-4">
                <div>
                  <h3 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase">DYNAMIC BANNER ANNOUNCEMENT</h3>
                  <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">Edit the live marquee banner announcement text displayed globally on the homepage.</p>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={campaignPromoText}
                    onChange={(e) => setCampaignPromoText(e.target.value)}
                    placeholder="ENTER MARQUEE ANNOUNCEMENT TEXT..."
                    className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-border)] rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider outline-hidden"
                  />
                  <button
                    onClick={saveCampaignPromoText}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)] text-white font-mono font-black text-xs tracking-widest uppercase px-6 rounded-xl cursor-pointer transition-all duration-300"
                  >
                    SAVE
                  </button>
                </div>
              </div>

              {/* Coupons Generator */}
              <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 rounded-2xl shadow-glass space-y-4">
                <div>
                  <h3 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase">PROMO COUPON MANAGER</h3>
                  <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">Activate or revoke coupon discount codes to enable live checkouts promotions.</p>
                </div>

                {/* Coupon Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)]">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-neutral-550 block tracking-widest uppercase">COUPON CODE</span>
                    <input
                      type="text"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="E.G., STREET50"
                      className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-mono font-black uppercase tracking-wider w-full outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-neutral-550 block tracking-widest uppercase">DISCOUNT %</span>
                    <select
                      value={newCouponDiscount}
                      onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                      className="bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-mono font-black uppercase tracking-wider w-full outline-hidden cursor-pointer"
                    >
                      <option value="10">10% OFF</option>
                      <option value="20">20% OFF</option>
                      <option value="30">30% OFF</option>
                      <option value="50">50% OFF</option>
                      <option value="75">75% OFF</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-neutral-550 block tracking-widest uppercase">MIN ORDER VALUE (INR, OPTIONAL)</span>
                    <input
                      type="number"
                      value={newCouponMinOrderValue}
                      onChange={(e) => setNewCouponMinOrderValue(e.target.value)}
                      placeholder="e.g. 1999"
                      className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-mono font-black w-full outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-neutral-550 block tracking-widest uppercase">VALID UNTIL (OPTIONAL)</span>
                    <input
                      type="date"
                      value={newCouponValidUntil}
                      onChange={(e) => setNewCouponValidUntil(e.target.value)}
                      className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs font-mono font-black w-full outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-2 w-full md:col-span-2 lg:col-span-1">
                    <button
                      type="button"
                      onClick={isEditingCoupon ? handleUpdateCoupon : handleAddCoupon}
                      className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono font-black text-xs tracking-widest uppercase py-2.5 rounded-xl cursor-pointer transition-colors w-full"
                    >
                      {isEditingCoupon ? 'UPDATE' : 'ACTIVATE'}
                    </button>
                    {isEditingCoupon && (
                      <button
                        type="button"
                        onClick={handleCancelEditCoupon}
                        className="bg-[var(--color-subtle)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-mono font-black text-xs tracking-widest uppercase py-1.5 rounded-xl cursor-pointer transition-colors w-full text-center"
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Coupons List */}
                <div className="space-y-2 mt-4">
                  <span className="text-[8px] font-bold text-[var(--color-muted)] block tracking-widest uppercase">ACTIVE EXCLUSIVE COUPONS ({campaignCoupons.length})</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {campaignCoupons.map((coupon, idx) => {
                      const minVal = coupon.min_order_value ? Number(coupon.min_order_value) : 0;
                      const validDate = coupon.valid_until || '';
                      const isExpired = coupon.isExpired;
                      return (
                        <div key={idx} className={`flex flex-col justify-between bg-[var(--color-surface)] p-4 rounded-xl border space-y-3 shadow-2xs hover:shadow-xs transition-shadow ${isExpired ? 'opacity-65 border-rose-200' : 'border-[var(--color-border)]'}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-black bg-[var(--color-accent)] text-white px-2.5 py-1 rounded border border-[var(--color-border)] tracking-wider">
                                {coupon.code}
                              </span>
                              <span className="text-[10px] font-black text-emerald-655 tracking-wider uppercase">
                                {coupon.discount}% SAVINGS
                              </span>
                              {isExpired && (
                                <span className="text-[8px] bg-rose-600 text-white font-mono uppercase px-1.5 py-0.5 font-bold rounded select-none">
                                  EXPIRED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleStartEditCoupon(coupon)}
                                className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCoupon(coupon.code)}
                                className="text-[9px] font-black text-rose-655 hover:text-rose-700 uppercase cursor-pointer"
                              >
                                Deactivate
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono border-t border-[var(--color-border)] pt-2 text-[var(--color-muted)]">
                            <div>
                              <span className="font-bold block uppercase text-[var(--color-text)]">MINIMUM ORDER</span>
                              <span>{minVal > 0 ? `₹${minVal.toLocaleString('en-IN')}` : 'NO MINIMUM'}</span>
                            </div>
                            <div>
                              <span className="font-bold block uppercase text-[var(--color-text)]">VALID UNTIL</span>
                              <span>{validDate ? new Date(validDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'NEVER EXPIRES'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Newsletter & Campaign Broadcaster Section */}
              <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 rounded-2xl shadow-glass space-y-6">
                <div>
                  <h3 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase">NEWSLETTER & EMAIL CAMPAIGN BROADCASTER</h3>
                  <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5">Send a one-click newsletter broadcast email or notification to all subscribed users.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Compose Form */}
                  <div className="lg:col-span-2 space-y-4 backdrop-blur-sm bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-5 rounded-2xl shadow-glass">
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                      <h4 className="text-[10px] font-black tracking-widest text-[var(--color-text)] uppercase">COMPOSE BROADCAST CAMPAIGN</h4>
                      {isEmailJSConfigured ? (
                        <span className="text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 uppercase tracking-wider animate-pulse">
                          🟢 EmailJS Active (Live)
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 uppercase tracking-wider">
                          🟡 Simulation Mode
                        </span>
                      )}
                    </div>

                    {!isEmailJSConfigured && (
                      <div className="bg-amber-500/5 border border-amber-500/15 p-3.5 font-mono text-[9px] text-amber-400/90 uppercase tracking-wider space-y-1">
                        <span className="font-bold block text-amber-300">ℹ️ SETUP EMAILJS FOR REAL EMAILS:</span>
                        <p className="normal-case text-[9px] text-[var(--color-muted)] leading-relaxed">
                          Currently running in offline simulation mode. To send real emails to your subscribers, configure these keys in your <code className="bg-black/30 px-1 py-0.5 rounded text-neutral-200">.env</code> file:
                        </p>
                        <div className="pt-1 select-all font-bold text-[8px] text-neutral-400 font-mono space-y-0.5">
                          <div>VITE_EMAILJS_SERVICE_ID="your_service_id"</div>
                          <div>VITE_EMAILJS_TEMPLATE_ID="your_template_id"</div>
                          <div>VITE_EMAILJS_PUBLIC_KEY="your_public_key"</div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-black text-[var(--color-muted)] block tracking-widest uppercase">CAMPAIGN SUBJECT</span>
                      <input
                        type="text"
                        value={campaignSubject}
                        onChange={(e) => setCampaignSubject(e.target.value)}
                        placeholder="ENTER CAMPAIGN SUBJECT..."
                        disabled={isBroadcasting}
                        className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-border)] rounded-xl px-3.5 py-3 text-xs font-bold uppercase tracking-wider w-full outline-hidden disabled:opacity-50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-black text-[var(--color-muted)] block tracking-widest uppercase">CAMPAIGN BODY CONTENT</span>
                      <textarea
                        rows="5"
                        value={campaignBody}
                        onChange={(e) => setCampaignBody(e.target.value)}
                        placeholder="WRITE YOUR BROADCAST EMAIL OR NOTIFICATION MESSAGE HERE..."
                        disabled={isBroadcasting}
                        className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-border)] rounded-xl px-3.5 py-3 text-xs font-medium w-full outline-hidden disabled:opacity-50 font-sans"
                      />
                    </div>

                    <div className="pt-2">
                      {isBroadcasting ? (
                        <div className="space-y-2">
                          <div className="w-full bg-neutral-900 h-2 overflow-hidden relative">
                            <div 
                              className="bg-[var(--color-accent)] h-full transition-all duration-300"
                              style={{ width: `${(broadcastingProgress / Math.max(1, newsletterSubscribers.length)) * 100}%` }}
                            />
                          </div>
                          <p className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider text-center">
                            Broadcasting: {broadcastingProgress} / {newsletterSubscribers.length} emails dispatched...
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={handleSendCampaign}
                          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono font-black text-xs tracking-widest uppercase py-3.5 px-6 rounded-xl cursor-pointer transition-colors"
                        >
                          🚀 Send Broadcast Campaign Once
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Audience Panel */}
                  <div className="space-y-3 backdrop-blur-sm bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-5 rounded-2xl shadow-glass flex flex-col max-h-[520px] overflow-hidden">
                    
                    {/* Category Tabs */}
                    <div className="grid grid-cols-3 gap-1.5 bg-black/15 p-1 rounded-xl">
                      {[
                        { key: 'subscribers', label: 'Subscribers', icon: '📧', count: newsletterSubscribers.length },
                        { key: 'customers',   label: 'All Users',   icon: '👥', count: [...new Set(orders.map(o => o.userEmail || o.email || o.user?.email).filter(Boolean))].length + newsletterSubscribers.length },
                        { key: 'manual',      label: 'Manual Pick', icon: '🎯', count: selectedEmails.size },
                      ].map(tab => (
                        <button key={tab.key}
                          onClick={() => { setBroadcastTarget(tab.key); setEmailSearch(''); }}
                          type="button"
                          className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-lg transition-all cursor-pointer border ${
                            broadcastTarget === tab.key
                              ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-md shadow-emerald-950/20'
                              : 'bg-transparent border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs mb-0.5">{tab.icon}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-center leading-none block">{tab.label}</span>
                          <span className={`mt-1.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                            broadcastTarget === tab.key ? 'bg-white/20 text-white' : 'bg-black/25 text-[var(--color-text)]'
                          }`}>{tab.count}</span>
                        </button>
                      ))}
                    </div>

                    {/* Search bar */}
                    <input
                      type="text"
                      value={emailSearch}
                      onChange={e => setEmailSearch(e.target.value)}
                      placeholder="Search email..."
                      className="bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[10px] font-mono w-full outline-none focus:border-[var(--color-accent)]"
                    />

                    {/* Select All / Clear for manual */}
                    {broadcastTarget === 'manual' && (() => {
                      const allEmails = [
                        ...newsletterSubscribers.map(s => ({ email: s.email, label: s.email, tag: 'Subscriber' })),
                        ...[...new Set(orders.map(o => o.userEmail || o.email || o.user?.email).filter(Boolean))]
                          .filter(e => !newsletterSubscribers.find(s => s.email === e))
                          .map(e => ({ email: e, label: e, tag: 'Customer' }))
                      ].filter(item => item.email.toLowerCase().includes(emailSearch.toLowerCase()));
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-wider text-[var(--color-muted)]">
                              {selectedEmails.size} selected
                            </span>
                            <div className="flex gap-2">
                              <button onClick={() => setSelectedEmails(new Set(allEmails.map(e => e.email)))}
                                className="text-[8px] font-bold text-[var(--color-accent)] uppercase tracking-wider cursor-pointer hover:underline">
                                Select All
                              </button>
                              <button onClick={() => setSelectedEmails(new Set())}
                                className="text-[8px] font-bold text-rose-500 uppercase tracking-wider cursor-pointer hover:underline">
                                Clear
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                            {allEmails.map(item => (
                              <div key={item.email}
                                onClick={() => {
                                  const next = new Set(selectedEmails);
                                  if (next.has(item.email)) next.delete(item.email); else next.add(item.email);
                                  setSelectedEmails(next);
                                }}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                                  selectedEmails.has(item.email)
                                    ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/40'
                                    : 'bg-[var(--color-subtle)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                                }`}
                              >
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                  selectedEmails.has(item.email) ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-border)]'
                                }`}>
                                  {selectedEmails.has(item.email) && <span className="text-white text-[8px] font-black">✓</span>}
                                </div>
                                <span className="text-[10px] font-mono text-[var(--color-text)] truncate flex-1">{item.email}</span>
                                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                                  item.tag === 'Subscriber' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                                }`}>{item.tag}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}

                    {/* Subscribers list */}
                    {broadcastTarget === 'subscribers' && (
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-black uppercase tracking-wider text-[var(--color-muted)]">{newsletterSubscribers.length} subscribers</span>
                        </div>
                        {newsletterSubscribers.filter(s => s.email.toLowerCase().includes(emailSearch.toLowerCase())).length === 0 ? (
                          <p className="text-[9px] text-[var(--color-muted)] font-mono uppercase text-center py-8">No subscribers found</p>
                        ) : (
                          newsletterSubscribers.filter(s => s.email.toLowerCase().includes(emailSearch.toLowerCase())).map((sub, idx) => (
                            <div key={sub.$id || idx} className="flex items-center gap-2 p-2 bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-lg justify-between">
                              <span className="text-[10px] font-mono text-[var(--color-text)] font-semibold truncate">{sub.email}</span>
                              <span className="text-[8px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded uppercase flex-shrink-0">Newsletter</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* All Customers list */}
                    {broadcastTarget === 'customers' && (() => {
                      const customerEmails = [...new Set(orders.map(o => o.userEmail || o.email || o.user?.email).filter(Boolean))];
                      const subEmails = new Set(newsletterSubscribers.map(s => s.email));
                      const allUnique = [
                        ...newsletterSubscribers.map(s => ({ email: s.email, tag: 'Subscriber' })),
                        ...customerEmails.filter(e => !subEmails.has(e)).map(e => ({ email: e, tag: 'Customer' }))
                      ].filter(item => item.email.toLowerCase().includes(emailSearch.toLowerCase()));
                      return (
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-black uppercase tracking-wider text-[var(--color-muted)]">{allUnique.length} total recipients</span>
                          </div>
                          {allUnique.length === 0 ? (
                            <p className="text-[9px] text-[var(--color-muted)] font-mono uppercase text-center py-8">No customers found</p>
                          ) : (
                            allUnique.map(item => (
                              <div key={item.email} className="flex items-center gap-2 p-2 bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-lg justify-between">
                                <span className="text-[10px] font-mono text-[var(--color-text)] font-semibold truncate">{item.email}</span>
                                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                                  item.tag === 'Subscriber' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                                }`}>{item.tag}</span>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })()}

                    {/* Send target summary */}
                    <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                      <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-wider">Will send to:</span>
                      <span className="text-[9px] font-black text-[var(--color-accent)] uppercase tracking-wider">
                        {broadcastTarget === 'subscribers' && `${newsletterSubscribers.length} subscribers`}
                        {broadcastTarget === 'customers' && `${[...new Set([...newsletterSubscribers.map(s=>s.email), ...orders.map(o=>o.userEmail||o.email||o.user?.email).filter(Boolean)])].length} recipients`}
                        {broadcastTarget === 'manual' && `${selectedEmails.size} selected`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campaign Sent History */}
                <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
                  <h4 className="text-[10px] font-black tracking-widest text-[var(--color-text)] uppercase">BROADCAST CAMPAIGNS SENT HISTORY ({campaignHistory.length})</h4>
                  {campaignHistory.length === 0 ? (
                    <p className="text-[9px] text-[var(--color-muted)] font-mono uppercase py-4">No broadcast history recorded</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="overflow-x-auto w-full rounded-xl border border-[var(--color-border)]"><table className="w-full border-collapse text-[10px] text-left font-mono">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)] uppercase tracking-wider">
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Body Preview</th>
                            <th className="py-2.5 px-3">Recipients</th>
                            <th className="py-2.5 px-3">Date Sent</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]/50">
                          {campaignHistory.map((camp) => (
                            <tr key={camp.id} className="hover:bg-[var(--color-subtle)]/40 transition-colors">
                              <td className="py-3 px-3 font-bold text-[var(--color-text)] uppercase max-w-[150px] truncate">{camp.subject}</td>
                              <td className="py-3 px-3 text-[var(--color-muted)] max-w-[250px] truncate">{camp.body}</td>
                              <td className="py-3 px-3 text-neutral-800">{camp.recipientsCount} Subscribers</td>
                              <td className="py-3 px-3 text-[var(--color-muted)]">
                                {new Date(camp.sentAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-emerald-600 font-black uppercase text-[8px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 select-none">
                                  DELIVERED ✓
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 4: STORE ACTIVITY LOGS
              ========================================== */}
          {activeTab === 'telemetry' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Restock Alerts Section */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-[var(--color-border)] flex items-center justify-between">
                  <h2 className="text-xs font-mono font-black tracking-[0.2em] text-[var(--color-text)] uppercase">Restock Requests</h2>
                  <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase font-black">{restockNotifications.length} REQUESTS</span>
                </div>
                
                {telemetryLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-[var(--color-muted)] animate-pulse uppercase tracking-widest">Loading data...</div>
                ) : restockNotifications.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-subtle)]/50">
                    <p className="text-xs font-black tracking-wide text-[var(--color-muted)] uppercase">No size restock requests logged.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                    <div className="overflow-x-auto">
                      <div className="overflow-x-auto w-full rounded-xl border border-[var(--color-border)]"><table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[var(--color-subtle)] border-b border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">
                            <th className="p-4">Email Address</th>
                            <th className="p-4">Product</th>
                            <th className="p-4">Size</th>
                            <th className="p-4">Time Requested</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                          {restockNotifications.map((n, idx) => {
                            const foundProd = products.find(p => p.$id === n.productId || p.id === n.productId);
                            return (
                              <tr key={n.$id || idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-subtle)]/50 transition-colors">
                                <td className="p-4 font-bold text-[var(--color-text)] select-all lowercase">{n.email}</td>
                                <td className="p-4">
                                  <Link 
                                    to={`/product/${foundProd?.slug || n.productId}`} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 font-bold text-[var(--color-text)] hover:text-[var(--color-accent)] hover:underline transition-colors cursor-pointer"
                                  >
                                    {(() => {
                                      const img = foundProd?.front_image_link || foundProd?.image_url || foundProd?.image;
                                    return (
                                      <>
                                        {img ? (
                                          <img 
                                            src={img} 
                                            alt={foundProd?.name || 'Product'} 
                                            className="w-10 h-12 object-cover border border-[var(--color-border)] shrink-0 bg-[var(--color-subtle)]"
                                          />
                                        ) : (
                                          <div className="w-10 h-12 bg-[var(--color-subtle)] border border-[var(--color-border)] shrink-0 flex items-center justify-center text-[8px] font-bold text-[var(--color-muted)]">
                                            NO IMG
                                          </div>
                                        )}
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-xs uppercase truncate max-w-[180px] block">
                                            {foundProd ? foundProd.name : "Unknown Product"}
                                          </span>
                                          <span className="font-mono text-[9px] text-[var(--color-muted)] mt-0.5 block">{n.productId}</span>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </Link>
                              </td>
                              <td className="p-4 font-black text-[var(--color-accent)]">{n.size}</td>
                              <td className="p-4 text-[10px] font-mono text-[var(--color-muted)]">{n.requestedAt ? new Date(n.requestedAt).toLocaleString('en-IN') : 'N/A'}</td>
                              <td className="p-4">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${n.notified ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                  {n.notified ? 'NOTIFIED' : 'PENDING'}
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-2">
                                {!n.notified && (
                                  <button
                                    disabled={actionLoading}
                                    onClick={() => handleConfirmRestock(n.$id)}
                                    className="text-emerald-600 hover:text-emerald-800 font-bold hover:underline cursor-pointer disabled:opacity-50 text-[9px] tracking-widest uppercase font-mono border border-emerald-100 hover:border-emerald-350 px-2.5 py-1 transition-all bg-emerald-50/20 rounded-sm"
                                  >
                                    Confirm
                                  </button>
                                )}
                                <button
                                  disabled={actionLoading}
                                  onClick={() => handleDeleteRestock(n.$id)}
                                  className="text-rose-650 hover:text-rose-800 font-bold hover:underline cursor-pointer disabled:opacity-50 text-[9px] tracking-widest uppercase font-mono border border-rose-100 hover:border-rose-350 px-2.5 py-1 transition-all bg-rose-50/20 rounded-sm"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Coupon Usage Logs Section */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-[var(--color-border)] flex items-center justify-between">
                  <h2 className="text-xs font-mono font-black tracking-[0.2em] text-[var(--color-text)] uppercase">Promo Coupon Usage</h2>
                  <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase font-black">{couponUsages.length} TOTAL USES</span>
                </div>
                
                {telemetryLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-[var(--color-muted)] animate-pulse uppercase tracking-widest">Loading data...</div>
                ) : couponUsages.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-subtle)]/50">
                    <p className="text-xs font-black tracking-wide text-[var(--color-muted)] uppercase">No active coupon usage history has been recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                    <div className="overflow-x-auto">
                      <div className="overflow-x-auto w-full rounded-xl border border-[var(--color-border)]"><table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[var(--color-subtle)] border-b border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">
                            <th className="p-4">Customer ID</th>
                            <th className="p-4">Coupon Applied</th>
                            <th className="p-4">Usage Count</th>
                            <th className="p-4">Last Used Time</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                          {couponUsages.map((c, idx) => (
                            <tr key={c.$id || idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-subtle)]/50 transition-colors">
                              <td className="p-4 font-mono select-all text-[10px]">{c.userId}</td>
                              <td className="p-4 font-black text-emerald-600 tracking-widest">{c.couponCode}</td>
                              <td className="p-4 font-mono font-black text-[var(--color-text)]">{c.usedCount}</td>
                              <td className="p-4 text-[10px] font-mono text-[var(--color-muted)]">{c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString('en-IN') : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Telemetry / Status Section */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-[var(--color-border)] flex items-center justify-between">
                  <h2 className="text-xs font-mono font-black tracking-[0.2em] text-[var(--color-text)] uppercase">Customer Cart Activity</h2>
                  <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase font-black">{activeCarts.length} TOTAL CARTS</span>
                </div>
                
                {telemetryLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-[var(--color-muted)] animate-pulse uppercase tracking-widest">Loading data...</div>
                ) : activeCarts.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-subtle)]/50">
                    <p className="text-xs font-black tracking-wide text-[var(--color-muted)] uppercase">No active cart activity recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                    <div className="overflow-x-auto">
                      <div className="overflow-x-auto w-full rounded-xl border border-[var(--color-border)]"><table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[var(--color-subtle)] border-b border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">
                            <th className="p-4">Customer ID</th>
                            <th className="p-4">Product Detail</th>
                            <th className="p-4">Size</th>
                            <th className="p-4">Price & Quantity</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                          {activeCarts.map((c, idx) => (
                            <tr key={c.$id || idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-subtle)]/50 transition-colors">
                              <td className="p-4 font-mono select-all text-[10px]">{c.userId}</td>
                              <td className="p-4 font-bold text-[var(--color-text)] truncate max-w-[180px]">{c.name}</td>
                              <td className="p-4 font-mono text-[var(--color-text)]">{c.size}</td>
                              <td className="p-4 text-[var(--color-muted)]">₹{c.price} x {c.quantity}</td>
                              <td className="p-4">
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-md ${
                                  c.cart_status === 'converted' 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                  : c.cart_status === 'abandoned' 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-250' 
                                  : 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-indigo-200 animate-pulse'
                                }`}>
                                  {c.cart_status || 'ACTIVE'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 5: HERO SLIDER MANAGEMENT
              ========================================== */}
          {activeTab === 'slider' && (
            <div className="space-y-8 animate-fade-in">
              <div className="pb-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <h2 className="text-xs font-mono font-black tracking-[0.2em] text-[var(--color-text)] uppercase">Hero Banner Slides</h2>
                <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase font-black">{slides.length} SLIDES ACTIVE</span>
              </div>

              {/* Add New Slide Form */}
              <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 rounded-2xl shadow-glass space-y-6">
                <h3 className="text-[10px] font-mono font-black tracking-widest text-[var(--color-text)] uppercase">➕ Add New Banner Slide</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Desktop Image Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Desktop Banner Image (1440x800 recommended)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste image URL or upload file..."
                        value={slideImage}
                        onChange={(e) => setSlideImage(e.target.value)}
                        className="grow bg-[var(--color-subtle)]/50 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors"
                      />
                      <label className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 py-2.5 text-xs font-bold uppercase transition-colors cursor-pointer rounded-xl flex items-center justify-center shrink-0">
                        {slideUploading ? "Uploading..." : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSlideImageUpload(e, false)}
                          disabled={slideUploading}
                        />
                      </label>
                    </div>
                    {slideImage && (
                      <div className="mt-2 relative w-32 aspect-[16/9] border border-[var(--color-border)] overflow-hidden bg-[var(--color-subtle)]">
                        <img src={slideImage} alt="Desktop Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setSlideImage("")} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[8px] hover:bg-red-800 leading-none">✕</button>
                      </div>
                    )}
                  </div>

                  {/* Mobile Image Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Mobile Banner Image (Optional - 800x1200 recommended)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste mobile image URL or upload..."
                        value={slideMobileImage}
                        onChange={(e) => setSlideMobileImage(e.target.value)}
                        className="grow bg-[var(--color-subtle)]/50 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors"
                      />
                      <label className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 py-2.5 text-xs font-bold uppercase transition-colors cursor-pointer rounded-xl flex items-center justify-center shrink-0">
                        {slideUploading ? "Uploading..." : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSlideImageUpload(e, true)}
                          disabled={slideUploading}
                        />
                      </label>
                    </div>
                    {slideMobileImage && (
                      <div className="mt-2 relative w-20 aspect-[3/4] border border-[var(--color-border)] overflow-hidden bg-[var(--color-subtle)]">
                        <img src={slideMobileImage} alt="Mobile Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setSlideMobileImage("")} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[8px] hover:bg-red-800 leading-none">✕</button>
                      </div>
                    )}
                  </div>

                  {/* Click Redirect Link */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Destination Redirect Link (e.g., /shop or /category/printed-tshirt)</label>
                    <input
                      type="text"
                      placeholder="E.G., /shop"
                      value={slideLink}
                      onChange={(e) => setSlideLink(e.target.value)}
                      className="w-full bg-[var(--color-subtle)]/50 border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSlide}
                  disabled={actionLoading || slideUploading || !slideImage.trim()}
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[10px] font-black tracking-widest px-6 py-3.5 rounded-xl uppercase transition-colors disabled:opacity-50 cursor-pointer"
                >
                  🚀 DEPLOY BANNER SLIDE
                </button>
              </div>

              {/* Active Slides Display Grid */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-mono font-black tracking-widest text-[var(--color-text)] uppercase">Active Banners</h3>
                
                {slidesLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-[var(--color-muted)] animate-pulse uppercase tracking-widest">Loading Slides...</div>
                ) : slides.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[var(--color-border)] bg-[var(--color-subtle)]/50">
                    <p className="text-xs font-black tracking-wide text-[var(--color-muted)] uppercase">No active homepage slides. Falling back to default banners.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {slides.map((slide) => (
                      <div key={slide.$id} className="border border-[var(--color-border)]/10 bg-[var(--color-surface)] p-4 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex gap-4">
                            <div className="w-1/2 aspect-[16/9] border border-[var(--color-border)] overflow-hidden bg-[var(--color-subtle)] relative">
                              <img src={slide.image} alt="Desktop slide view" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[7px] font-bold px-1 py-0.5 uppercase">DESKTOP</span>
                            </div>
                            {slide.mobileImage ? (
                              <div className="w-1/4 aspect-[3/4] border border-[var(--color-border)] overflow-hidden bg-[var(--color-subtle)] relative">
                                <img src={slide.mobileImage} alt="Mobile slide view" className="w-full h-full object-cover" />
                                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[7px] font-bold px-1 py-0.5 uppercase">MOBILE</span>
                              </div>
                            ) : (
                              <div className="w-1/4 aspect-[3/4] border border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] text-[8px] uppercase">
                                No Mobile View
                              </div>
                            )}
                          </div>

                          <div className="text-[10px] font-mono space-y-1">
                            <div className="truncate"><span className="text-[var(--color-muted)]">LINK:</span> <span className="font-bold">{slide.link || "None"}</span></div>
                            <div><span className="text-[var(--color-muted)]">CREATED:</span> <span>{new Date(slide.$createdAt).toLocaleString()}</span></div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSlide(slide.$id)}
                          className="w-full border border-red-500 text-red-500 hover:bg-red-50 text-[9px] font-mono font-bold tracking-widest py-2 uppercase transition-all cursor-pointer"
                        >
                          🗑️ DELETE SLIDE
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-8 animate-fade-in text-[var(--color-text)]">
              <div className="pb-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xs font-mono font-black tracking-[0.2em] text-[var(--color-text)] uppercase">Category Manager</h2>
                  <p className="text-[10px] text-[var(--color-muted)] font-mono mt-1 uppercase">Configure custom category cover image overrides and rename categories across products.</p>
                </div>
                {deletedCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setActionLoading(true);
                        await categoryService.restoreAllCategories();
                        setDeletedCategories([]);
                        showToast("✓ All deleted categories restored!", "success");
                      } catch (err) {
                        console.error("Failed to restore categories:", err);
                        showToast("Failed to restore categories.", "error");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="border border-[var(--color-border)] hover:bg-[var(--color-accent)] hover:text-white text-[var(--color-text)] text-[9px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-xl uppercase transition-all cursor-pointer select-none shrink-0"
                  >
                    🔄 Restore Defaults ({deletedCategories.length})
                  </button>
                )}
              </div>

              <div className="backdrop-blur-md bg-[var(--glass-bg)] border border-[var(--glass-border-green)] p-6 rounded-2xl shadow-glass space-y-6">
                <div className="overflow-x-auto">
                  <div className="overflow-x-auto w-full rounded-xl border border-[var(--color-border)]"><table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="pb-3 text-[10px] font-mono font-black tracking-widest text-[var(--color-muted)] uppercase w-16">Preview</th>
                        <th className="pb-3 text-[10px] font-mono font-black tracking-widest text-[var(--color-muted)] uppercase">Category Information</th>
                        <th className="pb-3 text-[10px] font-mono font-black tracking-widest text-[var(--color-muted)] uppercase w-28 text-center">Live Drops</th>
                        <th className="pb-3 text-[10px] font-mono font-black tracking-widest text-[var(--color-muted)] uppercase">Cover Image Override</th>
                        <th className="pb-3 text-[10px] font-mono font-black tracking-widest text-[var(--color-muted)] uppercase text-right w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {(() => {
                        const uniqueProductCategories = Array.from(
                          new Set(products.map(p => p.category).filter(Boolean))
                        );

                        const categoriesList = [...DEFAULT_CATEGORIES];
                        uniqueProductCategories.forEach(cat => {
                          const value = cat.toLowerCase().trim();
                          if (!categoriesList.some(item => item.value === value)) {
                            const label = cat.replace(/-/g, ' ').toUpperCase();
                            categoriesList.push({ value, label });
                          }
                        });

                        const activeCategoriesList = categoriesList.filter(
                          c => !deletedCategories.includes(c.value)
                        );

                        return activeCategoriesList.map((cat) => {
                          const productCount = products.filter(p => p.category === cat.value).length;
                          const currentImageUrl = getCategoryImagePreview(cat.value);
                          const inputUrl = newCategoryImageUrls[cat.value] || categoryImages[cat.value] || "";
                          const isEditing = editingCategory === cat.value;
                          const isUploading = categoryUploading[cat.value] || false;

                          return (
                            <tr key={cat.value} className="align-middle">
                              {/* Preview Column */}
                              <td className="py-4 pr-4">
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)]/10">
                                  <img 
                                    src={currentImageUrl} 
                                    alt={cat.label} 
                                    className="w-full h-full object-cover object-center" 
                                    onError={(e) => {
                                      e.target.src = 'https://placehold.co/150x150?text=FITS';
                                    }}
                                  />
                                </div>
                              </td>

                              {/* Info Column */}
                              <td className="py-4 pr-4">
                                {isEditing ? (
                                  <div className="flex flex-col gap-2 max-w-xs">
                                    <input
                                      type="text"
                                      value={editCategoryName}
                                      onChange={(e) => setEditCategoryName(e.target.value)}
                                      className="bg-[var(--color-subtle)]/50 border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] font-bold outline-hidden uppercase tracking-wider"
                                      placeholder="New Category Name..."
                                      autoFocus
                                    />
                                    <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-widest leading-relaxed">
                                      WARNING: This will update category tags on all matching live drops.
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">{cat.label}</h4>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase">SLUG:</span>
                                      <code className="text-[9px] font-mono bg-[var(--color-subtle)] text-[var(--color-muted)] px-1 py-0.5 rounded-sm">{cat.value}</code>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Live Drops Column */}
                              <td className="py-4 pr-4 text-center">
                                <span className="inline-block px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest rounded-xl bg-[var(--color-subtle)] text-[var(--color-text)] uppercase">
                                  {productCount} Drop{productCount !== 1 ? 's' : ''}
                                </span>
                              </td>

                              {/* Image Override Column */}
                              <td className="py-4 pr-4">
                                <div className="flex flex-col gap-2 max-w-sm">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Paste Category Image Cover URL..."
                                      value={inputUrl}
                                      onChange={(e) => {
                                        const urlVal = e.target.value;
                                        setNewCategoryImageUrls(prev => ({ ...prev, [cat.value]: urlVal }));
                                      }}
                                      className="grow bg-[var(--color-subtle)]/50 border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider focus:border-[var(--color-border)] transition-colors"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveCategoryImage(cat.value, inputUrl)}
                                      className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[9px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-xl uppercase transition-colors shrink-0 cursor-pointer"
                                    >
                                      Save Cover
                                    </button>
                                  </div>
                                  
                                  {/* Upload local image field */}
                                  <div className="flex items-center gap-2">
                                    <label className="text-[9px] font-mono font-black text-[var(--color-muted)] uppercase tracking-widest hover:text-[var(--color-text)] transition-colors cursor-pointer border border-dashed border-[var(--color-border)] px-3 py-1 hover:border-neutral-600">
                                      {isUploading ? "Uploading to Cloud..." : "📁 Upload Cover Image file"}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleCategoryImageUpload(e, cat.value)}
                                        disabled={isUploading}
                                      />
                                    </label>
                                    {categoryImages[cat.value] && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            setActionLoading(true);
                                            await categoryService.saveCategoryImage(cat.value, "");
                                            const updated = { ...categoryImages };
                                            delete updated[cat.value];
                                            setCategoryImages(updated);
                                            setNewCategoryImageUrls(prev => ({ ...prev, [cat.value]: "" }));
                                            showToast("✓ Custom cover override cleared.", "success");
                                          } catch (err) {
                                            console.error("Failed to clear custom cover:", err);
                                            showToast("Failed to clear custom cover.", "error");
                                          } finally {
                                            setActionLoading(false);
                                          }
                                        }}
                                        className="text-[9px] font-mono text-red-500 hover:text-red-700 uppercase tracking-widest cursor-pointer ml-auto"
                                      >
                                        Clear Custom Cover
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="py-4 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRenameCategory(cat.value, editCategoryName)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-xl uppercase transition-colors cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCategory(null)}
                                      className="border border-[var(--color-border)] hover:bg-[var(--color-subtle)] text-[var(--color-muted)] text-[9px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-xl uppercase transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCategory(cat.value);
                                        setEditCategoryName(cat.label);
                                      }}
                                      className="border border-[var(--color-border)] hover:bg-[var(--color-subtle)] text-[var(--color-text)] text-[9px] font-mono font-bold tracking-widest px-3 py-2 rounded-xl uppercase transition-colors cursor-pointer"
                                    >
                                      ✏️ Rename
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteTargetCategory(cat);
                                        setIsDeleteCategoryModalOpen(true);
                                      }}
                                      className="border border-rose-600 hover:bg-rose-50 text-rose-600 text-[9px] font-mono font-bold tracking-widest px-3 py-2 rounded-xl uppercase transition-colors cursor-pointer"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="space-y-8 animate-fade-in text-[var(--color-text)]">
              {/* Header */}
              <div className="pb-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xs font-mono font-black tracking-[0.2em] text-[var(--color-text)] uppercase">Bundle Offers Manager</h2>
                  <p className="text-[10px] text-[var(--color-muted)] font-mono mt-1 uppercase">Configure automatic buy-X-for-Y bundle promotions and discounts.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Col */}
                <div className="lg:col-span-1 bg-[var(--color-surface)] border border-[var(--color-border)] p-6 space-y-6">
                  <div>
                    <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">
                      {isEditingOffer ? 'EDIT OFFER DETAIL' : 'CREATE NEW PROMOTION'}
                    </span>
                    <h3 className="text-xs font-mono font-black tracking-wider uppercase mt-1">
                      {isEditingOffer ? 'Modify Bundle Offer' : 'Add Bundle Offer'}
                    </h3>
                  </div>

                  <div className="space-y-4 font-mono text-[9px] uppercase tracking-wider text-[var(--color-muted)]">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                      <span className="font-black text-[var(--color-muted)]">Offer Title / Name</span>
                      <input
                        type="text"
                        value={newOfferName}
                        onChange={(e) => setNewOfferName(e.target.value)}
                        placeholder="E.G., BUY 3 TEES FOR 999"
                        className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase text-[var(--color-text)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Qty */}
                      <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                        <span className="font-black text-[var(--color-muted)]">Qty Required</span>
                        <input
                          type="number"
                          value={newOfferQty}
                          onChange={(e) => setNewOfferQty(Number(e.target.value))}
                          placeholder="3"
                          className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase text-[var(--color-text)]"
                        />
                      </div>

                      {/* Price */}
                      <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                        <span className="font-black text-[var(--color-muted)]">Bundle Price (₹)</span>
                        <input
                          type="number"
                          value={newOfferPrice}
                          onChange={(e) => setNewOfferPrice(e.target.value)}
                          placeholder="999"
                          className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase text-[var(--color-text)]"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                      <span className="font-black text-[var(--color-muted)]">Apply to Category (Optional)</span>
                      <select
                        value={newOfferCategory}
                        onChange={(e) => setNewOfferCategory(e.target.value)}
                        className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase text-[var(--color-text)] cursor-pointer"
                      >
                        <option value="" className="text-[var(--color-muted)] bg-[var(--color-surface)]">-- NONE (CHOOSE PRODUCTS BELOW) --</option>
                        {allCategories.map(cat => (
                          <option key={cat.value} value={cat.value} className="text-[var(--color-text)] bg-[var(--color-surface)]">{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tag */}
                    <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                      <span className="font-black text-[var(--color-muted)]">Apply by Keyword Tag (Optional)</span>
                      <input
                        type="text"
                        value={newOfferTag}
                        onChange={(e) => setNewOfferTag(e.target.value)}
                        placeholder="E.G., BUY3TEES999"
                        className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase text-[var(--color-text)]"
                      />
                    </div>

                    {/* Product checklist bulk selector */}
                    <div className="flex flex-col gap-1.5 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-[var(--color-muted)]">
                          Specific Products ({newOfferProductIds.length} Selected)
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const visibleIds = products
                                .filter(p => p.name.toLowerCase().includes(offerSearchQuery.toLowerCase()))
                                .map(p => p.$id || p.id);
                              setNewOfferProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                            }}
                            className="text-[8px] font-mono text-[var(--color-accent)] uppercase hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const visibleIds = products
                                .filter(p => p.name.toLowerCase().includes(offerSearchQuery.toLowerCase()))
                                .map(p => p.$id || p.id);
                              setNewOfferProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
                            }}
                            className="text-[8px] font-mono text-rose-600 uppercase hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={offerSearchQuery}
                        onChange={(e) => setOfferSearchQuery(e.target.value)}
                        placeholder="SEARCH PRODUCTS TO SELECT..."
                        className="w-full text-xs font-bold font-mono outline-hidden border-b border-[var(--color-border)] focus:border-[var(--color-border)] bg-transparent py-1 uppercase text-[var(--color-text)] mb-2"
                      />

                      <div className="border border-[var(--color-border)] bg-[var(--color-bg)] h-44 overflow-y-auto p-2 divide-y divide-[var(--color-border)] rounded-md font-sans">
                        {products
                          .filter(p => p.name.toLowerCase().includes(offerSearchQuery.toLowerCase()))
                          .map(p => {
                            const pId = p.$id || p.id;
                            const isChecked = newOfferProductIds.includes(pId);
                            return (
                              <label key={pId} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 px-1 select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewOfferProductIds(prev => [...prev, pId]);
                                    } else {
                                      setNewOfferProductIds(prev => prev.filter(id => id !== pId));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 accent-[var(--color-accent)] rounded-xl cursor-pointer"
                                />
                                <img src={p.front_image_link} alt="" className="w-6 h-6 object-cover object-center shrink-0 border border-[var(--color-border)] rounded" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[9px] font-bold truncate uppercase tracking-wider text-[var(--color-text)]">{p.name}</p>
                                  <p className="text-[8px] text-[var(--color-muted)] font-mono uppercase">₹{p.price} | {p.category}</p>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {isEditingOffer && (
                        <button
                          type="button"
                          onClick={handleCancelEditOffer}
                          className="w-full py-2.5 border border-neutral-300 hover:bg-[var(--color-subtle)] text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddOffer}
                        className={`py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-lg cursor-pointer transition-colors ${
                          isEditingOffer 
                            ? 'w-full bg-emerald-600 hover:bg-emerald-700' 
                            : 'col-span-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]'
                        }`}
                      >
                        {isEditingOffer ? 'Save Changes' : 'Create Offer'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Listing Col */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
                    <span className="text-[8px] font-mono font-black text-[var(--color-muted)] block tracking-widest uppercase">
                      Active Bundle Promotions ({offersList.length})
                    </span>
                  </div>

                  {loadingOffers ? (
                    <div className="text-center py-12 font-mono text-xs text-[var(--color-muted)] animate-pulse uppercase">
                      Loading offers list from database...
                    </div>
                  ) : offersList.length === 0 ? (
                    <div className="text-center py-12 font-mono text-xs text-[var(--color-muted)] border border-dashed border-[var(--color-border)] uppercase">
                      No offers configured yet. Use the panel on left to create one!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {offersList.map((offer) => {
                        let criteria = [];
                        if (offer.category) {
                          const catObj = allCategories.find(c => c.value === offer.category);
                          criteria.push(`Category: ${catObj ? catObj.label : offer.category.toUpperCase()}`);
                        }
                        if (offer.tag) criteria.push(`Tag: ${offer.tag.toUpperCase()}`);
                        if (Array.isArray(offer.productIds) && offer.productIds.length > 0) {
                          criteria.push(`${offer.productIds.length} Products`);
                        }
                        const criteriaText = criteria.join(" OR ") || "All Products (No Filter)";

                        return (
                          <div
                            key={offer.$id || offer.id}
                            className={`flex flex-col justify-between bg-[var(--color-surface)] p-5 rounded-xl border space-y-4 shadow-2xs hover:shadow-xs transition-all ${
                              !offer.is_active ? 'opacity-65 border-rose-200' : 'border-[var(--color-border)]'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="space-y-1">
                                <h4 className="text-xs font-mono font-black text-[var(--color-text)] uppercase tracking-wider">
                                  {offer.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-[9px] font-mono font-black bg-[var(--color-accent)] text-white px-2.5 py-0.5 rounded uppercase tracking-wider">
                                    BUY {offer.qty} FOR ₹{offer.price}
                                  </span>
                                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                    offer.is_active 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                      : 'bg-rose-50 border-rose-200 text-rose-700'
                                  }`}>
                                    {offer.is_active ? 'ACTIVE' : 'INACTIVE'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditOffer(offer)}
                                  className="text-[9.5px] font-bold text-blue-600 hover:text-blue-750 uppercase cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOffer(offer.$id || offer.id)}
                                  className="text-[9.5px] font-bold text-rose-600 hover:text-rose-750 uppercase cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            <div className="border-t border-[var(--color-border)] pt-3 space-y-2.5 text-[9px] font-mono uppercase tracking-wider text-[var(--color-muted)]">
                              <div>
                                <span className="font-bold text-[var(--color-text)] block">Criteria</span>
                                <span className="text-[8.5px] leading-relaxed break-all block text-[var(--color-text)]">{criteriaText}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1">
                                <span className="font-bold text-[var(--color-text)]">Status Toggle</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleOfferActive(offer)}
                                  className={`px-3 py-1 text-[8.5px] font-mono font-black rounded-lg border uppercase cursor-pointer transition-all ${
                                    offer.is_active 
                                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {offer.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>{/* Admin Cancellation Reason Modal Popup */}
      {isAdminCancelModalOpen && cancelTargetOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs" 
            onClick={() => setIsAdminCancelModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative z-60 w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">ADMIN PANEL OPERATIONS</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Cancel Order Manifest
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
                Please select a reason for cancelling order {cancelTargetOrder.order_number || cancelTargetOrder.$id?.substring(0, 12).toUpperCase()}. This will release inventory stock back to the active registry.
              </p>
            </div>
            
            {/* Options List */}
            <div className="space-y-2.5 font-sans">
              {[
                "Out of Stock / Inventory Error",
                "Customer Requested Cancellation",
                "Suspected Fraudulent Activity",
                "Incorrect pricing/checkout parameters",
                "Other"
              ].map((opt) => (
                <label 
                  key={opt} 
                  className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${
                    adminCancelReason === opt
                    ? 'border-[var(--color-border)] bg-[var(--color-subtle)]/50'
                    : 'border-[var(--color-border)] hover:border-neutral-400'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="admin_cancel_option"
                    checked={adminCancelReason === opt}
                    onChange={() => setAdminCancelReason(opt)}
                    className="mt-0.5 accent-[var(--color-accent)]"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text)] leading-normal select-none">
                    {opt}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Explanation Textarea */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">
                ADDITIONAL SPEC DETAIL / CUSTOM REASON
              </label>
              <textarea
                value={adminCancelCustomText}
                onChange={(e) => setAdminCancelCustomText(e.target.value)}
                placeholder="ENTER CUSTOM REASON DETAILS..."
                rows={3}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-neutral-450 focus:border-[var(--color-border)] text-xs font-semibold p-3 outline-hidden placeholder-[var(--color-muted)] font-sans tracking-wide resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsAdminCancelModalOpen(false)}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-xl cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={submitAdminCancelOrder}
                className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer shadow-md"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Sweep Product Confirmation Modal */}
      {isSweepProductModalOpen && sweepTargetProductId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs" 
            onClick={() => setIsSweepProductModalOpen(false)}
          />
          
          {/* Modal Container */}
           <div className="relative z-60 w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">DELETE PRODUCT</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Delete Product?
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
                Are you sure you want to permanently delete this product from the shop? This action cannot be undone.
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsSweepProductModalOpen(false)}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSweepProductItem}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Order Confirmation Modal */}
      {isDeleteOrderModalOpen && deleteTargetOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs" 
            onClick={() => setIsDeleteOrderModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative z-60 w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">DELETE CANCELLED ORDER</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Delete Order?
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
                Are you sure you want to permanently delete order #{deleteTargetOrder.order_number || deleteTargetOrder.$id?.substring(0,6).toUpperCase()} from the store databases? This action is irreversible.
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsDeleteOrderModalOpen(false)}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOrder}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {isShippedModalOpen && shippedTargetOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs" 
            onClick={() => setIsShippedModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative z-60 w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">ADMIN PANEL OPERATIONS</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Mark Order as Shipped
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
                Add tracking information for order {shippedTargetOrder.order_number || shippedTargetOrder.$id?.substring(0, 12).toUpperCase()}.
              </p>
            </div>
            
            {/* Tracking Number Input */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">
                CARRIER TRACKING NUMBER *
              </label>
              <input
                type="text"
                value={adminTrackingNumber}
                onChange={(e) => setAdminTrackingNumber(e.target.value)}
                placeholder="E.G., Delhivery: 123456789"
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-neutral-450 focus:border-[var(--color-border)] text-xs font-semibold p-3 outline-hidden placeholder-[var(--color-muted)] uppercase tracking-wider"
              />
            </div>

            {/* Tracking URL Input */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">
                CUSTOM TRACKING URL (OPTIONAL)
              </label>
              <input
                type="text"
                value={adminTrackingUrl}
                onChange={(e) => setAdminTrackingUrl(e.target.value)}
                placeholder="LEAVE BLANK TO DEFAULT TO DELHIVERY TRACKER..."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-neutral-450 focus:border-[var(--color-border)] text-xs font-semibold p-3 outline-hidden placeholder-[var(--color-muted)] tracking-wider"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsShippedModalOpen(false)}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAdminShippedOrder}
                className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer shadow-md"
              >
                Dispatch shipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Category Confirmation Modal */}
      {isDeleteCategoryModalOpen && deleteTargetCategory && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs" 
            onClick={() => {
              setIsDeleteCategoryModalOpen(false);
              setDeleteTargetCategory(null);
            }}
          />
          
          {/* Modal Container */}
          <div className="relative z-60 w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">DELETE CATEGORY</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Delete "{deleteTargetCategory.label}"?
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-2.5 leading-relaxed">
                This will clear the category field on all <strong className="text-[var(--color-text)] font-bold">{products.filter(p => p.category === deleteTargetCategory.value).length}</strong> product drops belonging to it.
              </p>
              <p className="text-[9.5px] text-red-600 font-mono uppercase tracking-wider mt-2 leading-relaxed">
                ⚠️ WARNING: The products will remain in the catalog but will be marked as "Uncategorized". Any cover override will also be permanently deleted.
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteCategoryModalOpen(false);
                  setDeleteTargetCategory(null);
                }}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Return/Exchange Rejection Modal Popup */}
      {isRejectModalOpen && rejectTargetOrder && rejectTargetItemIndex !== null && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs" 
            onClick={() => {
              setIsRejectModalOpen(false);
              setRejectTargetOrder(null);
              setRejectTargetItemIndex(null);
            }}
          />
          
          {/* Modal Container */}
          <div className="relative z-60 w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up max-h-[90vh] overflow-y-auto">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">ADMIN PANEL OPERATIONS</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Reject Return/Exchange Request
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
                Please select or enter the reason for rejecting this return/exchange request. This reason will be displayed to the customer.
              </p>
            </div>
            
            {/* Options List */}
            <div className="space-y-2.5 font-sans">
              {[
                "Product has visible wear / tags removed",
                "Product matches all parameters ordered",
                "Return/Exchange time window exceeded",
                "Item is marked as non-returnable",
                "Other"
              ].map((opt) => (
                <label 
                  key={opt} 
                  className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${
                    adminRejectReason === opt
                    ? 'border-[var(--color-border)] bg-[var(--color-subtle)]/50'
                    : 'border-[var(--color-border)] hover:border-neutral-400'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="admin_reject_option"
                    checked={adminRejectReason === opt}
                    onChange={() => setAdminRejectReason(opt)}
                    className="mt-0.5 accent-[var(--color-accent)]"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text)] leading-normal select-none">
                    {opt}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Explanation Textarea */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">
                ADDITIONAL SPEC DETAIL / CUSTOM REASON
              </label>
              <textarea
                value={adminRejectCustomText}
                onChange={(e) => setAdminRejectCustomText(e.target.value)}
                placeholder="ENTER CUSTOM REJECTION DETAIL..."
                rows={3}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-neutral-450 focus:border-[var(--color-border)] text-xs font-semibold p-3 outline-hidden placeholder-[var(--color-muted)] font-sans tracking-wide resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectTargetOrder(null);
                  setRejectTargetItemIndex(null);
                }}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-xl cursor-pointer"
              >
                Cancel Action
              </button>
              <button
                type="button"
                onClick={submitAdminRejectRequest}
                className="w-full py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer shadow-md"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Return/Exchange Approval Modal Popup */}
      {isApproveModalOpen && approveTargetOrder && approveTargetRequest && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs" 
            onClick={() => {
              setIsApproveModalOpen(false);
              setApproveTargetOrder(null);
              setApproveTargetRequest(null);
            }}
          />
          
          {/* Modal Container */}
          <div className="relative z-60 w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 text-[var(--color-text)] animate-scale-up max-h-[90vh] overflow-y-auto">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">ADMIN PANEL OPERATIONS</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-[var(--color-text)] mt-1">
                Approve {approveTargetRequest.type === 'RETURN' ? 'Return' : 'Exchange'} Request
              </h2>
              <p className="text-[9px] text-neutral-455 uppercase tracking-wider mt-0.5 leading-relaxed">
                Choose return shipping instructions or reverse pickup details. This message will be sent to the customer's order tracking page.
              </p>
            </div>
            
            {/* Options List */}
            <div className="space-y-2.5 font-sans">
              {[
                "Reverse Pickup Scheduled (Courier agent will collect the package in 24-48 hours. Please keep tags intact.)",
                "Self-Ship Required (Please ship the product to our warehouse address: Shop No 5, Active Towers, Mumbai - 400001, and share tracking receipt.)",
                "Refund Initiated Directly (No physical return required for this specific drop.)",
                "Other"
              ].map((opt) => (
                <label 
                  key={opt} 
                  className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${
                    adminApproveInstructions === opt
                    ? 'border-[var(--color-border)] bg-[var(--color-subtle)]/50'
                    : 'border-[var(--color-border)] hover:border-neutral-400'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="admin_approve_option"
                    checked={adminApproveInstructions === opt}
                    onChange={() => setAdminApproveInstructions(opt)}
                    className="mt-0.5 accent-[var(--color-accent)]"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text)] leading-normal select-none">
                    {opt}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Explanation Textarea */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">
                ADDITIONAL INSTRUCTIONS / CUSTOM LOGISTICS DETAIL
              </label>
              <textarea
                value={adminApproveCustomText}
                onChange={(e) => setAdminApproveCustomText(e.target.value)}
                placeholder="ENTER RETURN SHIPPING INSTRUCTIONS OR REVERSE TRACKING URL..."
                rows={3}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-neutral-450 focus:border-[var(--color-border)] text-xs font-semibold p-3 outline-hidden placeholder-[var(--color-muted)] font-sans tracking-wide resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => {
                  setIsApproveModalOpen(false);
                  setApproveTargetOrder(null);
                  setApproveTargetRequest(null);
                }}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-subtle)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-xl cursor-pointer"
              >
                Cancel Action
              </button>
              <button
                type="button"
                onClick={submitAdminApproveRequest}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer shadow-md"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default AdminPanel;