import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../features/login'
import Navbar from '../pageComponets/Navbar'
import { updateQuery } from '../../features/search'

function Home() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const users = useSelector((state) => state.login)
  const loggedInUser = users?.find(user => user.isLogin === true)
  const name = loggedInUser?.name || 'Guest'

  const handleLogOut = () => {
    dispatch(logout())
    navigate('/login')
  }

  async function handleSearchForm(e) {
    e.preventDefault()
    
    dispatch(updateQuery(e.target.search.value))
  
  }
  return (
    <div 
      className='bg-[url("https://wallpapers.com/images/hd/firewatch-3440-x-1935-background-pgwaf324hukuegk1.jpg")] bg-cover bg-center bg-black/40 bg-blend-multiply w-screen h-screen border-x-8 border-t-8 rounded-tl-2xl rounded-tr-2xl border-white overflow-hidden pt-0'
    >    
      <Navbar />

      <div className='flex flex-col items-center justify-center h-full text-center px-4'>
        {/* Fixed typo in heading text */}
        <h1>What Are You Looking For?</h1>
        <form action="" 
        onSubmit={handleSearchForm}>
          <input 
            type="text" 
            name="search" 
            className='bg-white focus:bg-transparent focus:backdrop-blur-sm focus:text-white border-2 border-gray-300 rounded-lg px-4 py-3 w-80 placeholder-gray-500 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300'
            placeholder="Search or enter text..." 
          />
        </form>
      </div>
    </div>
  )
}

export default Home
