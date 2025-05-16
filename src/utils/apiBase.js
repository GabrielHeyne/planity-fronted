// src/utils/apiBase.js
const ENTORNO = "prod"; // ⬅️ cambia a "prod" si necesitas

const URLS = {
  dev: "http://127.0.0.1:8001",
  prod: "https://planity-backend.onrender.com",
};

export const API_BASE_URL = URLS[ENTORNO];

