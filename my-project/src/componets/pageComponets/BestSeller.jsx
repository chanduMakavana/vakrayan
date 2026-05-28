import React from 'react'
import AddToCartButton from './AddToCartButton'

function BestSellers() {
  const products = [
    {
      id: 1,
      name: 'GOTHIC PRINT OVERSIZED TEE',
      price: '₹1,499',
      tag: 'NEW DROP',
      image: 'https://i.pinimg.com/736x/3b/e5/24/3be52487e4fcb982569c68fff31eae86.jpg'
    },
    {
      id: 2,
      name: 'VINTAGE WASH ACID TEE',
      price: '₹1,699',
      tag: 'BEST SELLER',
      image: 'https://cdn1.ozone.ru/s3/multimedia-4/6643972660.jpg'
    },
    {
      id: 3,
      name: 'CLASSIC BOX CORDUROY SHIRT',
      price: '₹2,299',
      tag: 'FEW LEFT',
      image: 'https://i.pinimg.com/originals/02/14/ef/0214efe3a76a76cbe65988be1e3315de.jpg'
    }
  ]

  return (
    <section id="drops" className="bg-[#0f0f11] py-16 px-4 md:px-12 border-t border-white/5 scroll-mt-20">
      {/* Section Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between max-w-7xl mx-auto">
        <div>
          <h4 className="text-xs tracking-[0.4em] text-red-500 font-bold uppercase mb-2">In Focus</h4>
          <h2 className="text-3xl md:text-5xl font-black tracking-wider text-white uppercase">
            Heavyweight Drops
          </h2>
        </div>
        <button className="mt-4 md:mt-0 text-xs font-bold tracking-widest text-gray-400 hover:text-white uppercase transition-colors duration-300 border-b border-gray-600 pb-1 w-fit">
          View All Products &rarr;
        </button>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {products.map((product) => (
          <div key={product.id} className="group relative flex flex-col bg-neutral-950/40 rounded-2xl p-3 border border-white/5 transition-all duration-300 hover:border-white/10 shadow-xl">

            {/* Product Image */}
            <div className="w-full aspect-3/4 rounded-xl overflow-hidden bg-neutral-900 relative">
              <span className="absolute top-3 left-3 z-10 bg-white text-black font-black text-[10px] tracking-widest px-2.5 py-1 rounded-sm uppercase shadow-md">
                {product.tag}
              </span>
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              {/* Overlay Add To Cart */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-10">
                <AddToCartButton product={product} variant="overlay" />
              </div>
            </div>

            {/* Product Details */}
            <div className="mt-4 px-2 pb-2 flex flex-col justify-between grow">
              <div>
                <h3 className="text-sm font-black tracking-wide text-gray-200 uppercase group-hover:text-white transition-colors">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 font-medium tracking-wider mt-1">Streetwear Co.</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-4">
                <span className="text-base font-black text-white tracking-wide">{product.price}</span>
                <AddToCartButton product={product} />
              </div>
            </div>

          </div>
        ))}
      </div>
    </section>
  )
}

export default BestSellers
