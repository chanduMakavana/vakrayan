import Hero from '../pageComponets/Hero'
import CategoryGrid from '../pageComponets/CategoryGrid'
import BestSellers from '../pageComponets/BestSeller'
import PromoBanner from '../pageComponets/PromoBanner'
import RecentlyViewedHome from '../pageComponets/RecentlyViewedHome'
import Footer from '../pageComponets/Footer'

function Home() {
  return (
    <>
      <Hero />
      <BestSellers />
      <CategoryGrid />
      <PromoBanner />
      <RecentlyViewedHome />
      <Footer />
    </>
  )
}

export default Home
