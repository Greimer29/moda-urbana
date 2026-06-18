import axios from 'axios'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export const api = axios.create({
  baseURL: `${apiUrl}/api/v1`,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})
