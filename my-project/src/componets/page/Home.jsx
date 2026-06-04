import Navbar from '../pageComponets/Navbar'
import Hero from '../pageComponets/Hero'
import CategoryGrid from '../pageComponets/CategoryGrid'
import BestSellers from '../pageComponets/BestSeller'
import PromoBanner from '../pageComponets/PromoBanner'
import Footer from '../pageComponets/Footer'

function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <CategoryGrid />
      <BestSellers />
      <PromoBanner />
      <Footer />
    </>
  )
}

export default Home
