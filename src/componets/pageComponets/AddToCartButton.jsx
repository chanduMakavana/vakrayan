import { useState } from 'react'
import { CgShoppingCart } from 'react-icons/cg'
import { motion, AnimatePresence } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import cartService from '../../services/cart'
import { addCartItemState } from '../../features/addToCart'
import { playZip } from '../../utils/sensoryHelper'
import { useToast } from '../../context/ToastContext'
import { generateGuestCartId, loadGuestCartItems, saveGuestCartItems } from '../../utils/guestCartHelper'

function AddToCartButton({ product, selectedSize, selectedColor, quantity = 1, variant = "default" }) {
    const dispatch = useDispatch()
    const { showToast } = useToast()

    const { user, isAuthenticated } = useSelector(state => state.auth)
    const cartItems = useSelector(state => state.cart || [])
    
    // UI Visual States Management
    const [status, setStatus] = useState('idle') // states: 'idle' | 'loading' | 'success'

    // Parse stocks mapping
    let stocks = {};
    try {
        stocks = JSON.parse(product?.sizes_stock || '{}');
    } catch {
        stocks = {};
    }

    // Check if completely out of stock across all defined sizes
    let isAllOutOfStock = false;
    const unionSizes = product ? Array.from(new Set([
        ...(product.sizes || []),
        ...Object.keys(stocks)
    ])).filter(sz => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(sz)) : [];

    if (unionSizes.length > 0) {
        const totalStock = unionSizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0);
        isAllOutOfStock = totalStock === 0;
    }

    // Check if selected size (or default fallback) is out of stock
    const baseSize = selectedSize || unionSizes[0] || 'M';
    const isSelectedSizeOutOfStock = stocks[baseSize] === 0;

    const handleAdd = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (!product) return

        const qtyNum = Number(quantity);

        if (!isAuthenticated || !user) {
            try {
                setStatus('loading')
                const baseSizeVal = selectedSize || product.sizes?.[0] || 'M'
                let targetSize = baseSizeVal
                if (selectedColor) {
                    targetSize = `${baseSizeVal} / ${selectedColor.toUpperCase()}`
                }
                const targetProductId = product.$id || product.id
                
                let guestItems = loadGuestCartItems();

                const existingCartItem = guestItems.find(
                    item => item.product_id === targetProductId && item.size === targetSize
                )

                const availableStock = stocks[baseSizeVal] !== undefined ? Number(stocks[baseSizeVal]) : 10;
                const currentQuantityInCart = existingCartItem ? Number(existingCartItem.quantity) : 0;
                if (currentQuantityInCart + qtyNum > availableStock) {
                    showToast(`Insufficient stock. Only ${availableStock} items left in stock for size ${baseSizeVal}.`, "error");
                    setStatus('idle');
                    return;
                }

                let response;
                if (existingCartItem) {
                    existingCartItem.quantity += qtyNum;
                    existingCartItem.subtotal = Number(existingCartItem.price) * existingCartItem.quantity;
                    response = existingCartItem;
                } else {
                    const itemPrice = Number(product.price);
                    response = {
                        $id: generateGuestCartId(),
                        name: product.name,
                        userId: 'guest',
                        size: targetSize,
                        price: itemPrice,
                        quantity: qtyNum,
                        subtotal: itemPrice * qtyNum,
                        product_id: targetProductId,
                        product_Image: product.front_image_link || product.image_url || product.image
                    };
                    guestItems.push(response);
                }

                saveGuestCartItems(guestItems);
                dispatch(addCartItemState(response))
                playZip()
                window.dispatchEvent(new Event('cart-item-added'))
                setStatus('success')
                setTimeout(() => {
                    setStatus('idle')
                }, 1500)
            } catch (error) {
                console.error("Guest cart insertion failure:", error)
                setStatus('idle')
                showToast(error.message || "Failed to add to cart.", "error")
            }
            return
        }

        try {
            setStatus('loading')

            const baseSizeVal = selectedSize || product.sizes?.[0] || 'M'
            let targetSize = baseSizeVal
            if (selectedColor) {
                targetSize = `${baseSizeVal} / ${selectedColor.toUpperCase()}`
            }
            const targetProductId = product.$id || product.id
            const existingCartItem = cartItems.find(
                item => item.product_id === targetProductId && item.size === targetSize
            )

            // Stock Validation check
            const availableStock = stocks[baseSizeVal] !== undefined ? Number(stocks[baseSizeVal]) : 10;
            const currentQuantityInCart = existingCartItem ? Number(existingCartItem.quantity) : 0;
            if (currentQuantityInCart + qtyNum > availableStock) {
                showToast(`Insufficient stock. Only ${availableStock} items left in stock for size ${baseSizeVal}.`, "error");
                setStatus('idle');
                return;
            }

            const response = await cartService.addToCart({
                name: product.name,
                size: targetSize,
                price: product.price,
                product_id: targetProductId,
                product_Image: product.front_image_link || product.image_url || product.image,
                userId: user.$id,
                existingCartItem,
                quantity: qtyNum
            })

            if (response) {
                dispatch(addCartItemState(response))
                playZip()
                window.dispatchEvent(new Event('cart-item-added'))
                setStatus('success')
                setTimeout(() => {
                    setStatus('idle')
                }, 1500)
            }
        } catch (error) {
            console.error("Cart injection system crash:", error)
            setStatus('idle')
            showToast(error.message || "Supply chain bottleneck. Attempt failed.", "error")
        }
    }

    // 🔮 ANIMATION VARIANTS
    const buttonClickSpring = {
        whileTap: { scale: 0.95, y: 1 },
        transition: { type: "spring", stiffness: 500, damping: 15 }
    }

    const textTransition = {
        initial: { y: 10, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -10, opacity: 0 },
        transition: { duration: 0.15, ease: "linear" }
    }

    // ==========================================
    // 🎴 CASE 1: OVERLAY VARIANT (Product Grid Card Layout)
    // ==========================================
    if (variant === "overlay") {
        if (isAllOutOfStock) {
            return (
                <button
                    disabled
                    className="text-xs tracking-widest uppercase py-3 px-6 rounded-none transform translate-y-4 group-hover:translate-y-0 shadow-2xl font-black bg-[var(--color-subtle)] text-[var(--color-muted)] cursor-not-allowed select-none min-w-35 flex items-center justify-center border border-[var(--color-border)]"
                >
                    <span>SOLD OUT</span>
                </button>
            )
        }

        return (
            <motion.button
                {...buttonClickSpring}
                onClick={handleAdd}
                disabled={status === 'loading'}
                className={`text-xs tracking-widest uppercase py-3 px-6 rounded-none transform translate-y-4 group-hover:translate-y-0 shadow-2xl font-black cursor-pointer select-none transition-all duration-300 min-w-35 flex items-center justify-center ${
                    status === 'success' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-[var(--color-surface)] text-black hover:bg-[var(--color-border)]'
                }`}
            >
                <AnimatePresence mode="wait">
                    {status === 'idle' && (
                        /* ✅ CHANGED TO CLEAN 'Add To Cart' */
                        <motion.span {...textTransition} key="idle-overlay">Add To Cart</motion.span>
                    )}
                    {status === 'loading' && (
                        <motion.div {...textTransition} key="loading-overlay" className="w-4 h-4 border-2 border-black border-t-transparent rounded-none animate-spin" />
                    )}
                    {status === 'success' && (
                        /* ✅ CHANGED TO CLEAN 'Add To Cart' WITH CHECKMARK */
                        <motion.span {...textTransition} key="success-overlay" className="text-white">Add To Cart ✓</motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
        )
    }

    // ==========================================
    // 🕹️ CASE 2: DEFAULT VARIANT (Product Details Stage Terminal)
    // ==========================================
    if (isAllOutOfStock || isSelectedSizeOutOfStock) {
        return (
            <button
                disabled
                className="w-full flex items-center justify-center gap-2 font-bold text-xs tracking-widest uppercase py-4 px-6 rounded-none bg-[var(--color-subtle)] text-[var(--color-muted)] border border-[var(--color-border)] cursor-not-allowed select-none font-sans"
            >
                <span>{isAllOutOfStock ? 'SOLD OUT' : 'OUT OF STOCK'}</span>
            </button>
        )
    }

    return (
        <motion.button
            {...buttonClickSpring}
            onClick={handleAdd}
            disabled={status === 'loading'}
            className={`w-full flex items-center justify-center gap-2 font-bold text-xs tracking-widest uppercase py-4 px-2 sm:px-4 md:px-6 rounded-none transition-all select-none cursor-pointer whitespace-nowrap ${
                status === 'success'
                ? 'bg-emerald-500 text-white border border-emerald-500'
                : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] border border-[var(--color-accent)]'
            }`}
        >
            <AnimatePresence mode="wait">
                {status === 'idle' && (
                    /* ✅ CHANGED TO CLEAN 'Add To Cart' WITH ICON */
                    <motion.div {...textTransition} key="idle-def" className="flex items-center gap-2">
                        <CgShoppingCart className="text-sm" />
                        <span>Add To Cart</span>
                    </motion.div>
                )}
                
                {status === 'loading' && (
                    <motion.div {...textTransition} key="loading-def" className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-none animate-spin" />
                        <span className="tracking-widest">Add To Cart...</span>
                    </motion.div>
                )}
                
                {status === 'success' && (
                    /* ✅ CHANGED TO CLEAN 'Add To Cart' SUCCESS STAMP */
                    <motion.div {...textTransition} key="success-def" className="flex items-center gap-1.5 text-white">
                        <span>Add To Cart ✓</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    )
}

export default AddToCartButton