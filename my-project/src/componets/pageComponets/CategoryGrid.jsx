import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import categoryService from '../../appwrite/category'

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

        {/* Equal-size category grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {visibleCategories.map((c) => {
            const img = getCategoryImage(c.value)
            return (
              <motion.div key={c.value} variants={cardVariants}>
                <Link
                  to={`/category/${c.value}`}
                  className="group block relative overflow-hidden cursor-pointer"
                  style={{
                    borderRadius: 16,
                    height: 'clamp(160px, 28vw, 260px)',
                    border: '1px solid var(--glass-border-green)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Image */}
                  <img
                    src={img}
                    alt={c.label}
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
                  />

                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(5,26,14,0.70) 0%, rgba(5,26,14,0.10) 60%, transparent 100%)',
                    }}
                  />

                  {/* Hover tint */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'rgba(5,150,105,0.10)' }}
                  />

                  {/* Label bottom */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                    <div
                      className="flex items-center justify-between gap-2"
                      style={{
                        background: 'rgba(10,30,20,0.55)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 10,
                        padding: '8px 10px'
                      }}
                    >
                      <span
                        style={{
                          color: '#fff',
                          fontFamily: "'Jost', sans-serif",
                          fontWeight: 600,
                          fontSize: 12,
                          letterSpacing: '0.02em',
                          lineHeight: 1.2
                        }}
                      >
                        {c.label}
                      </span>
                      <div
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5"
                        style={{ background: '#059669', borderRadius: 6 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </div>
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
