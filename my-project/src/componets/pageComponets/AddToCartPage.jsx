import React from 'react'
import { HiX } from 'react-icons/hi'
import { useSelector, useDispatch } from 'react-redux'
import { removeFromCart, increaseQuantity, decreaseQuantity } from '../../features/addToCart'

function AddToCartPage({ onClose }) {
    const cartItems = useSelector(state => state.cart)
    const dispatch = useDispatch()

    const getId = (product) => product?.id || product?._id

    const grandTotal = cartItems.reduce((acc, item) => {
        const price = Number(String(item.product?.price).replace(/[^0-9]/g, '')) || 0;
        return acc + price * (item.quantity || 1);
    }, 0);

    return (
        <div className="h-full w-full bg-[#121214] text-white flex flex-col selection:bg-red-500 selection:text-white">

            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <div>
                    <p className="text-[10px] text-red-500 font-black tracking-widest uppercase">Crew Bag</p>
                    <h2 className="text-lg font-black tracking-wider uppercase">Your Cart</h2>
                </div>
                <button
                    onClick={onClose}
                    className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
                >
                    <HiX className="text-xl" />
                </button>
            </div>

            {/* Cart Items */}
            {cartItems.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                    {cartItems.map((item, index) => {
                        const price = Number(String(item.product?.price).replace(/[^0-9]/g, '')) || 0;
                        const id = getId(item.product) || index;
                        return (
                            <div key={id} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                                <div className="flex items-center flex-1 gap-4">
                                    <img
                                        src={item.product?.image || ''}
                                        alt={item.product?.name}
                                        className="w-14 h-14 object-cover rounded-xl border border-white/5 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xs font-black uppercase tracking-wide text-gray-200 truncate">{item.product?.name}</h3>
                                        <p className="text-xs font-bold text-gray-400 mt-0.5">
                                            ₹{(price * (item.quantity || 1)).toLocaleString('en-IN')}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <button
                                                onClick={() => dispatch(decreaseQuantity(id))}
                                                className="w-6 h-6 bg-neutral-900 border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-md flex items-center justify-center cursor-pointer"
                                            >-</button>
                                            <span className="text-xs font-black text-white">{item.quantity || 1}</span>
                                            <button
                                                onClick={() => dispatch(increaseQuantity(id))}
                                                className="w-6 h-6 bg-neutral-900 border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-md flex items-center justify-center cursor-pointer"
                                            >+</button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => dispatch(removeFromCart(id))}
                                    className="ml-4 text-[10px] font-black tracking-widest text-red-400 hover:text-red-500 uppercase cursor-pointer shrink-0"
                                >
                                    Remove
                                </button>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 text-xs font-black tracking-widest uppercase">Your bag is empty</p>
                </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-white/10 shrink-0">
                <div className="flex justify-between items-center mb-4 px-1">
                    <span className="text-xs font-black tracking-widest text-gray-400 uppercase">Subtotal</span>
                    <span className="text-lg font-black text-white">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-4 px-1 tracking-wide leading-tight">
                    Shipping & discounts calculated at checkout.
                </p>
                <div className="flex flex-col gap-2">
                    <button className="w-full bg-white hover:bg-neutral-200 text-black font-black text-xs tracking-widest uppercase py-4 rounded-xl transition-all cursor-pointer shadow-xl">
                        Proceed To Checkout
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-transparent border border-white/5 hover:bg-white/5 text-gray-400 hover:text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl transition-all cursor-pointer"
                    >
                        Continue Shopping &rarr;
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AddToCartPage
