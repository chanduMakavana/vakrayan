import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'

function CategoryGrid() {
    const [searchParams] = useSearchParams()
    const shouldScroll = searchParams.get('scroll') === 'categories'

    useEffect(() => {
        if (shouldScroll) {
            const element = document.getElementById('categories-section')
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' })
                }, 100)
            }
        }
    }, [shouldScroll])

    const products = useSelector(state => state.products.items || [])

    // Get all unique categories from products
    const uniqueProductCategories = Array.from(
        new Set(products.map(p => p.category).filter(Boolean))
    )

    const defaultCategories = [
        { value: 'printed-tshirt', label: 'PRINTED T-SHIRTS' },
        { value: 'oversized-tshirt', label: 'OVERSIZED T-SHIRTS' },
        { value: 'shirts', label: 'SHIRTS' },
        { value: 'hoodies', label: 'HOODIES' },
    ]

    const categoriesList = []

    defaultCategories.forEach(c => {
        if (!categoriesList.some(item => item.value === c.value)) {
            categoriesList.push(c)
        }
    })

    uniqueProductCategories.forEach(cat => {
        const value = cat.toLowerCase().trim()
        if (!categoriesList.some(item => item.value === value)) {
            const label = cat.replace(/-/g, ' ').toUpperCase()
            categoriesList.push({ value, label })
        }
    })

    const getCategoryImage = (catValue) => {
        try {
            const overrides = JSON.parse(localStorage.getItem('category_images')) || {};
            if (overrides[catValue]) return overrides[catValue];
        } catch (e) {
            console.error("Error reading category_images from localStorage:", e);
        }

        if (catValue === 'printed-tshirt') return 'https://i.pinimg.com/736x/3b/e5/24/3be52487e4fcb982569c68fff31eae86.jpg';
        if (catValue === 'oversized-tshirt') return 'https://cdn1.ozone.ru/s3/multimedia-4/6643972660.jpg';
        if (catValue === 'shirts') return 'https://i.pinimg.com/originals/02/14/ef/0214efe3a76a76cbe65988be1e3315de.jpg';
        if (catValue === 'hoodies') return 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=300&q=80';

        const firstProd = products.find(p => p.category === catValue);
        return firstProd?.front_image_link || firstProd?.image_url || firstProd?.image || 'https://placehold.co/300x400?text=Streetwear';
    }

    return (
        <section id="categories-section" className="bg-[var(--color-bg)] py-16 px-4 border-b border-[var(--color-border)]">
            {/* Styled Section Headers */}
            <div className="mb-12 text-center">
                <h1 className="text-xl md:text-2xl font-black tracking-[0.25em] text-[#1D3557] uppercase">
                    CATEGORIES
                </h1>
            </div>

            {/* Category Cards Balanced Grid */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto px-4 w-full">
                {categoriesList.filter(c => {
                    try {
                        const deleted = JSON.parse(localStorage.getItem('deleted_categories')) || [];
                        return !deleted.includes(c.value);
                    } catch {
                        return true;
                    }
                }).map((c) => {
                    const img = getCategoryImage(c.value);
                    const targetLink = `/category/${c.value}`;

                    return (
                        <Link
                            key={c.value}
                            to={targetLink}
                            className="group flex flex-col items-center cursor-pointer w-[calc(50%-0.5rem)] sm:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-1.01rem)] lg:w-[calc(33.333%-1.34rem)] max-w-[320px] mx-auto"
                        >
                            {/* Image Container */}
                            <div className="w-full aspect-[4/5] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md group-hover:shadow-xl transition-shadow duration-300">
                                <img 
                                    src={img} 
                                    alt={c.label} 
                                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            
                            {/* Category Name below */}
                            <span className="mt-4 text-xs md:text-sm font-black tracking-widest text-[var(--color-text)] uppercase group-hover:text-[var(--color-accent)] transition-colors duration-200 text-center">
                                {c.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    )
}

export default CategoryGrid
