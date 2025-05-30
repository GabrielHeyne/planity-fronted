"use client";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { PackageSearch } from "lucide-react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { API_BASE_URL } from "@/utils/apiBase";

dayjs.extend(isSameOrAfter);

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

export default function ResumenPage() {
  const [kpis, setKpis] = useState({});
  const [skuSeleccionado, setSkuSeleccionado] = useState("__TOTAL__");
  const [skusDisponibles, setSkusDisponibles] = useState([]);
  const [stockHist, setStockHist] = useState([]);
  const [graficos, setGraficos] = useState({
  meses: [],
  mesesForecast: [],
  real: [],
  limpia: [],
  perdidas: [],
  quiebre: [],
  forecast: [],
  forecastUp: [],
  demandaLimpiaHistorica: [],
  stockProyectado: [],
  mesesProyeccion: [],
  perdidasFuturas: [],
  stockHistorico: [],
  mesesStockHistorico: [],

});


  const [fechaDesde, setFechaDesde] = useState(dayjs().subtract(12, "month").startOf("month").format("YYYY-MM-DD"));
  const [fechaHasta, setFechaHasta] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

  // 🔁 useEffect 1: cargar stock_historico desde el backend una sola vez
useEffect(() => {
  const fetchStockHist = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/cloud/stock_historico`);
      const data = await res.json();
      setStockHist(data);
    } catch (err) {
      console.error("❌ Error al cargar stock histórico desde backend:", err);
    }
  };

  fetchStockHist();
}, []);

// 🔁 useEffect 2: calcular KPIs y gráficos cada vez que cambien filtros o stock
useEffect(() => {
  async function fetchYCalcular() {
    try {
      const res = await fetch(`${API_BASE_URL}/cloud/demanda_limpia`);
      const demanda = await res.json();

      const maestro = JSON.parse(sessionStorage.getItem("maestro") || "[]");
      const detalleObj = JSON.parse(sessionStorage.getItem("detalle_politicas") || "{}");
      const detalle = Object.entries(detalleObj).map(([sku, vals]) => ({ sku, ...vals }));
      const repos = JSON.parse(sessionStorage.getItem("reposiciones") || "[]");

      const skus = [...new Set(demanda.map((r) => r.sku))];
      setSkusDisponibles(skus);

      calcularKPIs(skuSeleccionado, demanda, maestro, stockHist, detalle, repos);
      calcularGraficos(skuSeleccionado, demanda);
    } catch (error) {
      console.error("❌ Error al cargar demanda limpia:", error);
    }
  }

  fetchYCalcular();
}, [skuSeleccionado, fechaDesde, fechaHasta, stockHist]);

    const calcularKPIs = (sku, demanda, maestro, stockHist, detalle, repos) => {
    const desde = new Date(fechaDesde);
    const hasta = new Date(fechaHasta);

    const demandaFiltrada = demanda.filter(d => {
      const fecha = new Date(d.semana);
      return fecha >= desde && fecha <= hasta && (sku === "__TOTAL__" || d.sku === sku);
    });

    const maestroMap = Object.fromEntries(maestro.map(m => [m.sku, m.precio_venta]));

    let ventas12m = 0;
    let perdidas12m = 0;
    let facturacion = 0;
    let ventaPerdida = 0;

    for (const d of demandaFiltrada) {
      const precio = maestroMap[d.sku] || 0;
      ventas12m += d.demanda_original || 0;
      facturacion += (d.demanda_original || 0) * precio;
      const perdida = Math.max((d.demanda_sin_stockout || 0) - (d.demanda_original || 0), 0);
      perdidas12m += perdida;
      ventaPerdida += perdida * precio;
    }

    const tasaQuiebre = (ventas12m + perdidas12m) > 0
      ? (perdidas12m / (ventas12m + perdidas12m)) * 100
      : 0;

    const forecast = JSON.parse(sessionStorage.getItem("forecast") || "[]");
    const forecastFiltrado = forecast.filter(
      f => f.tipo_mes === "histórico" && (sku === "__TOTAL__" || f.sku === sku)
    );

    const meses = [...new Set(forecastFiltrado.map(f => f.mes))].slice(-3);
    const demandaMensual = meses.length > 0
      ? forecastFiltrado.filter(f => meses.includes(f.mes)).reduce((a, b) => a + (b.demanda_limpia || 0), 0) / meses.length
      : 0;

    const detalleFiltrado = sku === "__TOTAL__" ? detalle : detalle.filter(d => d.sku === sku);
    const stockActual = detalleFiltrado.reduce((a, b) => a + (b.stock_actual || 0), 0);
    const unidadesTransito = repos
      .filter(r => sku === "__TOTAL__" || r.sku === sku)
      .reduce((a, b) => a + (b.cantidad || 0), 0);
    const unidadesAComprar = detalleFiltrado
      .filter(d => d.accion === "Comprar")
      .reduce((a, b) => a + (b.unidades_sugeridas || 0), 0);
    const skusAComprar = sku === "__TOTAL__"
      ? [...new Set(detalle.filter(d => d.accion === "Comprar").map(d => d.sku))].length
      : detalleFiltrado.some(d => d.accion === "Comprar") ? 1 : 0;

    setKpis({
      stockActual,
      ventas12m,
      facturacion,
      unidadesTransito,
      skusAComprar,
      perdidas12m,
      ventaPerdida,
      demandaMensual: Math.round(demandaMensual),
      tasaQuiebre: tasaQuiebre.toFixed(1),
      unidadesAComprar
    });
  };

  const calcularGraficos = (sku, demanda) => {
    const desdeMes = dayjs(fechaDesde).format("YYYY-MM");
    const resumen = {};
const maestro = JSON.parse(sessionStorage.getItem("maestro") || "[]");
const precios = Object.fromEntries(maestro.map(m => [m.sku, m.precio_venta || 0]));

    demanda
      .filter((r) => {
        const fecha = new Date(r.fecha);
        return fecha >= new Date(fechaDesde) && fecha <= new Date(fechaHasta) && (sku === "__TOTAL__" || r.sku === sku);
      })
      .forEach((r) => {
        const mes = dayjs(r.fecha).format("YYYY-MM");
        if (!resumen[mes]) resumen[mes] = { real: 0, limpia: 0, perdidas: 0 };
        const real = Number(r.demanda_original || 0);
        const limpia = Number(r.demanda_sin_outlier || 0);
        resumen[mes].real += real;
resumen[mes].limpia += limpia;
const perdida = Math.max(0, limpia - real);
resumen[mes].perdidas += perdida;
resumen[mes].perdidas_euros = (resumen[mes].perdidas_euros || 0) + (perdida * (precios[r.sku] || 0));

      });

    const meses = Object.keys(resumen).sort();
    const real = meses.map(m => resumen[m].real);
    const limpia = meses.map(m => resumen[m].limpia);
    const perdidas = meses.map(m => resumen[m].perdidas_euros || 0);
    const quiebre = meses.map(m =>
      resumen[m].limpia > 0 ? (resumen[m].perdidas / resumen[m].limpia) * 100 : 0
    );

    const forecast = JSON.parse(sessionStorage.getItem("forecast") || "[]");
    const stockProy = JSON.parse(sessionStorage.getItem("stock_proyectado") || "[]");

    const forecastHistorico = forecast
      .filter(f => f.tipo_mes === "histórico" && (sku === "__TOTAL__" || f.sku === sku))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    const forecastProyeccion = forecast
      .filter(f => f.tipo_mes === "proyección" && (sku === "__TOTAL__" || f.sku === sku))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    const mesesForecast = [
      ...new Set([
        ...forecastHistorico.map(f => f.mes),
        ...forecastProyeccion.map(f => f.mes)
      ])
    ].filter(m => m >= desdeMes).sort();

    const demandaLimpiaHistorica = mesesForecast.map(m =>
      forecastHistorico.some(f => f.mes === m)
        ? forecastHistorico.filter(f => f.mes === m).reduce((s, f) => s + (f.demanda_limpia || 0), 0)
        : null
    );

    const forecastValores = mesesForecast.map(m =>
      forecastProyeccion.some(f => f.mes === m)
        ? forecastProyeccion.filter(f => f.mes === m).reduce((s, f) => s + (f.forecast || 0), 0)
        : null
    );

    const forecastValoresUp = mesesForecast.map(m =>
  forecastProyeccion.some(f => f.mes === m)
    ? forecastProyeccion.filter(f => f.mes === m).reduce((s, f) => s + (f.forecast_up || 0), 0)
    : null
);


    const stockProyectadoFiltrado = stockProy
      .filter(f => {
        const fechaMes = dayjs(f.mes + "-01");
        return (sku === "__TOTAL__" || f.sku === sku) && fechaMes.isSameOrAfter(dayjs(desdeMes));
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Agrupar por mes
const agrupado = {};
stockProyectadoFiltrado.forEach(f => {
  if (!agrupado[f.mes]) {
    agrupado[f.mes] = { stock: 0, perdida: 0 };
  }
  agrupado[f.mes].stock += f.stock_final_mes || 0;
  agrupado[f.mes].perdida += f.perdida_proyectada_euros || 0;
});

const mesesProyeccion = Object.keys(agrupado).sort();
const stockProyValores = mesesProyeccion.map(m => agrupado[m].stock);
const perdidasFuturas = mesesProyeccion.map(m => agrupado[m].perdida);

const desde = new Date(fechaDesde);
const hasta = new Date(fechaHasta);

const stockHistoricoFiltrado = stockHist.filter(s => {
  const fecha = new Date(s.fecha);
  return (sku === "__TOTAL__" || s.sku === sku) && fecha >= desde && fecha <= hasta;
});

const stockPorMes = {};
stockHistoricoFiltrado.forEach(s => {
  const mes = dayjs(s.fecha).format("YYYY-MM");
  if (!stockPorMes[mes]) stockPorMes[mes] = 0;
  stockPorMes[mes] += s.stock || 0;
});

const mesesStockHistorico = Object.keys(stockPorMes).sort();
const stockHistorico = mesesStockHistorico.map(m => stockPorMes[m]);



    setGraficos({
  meses,
  mesesForecast,
  real,
  limpia,
  perdidas,
  quiebre,
  forecast: forecastValores,
  forecastUp: forecastValoresUp,
  demandaLimpiaHistorica,
  stockProyectado: stockProyValores,
  mesesProyeccion,
  stockHistorico,
  mesesStockHistorico,
  perdidasFuturas
});

  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
        <PackageSearch className="w-6 h-6 text-gray-600" />
        Resumen General
      </h1>

      {/* Selectores */}
      <div className="flex flex-col md:flex-row gap-4">
  <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 w-full md:w-64 shadow-sm">
    <label className="block text-xs text-gray-500 mb-1">Selecciona un SKU</label>
    <select
      value={skuSeleccionado}
      onChange={(e) => setSkuSeleccionado(e.target.value)}
      className="w-full bg-white border border-gray-300 text-sm px-3 py-2 rounded shadow-inner"
    >
      <option value="__TOTAL__">Todos los SKUs</option>
      {skusDisponibles.map((sku) => (
        <option key={sku} value={sku}>{sku}</option>
      ))}
    </select>
  </div>

  <div className="flex flex-1 gap-4">
    <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 flex-1 shadow-sm">
      <label className="block text-xs text-gray-500 mb-1">Desde</label>
      <input
        type="date"
        value={fechaDesde}
        onChange={(e) => setFechaDesde(e.target.value)}
        className="w-full bg-white border border-gray-300 text-sm px-3 py-2 rounded shadow-inner"
      />
    </div>

    <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 flex-1 shadow-sm">
      <label className="block text-xs text-gray-500 mb-1">Hasta</label>
      <input
        type="date"
        value={fechaHasta}
        onChange={(e) => setFechaHasta(e.target.value)}
        className="w-full bg-white border border-gray-300 text-sm px-3 py-2 rounded shadow-inner"
      />
    </div>
  </div>
</div>


      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <KpiCard label="Stock Actual" value={kpis.stockActual?.toLocaleString("es-CL")} />
        <KpiCard label="Unid. Vendidas (12M)" value={kpis.ventas12m?.toLocaleString("es-CL")} />
        <KpiCard label="Facturación (12M)" value={`€ ${kpis.facturacion?.toLocaleString("es-CL")}`} />
        <KpiCard label="Unid. en Tránsito" value={kpis.unidadesTransito?.toLocaleString("es-CL")} />
        <KpiCard label="SKUs a Comprar" value={kpis.skusAComprar?.toLocaleString("es-CL")} />
        <KpiCard label="Unidades Perdidas (12M)" value={kpis.perdidas12m?.toLocaleString("es-CL")} rojo />
        <KpiCard label="Venta Perdida (12M)" value={`€ ${kpis.ventaPerdida?.toLocaleString("es-CL")}`} rojo />
        <KpiCard label="Demanda Mensual (3M)" value={kpis.demandaMensual?.toLocaleString("es-CL")} />
        <KpiCard label="Tasa de Quiebre" value={`${kpis.tasaQuiebre}%`} />
        <KpiCard label="Unidades a Comprar" value={kpis.unidadesAComprar?.toLocaleString("es-CL")} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
  <ChartCard title="📈 Demanda mensual: real vs limpia" datasets={[
    { label: "Demanda Real", data: graficos.real, borderColor: "#3b82f6" },
    { label: "Demanda Limpia", data: graficos.limpia, borderColor: "#22c55e" }
  ]} labels={graficos.meses} />

  <ChartCard title="📦 Stock histórico mensual" datasets={[
    { label: "Stock Histórico", data: graficos.stockHistorico, borderColor: "#a78bfa" }
  ]} labels={graficos.mesesStockHistorico} />

  <ChartCard title="💸 Venta Perdida por mes (€)" datasets={[
  { label: "Venta Perdida", data: graficos.perdidas, borderColor: "#ef4444" }
]} labels={graficos.meses} />



        <ChartCard title="🔄 Forecast vs Demanda Limpia" datasets={[
  { label: "Forecast", data: graficos.forecast, borderColor: "#0ea5e9" },
  { label: "Forecast + Margen", data: graficos.forecastUp, borderColor: "#8b5cf6" },
  { label: "Demanda Limpia", data: graficos.demandaLimpiaHistorica, borderColor: "#16a34a" }
]} labels={graficos.mesesForecast} />


        <ChartCard title="📦 Stock Proyectado" datasets={[
  { label: "Stock Proyectado", data: graficos.stockProyectado, borderColor: "#a855f7" }
]} labels={graficos.mesesProyeccion} />

<ChartCard title="💸 Pérdidas Proyectadas (€)" datasets={[
  { label: "Pérdidas Futuras", data: graficos.perdidasFuturas, borderColor: "#f97316" }
]} labels={graficos.mesesProyeccion} />

      </div>
    </div>
  );
}

function KpiCard({ label, value, rojo = false }) {
  const color = rojo ? "text-red-600" : "text-gray-800";
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value ?? "-"}</p>
    </div>
  );
}

function ChartCard({ title, datasets, labels, options = {} }) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-sm text-center mb-2 font-medium text-gray-700">{title}</h2>
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          plugins: { legend: { position: "bottom" } },
          ...options
        }}
      />
    </div>
  );
}

























