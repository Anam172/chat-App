import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID ="1049604287280-oqk31cn2e28m601jb119nd7s1so9m237.apps.googleusercontent.com";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
    <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

