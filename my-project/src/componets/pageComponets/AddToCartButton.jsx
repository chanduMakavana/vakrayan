import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CgShoppingCart } from 'react-icons/cg'
import { motion, AnimatePresence } from 'framer-motion'
import cartService from '../../appwrite/cart'

function AddToCartButton({ product, selectedSize, variant = "default" }) {
    const navigate = useNavigate()
    
    // UI Visual States Management
    const [status, setStatus] = useState('idle') // states: 'idle' | 'loading' | 'success'

    const handleAdd = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (!product) return

        try {
            setStatus('loading')

            const response = await cartService.addToCart({
                name: product.name,
                size: selectedSize || product.sizes?.[0] || 'M',
                price: product.price,
                product_id: product.$id || product.id,
                product_Image: product.front_image_link || product.image_url || product.image
            })

            if (response) {
                setStatus('success')
                setTimeout(() => setStatus('idle'), 1500)
            }
        } catch (error) {
            console.error("Cart injection system crash:", error)
            setStatus('idle')
            alert("Supply chain bottleneck. Attempt failed.")
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
        return (
            <motion.button
                {...buttonClickSpring}
                onClick={handleAdd}
                disabled={status === 'loading'}
                className={`text-xs tracking-widest uppercase py-3 px-6 rounded-full transform translate-y-4 group-hover:translate-y-0 shadow-2xl font-black cursor-pointer select-none transition-all duration-300 min-w-35 flex items-center justify-center ${
                    status === 'success' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
            >
                <AnimatePresence mode="wait">
                    {status === 'idle' && (
                        /* ✅ CHANGED TO CLEAN 'Add To Cart' */
                        <motion.span {...textTransition} key="idle-overlay">Add To Cart</motion.span>
                    )}
                    {status === 'loading' && (
                        <motion.div {...textTransition} key="loading-overlay" className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
    return (
        <motion.button
            {...buttonClickSpring}
            onClick={handleAdd}
            disabled={status === 'loading'}
            className={`w-full flex items-center justify-center gap-2 font-black text-xs tracking-widest uppercase py-4 px-6 rounded-xl transition-all shadow-sm select-none cursor-pointer ${
                status === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-neutral-950 text-white hover:bg-neutral-800'
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
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
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