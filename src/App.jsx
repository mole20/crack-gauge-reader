import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  Image as ImageIcon,
  Ruler,
  Search,
  ScanLine,
  Crosshair,
  RotateCcw,
} from "lucide-react";

export default function App() {
  const [projectName, setProjectName] = useState("Demo Crack Monitoring Project");
  const [thresholdWarning, setThresholdWarning] = useState(1.0);
  const [thresholdAction, setThresholdAction] = useState(2.0);
  const [selectedGaugeId, setSelectedGaugeId] = useState("CG-001");
  const [search, setSearch] = useState("");
  const [gauges, setGauges] = useState([
    {
      id: "CG-001",
      qrPayload: "crack_gauge|project=PROJECT-001|gauge_id=CG-001",
      location: "North retaining wall, Sta. 10+25",
      baselineReading: 0.0,
      baselineDate: "2026-05-21",
      baselineImage: null,
      readings: [
        {
          date: "2026-05-21",
          value: 0.0,
          image: null,
          note: "Baseline reading established.",
          overlay: null,
        },
      ],
    },
  ]);

  const selectedGauge = gauges.find((g) => g.id === selectedGaugeId) || gauges[0];
  const currentReading = selectedGauge?.readings?.[selectedGauge.readings.length - 1];
  const delta = currentReading ? currentReading.value - selectedGauge.baselineReading : 0;
  const absDelta = Math.abs(delta);

  const status = useMemo(() => {
    if (absDelta >= Number(thresholdAction)) {
      return { label: "Action Exceedance", className: "status action", icon: AlertTriangle };
    }
    if (absDelta >= Number(thresholdWarning)) {
      return { label: "Warning Trigger", className: "status warning", icon: AlertTriangle };
    }
    return { label: "Within Limits", className: "status ok", icon: CheckCircle2 };
  }, [absDelta, thresholdWarning, thresholdAction]);

  const filteredGauges = gauges.filter((g) =>
    `${g.id} ${g.location}`.toLowerCase().includes(search.toLowerCase())
  );

  const addGauge = () => {
    const nextNumber = String(gauges.length + 1).padStart(3, "0");
    const id = `CG-${nextNumber}`;
    const newGauge = {
      id,
      qrPayload: `crack_gauge|project=PROJECT-001|gauge_id=${id}`,
      location: "New gauge location",
      baselineReading: 0,
      baselineDate: new Date().toISOString().slice(0, 10),
      baselineImage: null,
      readings: [],
    };
    setGauges([...gauges, newGauge]);
    setSelectedGaugeId(id);
  };

  const updateGauge = (patch) => {
    setGauges(gauges.map((g) => (g.id === selectedGauge.id ? { ...g, ...patch } : g)));
  };

  const addReading = ({ value, image, note, overlay }) => {
    const reading = {
      date: new Date().toISOString().slice(0, 10),
      value: Number(value),
      image,
      note: note || "",
      overlay,
    };
    setGauges(
      gauges.map((g) =>
        g.id === selectedGauge.id ? { ...g, readings: [...g.readings, reading] } : g
      )
    );
  };

  const handleQrResult = (payload) => {
    const id = extractGaugeId(payload);
    if (!id) {
      alert("QR code detected, but no gauge_id was found in the payload.");
      return;
    }

    const existing = gauges.find((g) => g.id === id);
    if (existing) {
      setSelectedGaugeId(id);
      return;
    }

    const newGauge = {
      id,
      qrPayload: payload,
      location: "New gauge scanned in field",
      baselineReading: 0,
      baselineDate: new Date().toISOString().slice(0, 10),
      baselineImage: null,
      readings: [],
    };
    setGauges([...gauges, newGauge]);
    setSelectedGaugeId(id);
  };

  const exportJson = () => {
    const data = {
      projectName,
      thresholds: {
        warning_mm: Number(thresholdWarning),
        action_mm: Number(thresholdAction),
      },
      gauges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crack-gauge-monitoring-records.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const StatusIcon = status.icon;

  return (
    <div className="page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="header"
        >
          <div>
            <h1>Crack Gauge Reader</h1>
            <p>QR-based gauge lookup, image-assisted reading, baseline comparison, and exceedance alerts.</p>
          </div>
          <div className="buttonRow">
            <button className="primary" onClick={addGauge}><Plus size={16} /> Add Gauge</button>
            <button className="secondary" onClick={exportJson}><Download size={16} /> Export</button>
          </div>
        </motion.div>

        <QrScannerPanel onQrResult={handleQrResult} />

        <div className="layout">
          <div className="sidebar">
            <Card>
              <label>Project Name</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />

              <div className="twoCol">
                <div>
                  <label>Warning, mm</label>
                  <input type="number" step="0.1" value={thresholdWarning} onChange={(e) => setThresholdWarning(e.target.value)} />
                </div>
                <div>
                  <label>Action, mm</label>
                  <input type="number" step="0.1" value={thresholdAction} onChange={(e) => setThresholdAction(e.target.value)} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="searchBox">
                <Search size={16} />
                <input placeholder="Search gauges" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="gaugeList">
                {filteredGauges.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGaugeId(g.id)}
                    className={g.id === selectedGauge.id ? "gaugeCard selected" : "gaugeCard"}
                  >
                    <span><b>{g.id}</b><QrCode size={16} /></span>
                    <small>{g.location}</small>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {selectedGauge && (
            <div className="main">
              <div className={status.className}>
                <div className="statusLeft">
                  <StatusIcon size={34} />
                  <div>
                    <h2>{selectedGauge.id}: {status.label}</h2>
                    <p>Change from baseline: <b>{delta.toFixed(2)} mm</b></p>
                  </div>
                </div>
                <div className="metrics">
                  <Metric label="Baseline" value={`${selectedGauge.baselineReading.toFixed(2)} mm`} />
                  <Metric label="Current" value={`${currentReading ? currentReading.value.toFixed(2) : "--"} mm`} />
                  <Metric label="Abs. Change" value={`${absDelta.toFixed(2)} mm`} />
                </div>
              </div>

              <div className="twoCards">
                <GaugeSetup selectedGauge={selectedGauge} updateGauge={updateGauge} />
                <ImageMeasurementReader
                  selectedGauge={selectedGauge}
                  addReading={addReading}
                  updateGauge={updateGauge}
                />
              </div>

              <AnnotatedPhoto
                gauge={selectedGauge}
                currentReading={currentReading}
                delta={delta}
                statusLabel={status.label}
              />
              <ReadingsTable gauge={selectedGauge} baseline={selectedGauge.baselineReading} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function extractGaugeId(payload) {
  const text = String(payload || "");
  const match = text.match(/gauge_id=([^|&\s]+)/i) || text.match(/CG-\d{3,}/i);
  return match ? (match[1] || match[0]).trim() : "";
}

function Card({ children }) {
  return <div className="card">{children}</div>;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div>{label}</div>
      <b>{value}</b>
    </div>
  );
}

function QrScannerPanel({ onQrResult }) {
  const [manualPayload, setManualPayload] = useState("crack_gauge|project=PROJECT-001|gauge_id=CG-001");
  const [scannerNote, setScannerNote] = useState(
    "Use manual scan for this web prototype. Live camera QR scanning can be added in the next version."
  );

  const tryBrowserScan = async () => {
    if (!("BarcodeDetector" in window)) {
      setScannerNote("This browser does not expose BarcodeDetector. Use the manual QR payload field for now.");
      return;
    }
    setScannerNote("BarcodeDetector is available. Next version can connect this to the live camera.");
  };

  return (
    <Card>
      <div className="qrPanel">
        <div>
          <h3><ScanLine size={20} /> QR Gauge Lookup</h3>
          <label>QR Payload or Scanned Value</label>
          <input className="mono" value={manualPayload} onChange={(e) => setManualPayload(e.target.value)} />
          <small>{scannerNote}</small>
        </div>
        <div className="buttonRow">
          <button className="secondary" onClick={tryBrowserScan}>Check Scanner</button>
          <button className="primary" onClick={() => onQrResult(manualPayload)}><QrCode size={16} /> Use QR</button>
        </div>
      </div>
    </Card>
  );
}

function GaugeSetup({ selectedGauge, updateGauge }) {
  const baselineRef = useRef(null);

  const onBaselineImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateGauge({ baselineImage: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <h3><QrCode size={20} /> Gauge Registration</h3>

      <label>Gauge ID</label>
      <input value={selectedGauge.id} disabled />

      <label>Location / Notes</label>
      <textarea value={selectedGauge.location} onChange={(e) => updateGauge({ location: e.target.value })} />

      <div className="twoCol">
        <div>
          <label>Baseline Reading, mm</label>
          <input type="number" step="0.01" value={selectedGauge.baselineReading} onChange={(e) => updateGauge({ baselineReading: Number(e.target.value) })} />
        </div>
        <div>
          <label>Baseline Date</label>
          <input type="date" value={selectedGauge.baselineDate} onChange={(e) => updateGauge({ baselineDate: e.target.value })} />
        </div>
      </div>

      <input ref={baselineRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onBaselineImage(e.target.files?.[0])} />
      <button className="secondary full" onClick={() => baselineRef.current?.click()}><Camera size={16} /> Capture Baseline Photo</button>

      <div className="payload">QR Payload: <span>{selectedGauge.qrPayload}</span></div>
    </Card>
  );
}

function ImageMeasurementReader({ selectedGauge, addReading, updateGauge }) {
  const [image, setImage] = useState(null);
  const [note, setNote] = useState("");
  const [scaleDistanceMm, setScaleDistanceMm] = useState(10);
  const [mode, setMode] = useState("scaleA");
  const [points, setPoints] = useState({ scaleA: null, scaleB: null, read: null });
  const [manualValue, setManualValue] = useState(0);
  const fileRef = useRef(null);
  const imgWrapRef = useRef(null);

  const pxPerMm = useMemo(() => {
    if (!points.scaleA || !points.scaleB || !scaleDistanceMm) return null;
    const dx = points.scaleB.x - points.scaleA.x;
    const dy = points.scaleB.y - points.scaleA.y;
    return Math.sqrt(dx * dx + dy * dy) / Number(scaleDistanceMm);
  }, [points, scaleDistanceMm]);

  const calculatedReading = useMemo(() => {
    if (!pxPerMm || !points.scaleA || !points.read) return null;
    const value = (points.read.x - points.scaleA.x) / pxPerMm;
    return Number(value.toFixed(2));
  }, [pxPerMm, points]);

  const finalValue = calculatedReading ?? Number(manualValue);

  const onImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleImageClick = (e) => {
    if (!imgWrapRef.current || !image) return;
    const rect = imgWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPoints((p) => ({ ...p, [mode]: { x, y } }));
    if (mode === "scaleA") setMode("scaleB");
    if (mode === "scaleB") setMode("read");
  };

  const resetPoints = () => {
    setPoints({ scaleA: null, scaleB: null, read: null });
    setMode("scaleA");
  };

  const saveReading = () => {
    const overlay = { points, scaleDistanceMm, calculatedReading, manualValue: Number(manualValue) };
    addReading({ value: finalValue, image, note, overlay });

    if (selectedGauge.readings.length === 0) {
      updateGauge({
        baselineReading: finalValue,
        baselineImage: image,
        baselineDate: new Date().toISOString().slice(0, 10),
      });
    }
    setNote("");
  };

  return (
    <Card>
      <h3><Ruler size={20} /> Image-Assisted Reading</h3>
      <p className="hint">
        Upload or capture the gauge photo. Click two known scale marks, then click the current reading point.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onImage(e.target.files?.[0])} />
      <button className="secondary full" onClick={() => fileRef.current?.click()}><ImageIcon size={16} /> Capture / Upload Gauge Photo</button>

      <div className="twoCol">
        <div>
          <label>Known scale distance, mm</label>
          <input type="number" step="0.1" value={scaleDistanceMm} onChange={(e) => setScaleDistanceMm(e.target.value)} />
        </div>
        <div>
          <label>Manual fallback, mm</label>
          <input type="number" step="0.01" value={manualValue} onChange={(e) => setManualValue(e.target.value)} />
        </div>
      </div>

      <div className="buttonRow wrap">
        <button className={mode === "scaleA" ? "primary" : "secondary"} onClick={() => setMode("scaleA")}>1. Scale Start</button>
        <button className={mode === "scaleB" ? "primary" : "secondary"} onClick={() => setMode("scaleB")}>2. Scale End</button>
        <button className={mode === "read" ? "primary" : "secondary"} onClick={() => setMode("read")}>3. Reading Point</button>
        <button className="secondary" onClick={resetPoints}><RotateCcw size={16} /> Reset</button>
      </div>

      <div ref={imgWrapRef} onClick={handleImageClick} className="imageBox">
        {image ? (
          <img src={image} alt="Gauge capture" />
        ) : (
          <div className="emptyImage"><Camera size={42} /><p>No image selected.</p></div>
        )}
        {Object.entries(points).map(([key, p]) =>
          p ? <PointMarker key={key} point={p} label={key === "scaleA" ? "A" : key === "scaleB" ? "B" : "R"} /> : null
        )}
        {points.scaleA && points.scaleB && <Line a={points.scaleA} b={points.scaleB} />}
        {points.scaleA && points.read && <Line a={points.scaleA} b={points.read} dashed />}
      </div>

      <div className="twoCol">
        <div className="readingBox">
          <span>Calculated Reading</span>
          <b>{calculatedReading === null ? "--" : `${calculatedReading.toFixed(2)} mm`}</b>
        </div>
        <div className="readingBox">
          <span>Saved Reading</span>
          <b>{finalValue.toFixed(2)} mm</b>
        </div>
      </div>

      <label>Field Note</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lighting, angle, condition, confidence, etc." />

      <button className="primary full" onClick={saveReading}><Crosshair size={16} /> Save Reading</button>
    </Card>
  );
}

function PointMarker({ point, label }) {
  return (
    <div className="pointMarker" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
      {label}
    </div>
  );
}

function Line({ a, b, dashed }) {
  return (
    <svg className="overlaySvg">
      <line
        x1={`${a.x}%`}
        y1={`${a.y}%`}
        x2={`${b.x}%`}
        y2={`${b.y}%`}
        stroke="black"
        strokeWidth="3"
        strokeDasharray={dashed ? "8 6" : "0"}
      />
    </svg>
  );
}

function AnnotatedPhoto({ gauge, currentReading, delta, statusLabel }) {
  const image = currentReading?.image || gauge.baselineImage;
  const overlay = currentReading?.overlay;

  return (
    <Card>
      <h3>Annotated Gauge Photo</h3>
      <div className="imageBox large">
        {image ? (
          <img src={image} alt="Gauge reading" />
        ) : (
          <div className="emptyImage"><Camera size={42} /><p>No image uploaded yet.</p></div>
        )}
        {overlay?.points &&
          Object.entries(overlay.points).map(([key, p]) =>
            p ? <PointMarker key={key} point={p} label={key === "scaleA" ? "A" : key === "scaleB" ? "B" : "R"} /> : null
          )}
        {overlay?.points?.scaleA && overlay?.points?.scaleB && <Line a={overlay.points.scaleA} b={overlay.points.scaleB} />}
        {overlay?.points?.scaleA && overlay?.points?.read && <Line a={overlay.points.scaleA} b={overlay.points.read} dashed />}

        <div className="photoTag">
          <b>{gauge.id}</b>
          <small>Reading: {currentReading ? currentReading.value.toFixed(2) : gauge.baselineReading.toFixed(2)} mm</small>
          <small>Δ Baseline: {delta.toFixed(2)} mm</small>
          <span>{statusLabel}</span>
        </div>
      </div>
    </Card>
  );
}

function ReadingsTable({ gauge, baseline }) {
  return (
    <Card>
      <h3>Reading History</h3>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reading, mm</th>
              <th>Change, mm</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {gauge.readings.map((r, idx) => (
              <tr key={idx}>
                <td>{r.date}</td>
                <td><b>{r.value.toFixed(2)}</b></td>
                <td>{(r.value - baseline).toFixed(2)}</td>
                <td>{r.note || "--"}</td>
              </tr>
            ))}
            {gauge.readings.length === 0 && (
              <tr>
                <td colSpan="4" className="center">No readings saved yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}