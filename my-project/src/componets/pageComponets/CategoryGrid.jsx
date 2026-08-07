import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import categoryService from '../../services/category'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.10 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
}

function CategoryGrid() {
  const [searchParams] = useSearchParams()
  const shouldScroll = searchParams.get('scroll') === 'categories'
  const [categoryConfigs, setCategoryConfigs] = useState([])

  useEffect(() => {
    if (shouldScroll) {
      const el = document.getElementById('categories-section')
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [shouldScroll])

  useEffect(() => {
    let active = true;
    const fetchConfigs = async () => {
      try {
        const configs = await categoryService.getCategoryConfigs();
        if (active) {
          setCategoryConfigs(configs);
        }
      } catch (err) {
        console.error("Failed to load category configs:", err);
      }
    };
    fetchConfigs();
    return () => { active = false; };
  }, []);

  const products = useSelector(state => state.products.items || [])

  const uniqueProductCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  const defaultCategories = [
    { value: 'printed-tshirt', label: 'Printed T-Shirts' },
    { value: 'oversized-tshirt', label: 'Oversized T-Shirts' },
    { value: 'shirts', label: 'Shirts' },
    { value: 'hoodies', label: 'Hoodies' },
  ]

  const categoriesList = [...defaultCategories]
  uniqueProductCategories.forEach(cat => {
    const value = cat.toLowerCase().trim()
    if (!categoriesList.some(item => item.value === value)) {
      categoriesList.push({ value, label: cat.replace(/-/g, ' ') })
    }
  })

  const getCategoryImage = (catValue) => {
    const overrides = {};
    categoryConfigs.forEach(c => {
      if (c.imageUrl) overrides[c.category] = c.imageUrl;
    });
    if (overrides[catValue]) return overrides[catValue];
    if (catValue === 'printed-tshirt') return 'https://i.pinimg.com/736x/3b/e5/24/3be52487e4fcb982569c68fff31eae86.jpg'
    if (catValue === 'oversized-tshirt') return 'https://cdn1.ozone.ru/s3/multimedia-4/6643972660.jpg'
    if (catValue === 'shirts') return 'https://i.pinimg.com/originals/02/14/ef/0214efe3a76a76cbe65988be1e3315de.jpg'
    if (catValue === 'hoodies') return 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=300&q=80'
    const firstProd = products.find(p => p.category === catValue)
    return firstProd?.front_image_link || firstProd?.image_url || firstProd?.image || 'https://placehold.co/300x400?text=Vakrayan'
  }

  const visibleCategories = categoriesList.filter(c => {
    const deleted = categoryConfigs.filter(cfg => cfg.isDeleted).map(cfg => cfg.category);
    return !deleted.includes(c.value);
  })

  return (
    <section
      id="categories-section"
      style={{ background: 'var(--color-bg)', padding: '72px 0', borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-12">

        {/* Section header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-3">
            <div className="accent-line" />
          </div>
          <p className="eyebrow mb-3">Shop By</p>
          <h2 className="section-title">
            Collections
          </h2>
        </div>

        {/* Equal-size category flex/grid wrapper - centered for odd counts */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-wrap justify-center gap-3 md:gap-4"
        >
          {visibleCategories.map((c, idx) => {
            const img = getCategoryImage(c.value)
            return (
              <motion.div 
                key={c.value} 
                variants={cardVariants}
                className="w-[calc(50%-6px)] md:w-[calc(25%-12px)] min-w-[140px] max-w-[280px]"
              >
                <Link
                  to={`/category/${c.value}`}
                  className="group block relative overflow-hidden cursor-pointer shadow-lg transition-[box-shadow,border-color] duration-500 ease-[0.16,1,0.3,1] hover:shadow-2xl hover:border-emerald-500/30"
                  style={{
                    borderRadius: 16,
                    height: 'clamp(240px, 32vw, 360px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {/* Image - smooth scale */}
                  <img
                    src={img}
                    alt={c.label}
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-[0.16,1,0.3,1] group-hover:scale-106"
                  />

                  {/* Gradient overlay - dark ONLY at bottom, top 55% crystal clear */}
                  <div
                    className="absolute inset-0 transition-opacity duration-500 ease-out"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 22%, rgba(0,0,0,0.10) 38%, transparent 55%)',
                    }}
                  />

                  {/* Subtle hover tint */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none"
                    style={{ background: 'rgba(5,150,105,0.08)' }}
                  />

                  {/* Luxury Editorial Label Details */}
                  <div className="absolute inset-0 p-5 flex flex-col justify-end select-none">
                    <h3 
                      style={{
                        fontFamily: "'Barlow Condensed', 'Jost', sans-serif",
                        fontWeight: 900,
                        fontSize: 'clamp(14px, 1.8vw, 18px)',
                        color: '#fff',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        lineHeight: 1.1
                      }}
                    >
                      {c.label}
                    </h3>
                    
                    {/* Expanding animated underline */}
                    <div className="category-underline mt-2.5" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

export default CategoryGrid
