import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import AppRoutes from './AppRoutes';
import tokenRefreshManager from './utils/tokenRefresh';
import './App.css';

const App = () => {
  useEffect(() => {
    // Start token refresh manager when app loads
    tokenRefreshManager.start();
    
    // Cleanup on unmount
    return () => {
      tokenRefreshManager.stop();
    };
  }, []);

  return (
    <Provider store={store}>
      <Router>
        <AppRoutes />
      </Router>
    </Provider>
  );
};

export default App;
