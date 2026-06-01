import React from 'react'
import { Link } from 'react-router-dom'

function CategoryGrid() {
    const categories = [
        {
            id: 1,
            name: 'PRINTED T-SHIRT',
            image: 'https://i.pinimg.com/736x/3b/e5/24/3be52487e4fcb982569c68fff31eae86.jpg',
            link: '/category/printed-tshirt' // Path fixed according to name
        },
        {
            id: 2,
            name: 'OVERSIZED T-SHIRT',
            image: 'https://cdn1.ozone.ru/s3/multimedia-4/6643972660.jpg',
            link: '/category/oversized-tshirt' // Path fixed according to name
        },
        {
            id: 3,
            name: 'SHIRT',
            image: 'https://i.pinimg.com/originals/02/14/ef/0214efe3a76a76cbe65988be1e3315de.jpg',
            link: '/category/shirts' // Path fixed according to name
        }
    ]

    return (
        <section className="bg-[#fafafb] py-16 px-4 border-b border-neutral-200/50">
            {/* Styled Section Headers */}
            <div className="mb-12 text-center">
                <h4 className="text-xs tracking-[0.4em] text-red-500 font-bold uppercase mb-2">
                    categorize
                </h4>
                <h1 className="text-3xl md:text-5xl font-black tracking-wider text-neutral-900 uppercase">
                    browse the drops
                </h1>
            </div>

            {/* Grid Container */}
            <div className='grid grid-cols-1 md:grid-cols-3 justify-center items-center gap-8 max-w-7xl mx-auto'>        
                {
                    categories.map((data) => {
                        return (
                            <Link 
                                to={data.link}
                                key={data.id}
                                className='group w-full md:w-[25vw] h-[75vw] md:h-[30vw] min-w-70 md:min-w-62.5 min-h-90 md:min-h-75 mx-auto relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-shadow duration-300 block border border-neutral-200/60'
                            >
                                {/* 1. Image */}
                                <img 
                                    src={data.image} 
                                    alt={data.name}
                                    className='grayscale group-hover:grayscale-0 transition-all duration-300 ease-in-out h-full w-full object-cover object-center block group-hover:scale-105' 
                                />
                                
                                {/* 2. Dark Overlay Div */}
                                <div 
                                    className='absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out pointer-events-none z-10'
                                ></div>

                                {/* 3. Heading Text */}
                                <h2 className='absolute bottom-0 left-0 right-0 p-6 text-center text-lg md:text-xl font-black tracking-wider text-white uppercase z-20 transition-transform duration-300 group-hover:-translate-y-1'>
                                    {data.name}
                                </h2>  
                            </Link>
                        )
                    })
                }
            </div>
        </section>
    )
}

export default CategoryGrid