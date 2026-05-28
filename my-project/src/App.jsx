import './App.css'
import { Route, Routes } from 'react-router-dom'

import Home from './componets/page/Home'
import SignUp from './componets/page/SignUp'
import Login from './componets/page/Login'
import AdminPanel from './componets/page/AddminPanel'

function App() {
  return (
  <>
  <Routes>
    <Route path='/signUp' element={<SignUp/>} />
    <Route path='/login' element={<Login/>} />
    <Route path='/' element={<Home/>} />
    <Route path='/admin' element={<AdminPanel/>} />
    <Route path='*' element={<h1 className='text-3xl text-white text-center mt-24'>404 - Page Not Found</h1>} />
  </Routes>
  </>
  )
}

export default App
