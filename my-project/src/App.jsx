import './App.css'
import { Route, Routes } from 'react-router-dom'

import Home from './componets/page/Home'
import SignUp from './componets/page/SignUp'
import Login from './componets/page/Login'

function App() {

  return (
  <>
  <Routes>
    <Route path='/signUp' element={<SignUp/>} />
    <Route path='login' element={<Login/>} />
    <Route path='/' element={<Home/>} />
  </Routes>
  </>
  )
}

export default App
