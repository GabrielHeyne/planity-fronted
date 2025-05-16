"use client";
import { useEffect, useState } from "react";
import { BarChart, CalendarClock } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController, // ✅ necesario
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { API_BASE_URL } from "@/utils/apiBase";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController, // ✅ importante
  Tooltip,
  Legend
);

export default function ForecastPage() {
  const [forecastData, setForecastData] = useState([]);
  const [skuSeleccionado, setSkuSeleccionado] = useState("");

  useEffect(() => {
  const forecastGuardado = sessionStorage.getItem("forecast");

  if (forecastGuardado) {
    console.log("⚡️ Forecast ya disponible en sesión.");
    const parsed = JSON.parse(forecastGuardado);
    setForecastData(parsed);
    if (parsed.length > 0) setSkuSeleccionado(parsed[0].sku);
    return;
  }

  const stored = sessionStorage.getItem("demanda_limpia");
  if (stored) {
    const demanda = JSON.parse(stored);

    const datosForecast = demanda.map((fila) => ({
      sku: fila.sku,
      fecha: fila.fecha,
      demanda: fila.demanda ?? fila.demanda_sin_outlier ?? 0,
      demanda_sin_outlier: fila.demanda_sin_outlier ?? fila.demanda ?? 0,
    }));

    fetch(`${API_BASE_URL}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosForecast),
    })
      .then((res) => res.json())
      .then((data) => {
        const resultado = data.forecast || [];
        sessionStorage.setItem("forecast", JSON.stringify(resultado));
        setForecastData(resultado);
        if (resultado.length > 0) setSkuSeleccionado(resultado[0].sku);
      })
      .catch((err) => console.error("❌ Error al obtener forecast:", err));
  }
}, []);

  if (!forecastData.length) {
    return <div className="p-6 text-gray-500 text-sm">No hay datos de forecast disponibles.</div>;
  }

  const dataFiltrada = forecastData.filter((r) => r.sku === skuSeleccionado);

  const labels = dataFiltrada.map((d) =>
    new Date(d.mes).toLocaleDateString("es-CL", { month: "short", year: "numeric" })
  );

  const demandaLimpia = dataFiltrada.map((d) => Number(d.demanda_limpia) || 0);
  const forecast = dataFiltrada.map((d) =>
    d.tipo_mes !== "histórico" ? Number(d.forecast) || null : null
  );
  const forecastUp = dataFiltrada.map((d) =>
    d.tipo_mes === "proyección" ? Number(d.forecast_up) || null : null
  );

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-2 mb-4">
        <BarChart className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-semibold text-gray-800">Forecast por SKU</h1>
      </div>

      <div className="mb-6 max-w-sm">
        <label className="block text-sm text-gray-600 mb-1">Filtrar por SKU:</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
          value={skuSeleccionado}
          onChange={(e) => setSkuSeleccionado(e.target.value)}
        >
          {[...new Set(forecastData.map((r) => r.sku))].sort().map((sku) => (
            <option key={sku} value={sku}>
              {sku}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-sm text-center mb-2 flex items-center justify-center gap-2">
          <CalendarClock className="w-4 h-4" /> Forecast vs Demanda
        </h2>
        <Line
          data={{
            labels,
            datasets: [
              {
                type: "bar",
                label: "Demanda Limpia",
                data: demandaLimpia,
                backgroundColor: "rgba(37, 99, 235, 0.8)",
                borderRadius: 4,
                borderSkipped: false,
              },
              {
                type: "line",
                label: "Forecast proyectado",
                data: forecast,
                borderColor: "#16a34a",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "#16a34a",
                tension: 0.3,
              },
              {
                type: "line",
                label: "Forecast con Margen",
                data: forecastUp,
                borderColor: "#f97316",
                borderDash: [4, 4],
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "#f97316",
                tension: 0.3,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: "top",
                labels: {
                  font: { size: 12 },
                  boxWidth: 20,
                  boxHeight: 10,
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue} unidades`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: "Unidades" },
              },
              x: {
                ticks: { maxRotation: 45, minRotation: 45 },
                title: { display: true, text: "Mes" },
              },
            },
          }}
        />
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-sm mb-3">Resumen de forecast</h3>
        <table className="w-full text-sm text-center table-auto">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="py-1">SKU</th>
              <th className="py-1">Mes</th>
              <th className="py-1">Demanda</th>
              <th className="py-1">Demanda Limpia</th>
              <th className="py-1">Forecast</th>
              <th className="py-1">+ Margen</th>
              <th className="py-1">DPA</th>
              <th className="py-1">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {dataFiltrada.map((r, i) => (
              <tr key={i} className="text-sm">
                <td className="py-1">{r.sku}</td>
                <td className="py-1">{r.mes}</td>
                <td className="py-1">{r.demanda ?? "-"}</td>
                <td className="py-1">{r.demanda_limpia ?? "-"}</td>
                <td className="py-1 font-medium">{r.forecast}</td>
                <td className="py-1 text-green-600">{r.forecast_up ?? "-"}</td>
                <td className="py-1 text-indigo-600">{r.dpa_movil ?? "-"}</td>
                <td className="py-1 text-gray-500">{r.tipo_mes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}










