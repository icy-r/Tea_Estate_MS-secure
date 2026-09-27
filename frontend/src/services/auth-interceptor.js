import axios from "axios";
import instance from "./axios.js";

// Attach the current JWT to every request that goes to our own API. Registered on
// both the shared axios instance and the global axios default, because several
// pages import axios directly. The token is read per request (not once at module
// load) so logging in or out takes effect immediately.
const API_ORIGIN = import.meta.env.HOSTED_URL || "http://localhost:3001";

function attachToken(config) {
  const token = localStorage.getItem("token");
  const url = config.baseURL ? config.baseURL + (config.url || "") : config.url || "";
  const isOwnApi = url.startsWith(API_ORIGIN) || url.startsWith("/");
  if (token && isOwnApi) config.headers.Authorization = `Bearer ${token}`;
  return config;
}

axios.interceptors.request.use(attachToken);
instance.interceptors.request.use(attachToken);
