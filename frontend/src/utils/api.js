import axios from 'axios';

const API = axios.create({ 
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api/'  // ← fixed fallback
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
```

---

## Don't forget — Vercel Environment Variable

Go to **Vercel → Your Project → Settings → Environment Variables** and add:
```
Name:   REACT_APP_API_URL
Value:  https://electrostock-backend-rz0q.onrender.com/api/