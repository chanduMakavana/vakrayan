import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { CgShoppingCart } from 'react-icons/cg'
import { addToCart } from '../../features/addToCart'

function AddToCartButton({ product, variant = "default" }) {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const loginData = useSelector(state => state.login)
    const isLoggedIn = loginData.some(user => user.isLogin === true)

    const handleAdd = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isLoggedIn) {
            navigate('/login')
            return
        }
        dispatch(addToCart(product))
    }

    if (variant === "overlay") {
        return (
            <button
                onClick={handleAdd}
                className="bg-white text-black font-bold text-xs tracking-widest uppercase py-3 px-6 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-2xl hover:bg-neutral-200 cursor-pointer"
            >
                Add To Cart
            </button>
        )
    }

    return (
        <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-black text-xs tracking-widest uppercase py-2.5 px-4 rounded-xl transition-all cursor-pointer"
        >
            <CgShoppingCart className="text-base" />
            Add To Cart
        </button>
    )
}

export default AddToCartButton
