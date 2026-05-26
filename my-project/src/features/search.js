import { createSlice } from "@reduxjs/toolkit"


const initialState = {
    query: ""
}

export const search = createSlice({
    name:'search',
    initialState,
    reducers:{
        updateQuery :(state,action) =>{
            state.query = action.payload
           
        }
    }
})

export const {updateQuery} = search.actions
export default search.reducer