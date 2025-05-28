"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
import { Line } from "react-chartjs-2";
import {
  LineChart,
  AlertCircle,
  Star,
  CalendarClock,
  PercentCircle,
  Download,
  FolderSearch,
} from "lucide-react";

dayjs.extend(isBetween);
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export default function DemandaTotal() {
  const [data, setData] = useState([]);
  const [skuSeleccionado, setSkuSeleccionado] = useState("");
  const [fechaInicio, setFechaInicio] = useState(dayjs().subtract(12, "month").toDate());
  const [fechaFin, setFechaFin] = useState(new Date());

  useEffect(() => {
    const stored = sessionStorage.getItem("demanda_limpia");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing sessionStorage:", e);
      }
    }

    const skuGuardado = sessionStorage.getItem("filtro_sku");
    const fechaIniGuardada = sessionStorage.getItem("filtro_fecha_inicio");
    const fechaFinGuardada = sessionStorage.getItem("filtro_fecha_fin");

    if (skuGuardado) setSkuSeleccionado(skuGuardado);
    if (fechaIniGuardada) setFechaInicio(new Date(fechaIniGuardada));
    if (fechaFinGuardada) setFechaFin(new Date(fechaFinGuardada));
  }, []);

  const handleSelectSKU = (sku) => {
    setSkuSeleccionado(sku);
    sessionStorage.setItem("filtro_sku", sku);
  };

  const handleFechaInicio = (date) => {
    setFechaInicio(date);
    sessionStorage.setItem("filtro_fecha_inicio", date.toISOString());
  };

  const handleFechaFin = (date) => {
    setFechaFin(date);
    sessionStorage.setItem("filtro_fecha_fin", date.toISOString());
  };

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="p-6 text-sm text-gray-500">No hay datos de demanda disponibles.</div>;
  }

  const dataFiltrada = data.filter((r) => {
    const fecha = dayjs(r.fecha);
    const dentroDeRango = fecha.isBetween(dayjs(fechaInicio), dayjs(fechaFin), null, "[]");
    const coincideSKU = skuSeleccionado ? r.sku === skuSeleccionado : true;
    return dentroDeRango && coincideSKU;
  });

  const semanal = {};
  const mensual = {};
  const perdidasPorSKU = {};
  const demandaPorSKU = {};

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

    // Rankings
    const sku = d.sku;
    perdidasPorSKU[sku] = (perdidasPorSKU[sku] || 0) + perdida;
    demandaPorSKU[sku] = (demandaPorSKU[sku] || 0) + limpia;
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

  const quiebreTotal = (totalReal + totalPerdidas) > 0
  ? (totalPerdidas / (totalReal + totalPerdidas)) * 100
  : 0;


  const topQuiebres = Object.entries(perdidasPorSKU)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topDemanda = Object.entries(demandaPorSKU)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: "bottom" } },
  };

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

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
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
        <div>
          <label className="block text-sm text-gray-600 mb-1">Desde:</label>
          <DatePicker
            selected={fechaInicio}
            onChange={setFechaInicio}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Hasta:</label>
          <DatePicker
            selected={fechaFin}
            onChange={setFechaFin}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
            dateFormat="yyyy-MM-dd"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Demanda Real Total" value={totalReal.toLocaleString()} />
        <KpiCard label="Demanda Limpia Total" value={totalLimpia.toLocaleString()} />
        <KpiCard label="Unidades Perdidas" value={totalPerdidas.toLocaleString()} rojo />
        <KpiCard label="% Tasa Quiebres" value={`${quiebreTotal.toFixed(1)}%`} naranja />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Semana */}
        <div className="space-y-6">
          <LineChartBlock title="Demanda semanal: real vs limpia" icon={LineChart} labels={semanas} datasets={[
            { label: "Demanda Real", data: demandaRealSemanal, borderColor: "#3b82f6" },
            { label: "Demanda Limpia", data: demandaLimpiaSemanal, borderColor: "#22c55e" },
          ]} />
          <LineChartBlock title="Unidades perdidas por semana" icon={AlertCircle} labels={semanas} datasets={[
            { label: "Unidades Perdidas", data: perdidasSemanal, borderColor: "#ef4444" },
          ]} />
          <LineChartBlock title="% quiebre por semana" icon={PercentCircle} labels={semanas} datasets={[
            { label: "% Quiebre", data: quiebreSemanal, borderColor: "#f59e0b" },
          ]} isPercentage />
        </div>

        {/* Mes */}
        <div className="space-y-6">
          <LineChartBlock title="Demanda mensual: real vs limpia" icon={CalendarClock} labels={meses} datasets={[
            { label: "Demanda Real", data: demandaRealMensual, borderColor: "#3b82f6" },
            { label: "Demanda Limpia", data: demandaLimpiaMensual, borderColor: "#22c55e" },
          ]} />
          <LineChartBlock title="Unidades perdidas por mes" icon={AlertCircle} labels={meses} datasets={[
            { label: "Unidades Perdidas", data: perdidasMensual, borderColor: "#ef4444" },
          ]} />
          <LineChartBlock title="% quiebre por mes" icon={PercentCircle} labels={meses} datasets={[
            { label: "% Quiebre", data: quiebreMensual, borderColor: "#f59e0b" },
          ]} isPercentage />
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RankingTable title="Top 10 SKUs con más quiebres" icon={AlertCircle} headers={["SKU", "Perdidas", "% Quiebre"]} rows={
          topQuiebres.map(([sku, perdidas]) => [
            sku,
            Math.round(perdidas),
            `${((perdidas / (demandaPorSKU[sku] || 1)) * 100).toFixed(1)}%`
          ])
        } />
        <RankingTable title="Top 10 SKUs con más demanda" icon={Star} headers={["SKU", "Demanda"]} rows={
          topDemanda.map(([sku, valor]) => [sku, Math.round(valor)])
        } />
      </div>

      {/* Exportar */}
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

// Componentes reutilizables

function KpiCard({ label, value, rojo = false, naranja = false }) {
  const color = rojo ? "text-red-600" : naranja ? "text-orange-600" : "text-gray-800";
  return (
    <div className="bg-white shadow rounded p-4 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value ?? "-"}</p>
    </div>
  );
}

function LineChartBlock({ title, icon: Icon, labels, datasets, isPercentage = false }) {
  return (
    <div className="bg-white p-4 shadow rounded">
      <h2 className="text-center text-sm mb-2 flex justify-center items-center gap-2">
        <Icon className="w-4 h-4" /> {title}
      </h2>
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          plugins: { legend: { position: "bottom" } },
          scales: isPercentage ? { y: { ticks: { callback: (v) => `${v}%` } } } : {},
        }}
      />
    </div>
  );
}

function RankingTable({ title, icon: Icon, headers, rows }) {
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="text-center text-sm mb-4 flex justify-center items-center gap-2">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      <table className="w-full text-xs text-center table-fixed">
        <thead>
          <tr>{headers.map((h, i) => <th key={i} className="py-1 text-gray-500">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((cols, i) => (
            <tr key={i}>{cols.map((c, j) => (
              <td key={j} className={`py-1 ${j === 1 ? "text-red-600 font-medium" : j === 2 ? "text-orange-600" : ""}`}>{c}</td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



















