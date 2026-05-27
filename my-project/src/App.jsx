import './App.css'
import { Route, Routes } from 'react-router-dom'
import SignUp from './componets/auth/SignUp'
import Login from './componets/auth/Login'
import Home from './componets/page/Home'

function App() {

  return (
  <>
  <Routes>
    <Route path='/SignUp' element={<SignUp/>} />
    <Route path='login' element={<Login/>} />
    <Route path='/' element={<Home/>} />
  </Routes>
  </>
  )
}

export default App
