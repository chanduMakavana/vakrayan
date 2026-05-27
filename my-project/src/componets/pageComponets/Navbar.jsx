import React from 'react';
import { NavLink } from 'react-router-dom';
import { ImSearch } from 'react-icons/im';
import { CgShoppingCart } from 'react-icons/cg';
import { BsFillPersonFill } from 'react-icons/bs';

function Navbar() {
  return (

    <nav>
      <div className="bg-white px-10 py-5 flex justify-between capitalize font-semibold">
        <div className="text-xl font-extrabold uppercase">
          <h1>Street-wear</h1>
        </div>

        <div>
          <ul className="flex gap-5">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? 'border-b-2 border-b-red-500' : ''
                }
              >
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? 'border-b-2 border-b-red-500' : ''
                }
              >
                New Arrival
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? 'border-b-2 border-b-red-500' : ''
                }
              >
                Men wear
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? 'border-b-2 border-b-red-500' : ''
                }
              >
                About
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="flex gap-5">
          <ImSearch />
          <CgShoppingCart />
          <BsFillPersonFill />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
