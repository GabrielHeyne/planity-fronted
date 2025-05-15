"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import {
  LineChart,
  TrendingDown,
  AlertCircle,
  Star,
  CalendarClock,
  PercentCircle,
  Download,
  FolderSearch, // ← nuevo icono
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export default function DemandaTotal() {
  const [data, setData] = useState([]);
  const [skuSeleccionado, setSkuSeleccionado] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("demanda_limpia");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData(parsed);
      } catch (e) {
        console.error("Error parsing sessionStorage:", e);
      }
    }
  }, []);

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="p-6 text-sm text-gray-500">No hay datos de demanda disponibles.</div>;
  }

  const dataFiltrada = skuSeleccionado ? data.filter((r) => r.sku === skuSeleccionado) : data;

  const semanal = {};
  const mensual = {};
  let totalReal = 0;
  let totalLimpia = 0;
  let totalPerdidas = 0;

  dataFiltrada.forEach((d) => {
    const fecha = dayjs(d.fecha);
    const semana = fecha.startOf("week").format("YYYY-MM-DD");
    const mes = fecha.format("YYYY-MM");

    const real = Number(d.demanda_original || 0);
    const limpia = Number(d.demanda_sin_outlier || 0);
    const perdida = Math.max(0, limpia - real);

    if (!semanal[semana]) semanal[semana] = { real: 0, limpia: 0, perdidas: 0 };
    semanal[semana].real += real;
    semanal[semana].limpia += limpia;
    semanal[semana].perdidas += perdida;

    if (!mensual[mes]) mensual[mes] = { real: 0, limpia: 0, perdidas: 0 };
    mensual[mes].real += real;
    mensual[mes].limpia += limpia;
    mensual[mes].perdidas += perdida;

    totalReal += real;
    totalLimpia += limpia;
    totalPerdidas += perdida;
  });

  const semanas = Object.keys(semanal).sort();
  const meses = Object.keys(mensual).sort();

  const demandaRealSemanal = semanas.map((s) => semanal[s].real);
  const demandaLimpiaSemanal = semanas.map((s) => semanal[s].limpia);
  const perdidasSemanal = semanas.map((s) => semanal[s].perdidas);
  const quiebreSemanal = semanas.map((s) =>
    semanal[s].limpia > 0 ? (semanal[s].perdidas / semanal[s].limpia) * 100 : 0
  );

  const demandaRealMensual = meses.map((m) => mensual[m].real);
  const demandaLimpiaMensual = meses.map((m) => mensual[m].limpia);
  const perdidasMensual = meses.map((m) => mensual[m].perdidas);
  const quiebreMensual = meses.map((m) =>
    mensual[m].limpia > 0 ? (mensual[m].perdidas / mensual[m].limpia) * 100 : 0
  );

  const quiebreTotal = totalLimpia > 0 ? (totalPerdidas / totalLimpia) * 100 : 0;

  const perdidasPorSKU = {};
  const demandaPorSKU = {};
  data.forEach((r) => {
    const sku = r.sku;
    const real = Number(r.demanda_original || 0);
    const limpia = Number(r.demanda_sin_outlier || 0);
    const perdida = Math.max(0, limpia - real);

    perdidasPorSKU[sku] = (perdidasPorSKU[sku] || 0) + perdida;
    demandaPorSKU[sku] = (demandaPorSKU[sku] || 0) + limpia;
  });

  const topQuiebres = Object.entries(perdidasPorSKU)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topDemanda = Object.entries(demandaPorSKU)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const chartOptions = { responsive: true, plugins: { legend: { position: "bottom" } } };

  const exportarCSV = () => {
    const headers = "sku,fecha,demanda_original,demanda_sin_stockout,demanda_sin_outlier\n";
    const filas = dataFiltrada.map(
      (r) =>
        `${r.sku},${r.fecha},${r.demanda_original},${r.demanda_sin_stockout},${r.demanda_sin_outlier}`
    );
    const contenido = headers + filas.join("\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "demanda_limpia.csv");
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-2 mb-4">
  <FolderSearch className="w-6 h-6 text-indigo-600" />
  <h1 className="text-2xl font-semibold text-gray-800">Análisis de Demanda Total</h1>
</div>




      {/* Filtro */}
      <div className="mb-6 max-w-sm">
        <label className="block text-sm text-gray-600 mb-1">Filtrar por SKU:</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
          value={skuSeleccionado}
          onChange={(e) => setSkuSeleccionado(e.target.value)}
        >
          <option value="">— Ver todos los SKUs —</option>
          {[...new Set(data.map((r) => r.sku))].sort().map((sku) => (
            <option key={sku} value={sku}>{sku}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded p-4 text-center">
          <p className="text-xs text-gray-500">Demanda Real Total</p>
          <p className="text-xl font-bold">{Math.round(totalReal).toLocaleString()}</p>
        </div>
        <div className="bg-white shadow rounded p-4 text-center">
          <p className="text-xs text-gray-500">Demanda Limpia Total</p>
          <p className="text-xl font-bold">{Math.round(totalLimpia).toLocaleString()}</p>
        </div>
        <div className="bg-white shadow rounded p-4 text-center">
          <p className="text-xs text-gray-500">Unidades Perdidas</p>
          <p className="text-xl font-bold text-red-600">{Math.round(totalPerdidas).toLocaleString()}</p>
        </div>
        <div className="bg-white shadow rounded p-4 text-center">
          <p className="text-xs text-gray-500">% Tasa Quiebres</p>
          <p className="text-xl font-bold text-orange-600">{quiebreTotal.toFixed(1)}%</p>
        </div>
      </div>

      {/* Gráficos en 2 columnas */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Columna 1 */}
  <div className="space-y-6">
    <div className="bg-white p-4 shadow rounded">
      <h2 className="text-center text-sm mb-2 flex justify-center items-center gap-2">
        <LineChart className="w-4 h-4" /> Demanda semanal: real vs limpia
      </h2>
      <Line
        data={{
          labels: semanas,
          datasets: [
            {
              label: "Demanda Real",
              data: demandaRealSemanal,
              borderColor: "#3b82f6",
              tension: 0.3,
              pointRadius: 0, // 🔹 elimina los puntos
            },
            {
              label: "Demanda Limpia",
              data: demandaLimpiaSemanal,
              borderColor: "#22c55e",
              tension: 0.3,
              pointRadius: 0, // 🔹 elimina los puntos
            },
          ],
        }}
        options={{
          ...chartOptions,
          elements: {
            point: {
              radius: 0, // 🔹 por si acaso, desactiva puntos globalmente
            },
          },
        }}
      />
    </div>


          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-center text-sm mb-2 flex justify-center items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Unidades perdidas por semana
            </h2>
            <Line
              data={{
                labels: semanas,
                datasets: [{ label: "Unidades Perdidas", data: perdidasSemanal, borderColor: "#ef4444", tension: 0.3 }],
              }}
              options={chartOptions}
            />
          </div>

          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-center text-sm mb-2 flex justify-center items-center gap-2">
              <PercentCircle className="w-4 h-4" /> % quiebre por semana
            </h2>
            <Line
              data={{
                labels: semanas,
                datasets: [{ label: "% Quiebre", data: quiebreSemanal, borderColor: "#f59e0b", tension: 0.3 }],
              }}
              options={{
                ...chartOptions,
                scales: { y: { ticks: { callback: (v) => `${v}%` } } },
              }}
            />
          </div>
        </div>

        {/* Columna 2 */}
        <div className="space-y-6">
          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-center text-sm mb-2 flex justify-center items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Demanda mensual: real vs limpia
            </h2>
            <Line
              data={{
                labels: meses,
                datasets: [
                  { label: "Demanda Real", data: demandaRealMensual, borderColor: "#3b82f6", tension: 0.3 },
                  { label: "Demanda Limpia", data: demandaLimpiaMensual, borderColor: "#22c55e", tension: 0.3 },
                ],
              }}
              options={chartOptions}
            />
          </div>

          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-center text-sm mb-2 flex justify-center items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Unidades perdidas por mes
            </h2>
            <Line
              data={{
                labels: meses,
                datasets: [{ label: "Unidades Perdidas", data: perdidasMensual, borderColor: "#ef4444", tension: 0.3 }],
              }}
              options={chartOptions}
            />
          </div>

          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-center text-sm mb-2 flex justify-center items-center gap-2">
              <PercentCircle className="w-4 h-4" /> % quiebre por mes
            </h2>
            <Line
              data={{
                labels: meses,
                datasets: [{ label: "% Quiebre", data: quiebreMensual, borderColor: "#f59e0b", tension: 0.3 }],
              }}
              options={{
                ...chartOptions,
                scales: { y: { ticks: { callback: (v) => `${v}%` } } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* TOP QUIEBRES */}
  <div className="bg-white p-4 rounded shadow-sm">
    <h3 className="text-center text-sm mb-4 flex justify-center items-center gap-2">
      <AlertCircle className="w-4 h-4" /> Top 10 SKUs con más quiebres
    </h3>
    <table className="w-full text-xs text-center table-fixed">
      <thead>
        <tr>
          <th className="w-1/3 py-1 text-gray-500">SKU</th>
          <th className="w-1/3 py-1 text-gray-500">Unidades Perdidas</th>
          <th className="w-1/3 py-1 text-gray-500">% Quiebre</th>
        </tr>
      </thead>
      <tbody>
        {topQuiebres.map(([sku, perdidas]) => {
          const quiebre = demandaPorSKU[sku] > 0 ? (perdidas / demandaPorSKU[sku]) * 100 : 0;
          return (
            <tr key={sku}>
              <td className="py-1">{sku}</td>
              <td className="py-1 text-red-600 font-medium">{Math.round(perdidas)}</td>
              <td className="py-1 text-orange-600">{quiebre.toFixed(1)}%</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>

  {/* TOP DEMANDA */}
  <div className="bg-white p-4 rounded shadow-sm">
    <h3 className="text-center text-sm mb-4 flex justify-center items-center gap-2">
      <Star className="w-4 h-4" /> Top 10 SKUs con más demanda
    </h3>
    <table className="w-full text-xs text-center table-fixed">
      <thead>
        <tr>
          <th className="w-1/2 py-1 text-gray-500">SKU</th>
          <th className="w-1/2 py-1 text-gray-500">Demanda</th>
        </tr>
      </thead>
      <tbody>
        {topDemanda.map(([sku, valor]) => (
          <tr key={sku}>
            <td className="py-1">{sku}</td>
            <td className="py-1 font-medium">{Math.round(valor)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      {/* Exportación */}
      <div className="mt-8 text-center">
        <button
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition flex items-center gap-2 mx-auto"
          onClick={exportarCSV}
        >
          <Download className="w-4 h-4" /> Descargar demanda limpia (CSV)
        </button>
      </div>
    </div>
  );
}


















