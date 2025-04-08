import {
    GET_CLIENTS,
    CLIENT_ERROR
  }  from '../actions/types';
  
  const initialState = {
    clients: [],
    loading: true,
    error: null
  };
  
  export default function(state = initialState, action) {
    switch(action.type) {
      case GET_CLIENTS:
        return {
          ...state,
          clients: action.payload, 
          loading: false
        };
      case CLIENT_ERROR:
        return {
          ...state,
          error: action.payload,
          loading: false
        };
      default:
        return state;
    }
  };
  