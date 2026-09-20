import React, { useState, useEffect, useRef } from 'react';
import {
  Scan, RefreshCw, Volume2, VolumeX, ShieldCheck,
  Cpu, Sparkles, Activity, Compass,
  Atom, Zap, CheckCircle2, Download, Sliders,
  CornerDownRight, Eye
} from 'lucide-react';

export default function App() {
  const [facingMode, setFacingMode] = useState('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.82);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusLog, setStatusLog] = useState("Sensors Online");
  const [activeTab, setActiveTab] = useState('utility');

  const [diagnosis, setDiagnosis] = useState(null);
  const [history, setHistory] = useState([]);
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);

  const playAcousticChime = (freq = 432) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.045, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn("Audio Context Notice:", e);
    }
  };

  const speakWithHumanCadence = (text) => {
    if (!soundEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const phrases = text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
    const voices = window.speechSynthesis.getVoices();

    const humanVoice = voices.find(v =>
      v.name.includes('Natural') ||
      v.name.includes('Online (Natural)') ||
      v.name.includes('Samantha') ||
      v.name.includes('Google UK English Female') ||
      v.name.includes('Aria') ||
      v.name.includes('Jenny') ||
      v.name.includes('Google US English')
    ) || voices.find(v => v.lang.startsWith('en') && !v.name.includes('espeak'));

    phrases.forEach((phrase) => {
      const utterance = new SpeechSynthesisUtterance(phrase.trim());
      if (humanVoice) utterance.voice = humanVoice;
      utterance.pitch = 0.98;
      utterance.rate = speechRate;
      window.speechSynthesis.speak(utterance);
    });
  };

  const startCamera = async () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setStatusLog("Sensors Synchronized");
      }
    } catch (err) {
      console.error("Camera error:", err);
      setStatusLog("Sensor Standby");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  const captureAndInspect = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || analyzing) return;

    setAnalyzing(true);
    setStatusLog("Scanning Geometry & Surface...");
    playAcousticChime(369.99);

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.88);
      setSnapshotPreview(base64Image);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      const resData = await response.json();

      if (response.ok && resData.success && resData.data) {
        const item = resData.data;
        setDiagnosis(item);
        setStatusLog(`Locked: ${item.identified_object}`);
        playAcousticChime(587.33);

        speakWithHumanCadence(`Identified ${item.identified_object}. ${item.functional_purpose || item.technical_summary}`);

        setHistory(prev => [{
          id: Date.now(),
          name: item.identified_object,
          domain: item.domain,
          confidence: item.confidence,
          vibe: item.aesthetic_vibe,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }, ...prev.slice(0, 7)]);
      }
    } catch (err) {
      console.error(err);
      setStatusLog("Inference Timeout");
    } finally {
      setAnalyzing(false);
    }
  };

  const exportTelemetryReport = () => {
    const reportData = {
      sessionTimestamp: new Date().toISOString(),
      activeItem: diagnosis,
      sessionHistory: history
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LumiVision-Telemetry-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-stone-200 p-4 font-sans flex flex-col items-center justify-start max-w-md mx-auto selection:bg-cyan-500/20 antialiased pb-10">
      <canvas ref={canvasRef} className="hidden" />

      {/* Obsidian Top Navigation Bar */}
      <header className="w-full flex items-center justify-between p-3.5 mb-3 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 p-[1.5px] shadow-lg shadow-cyan-500/10">
            <div className="w-full h-full bg-[#07090e] rounded-[14px] flex items-center justify-center">
              <Scan className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold tracking-wide text-white">LumiVision</h1>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20">Studio</span>
            </div>
            <p className="text-[10px] text-stone-400 font-serif italic">Multimodal Spatial Diagnostics</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition ${showSettings ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-white/[0.04] text-stone-300 border-white/[0.06] hover:bg-white/[0.08]'}`}
            title="Acoustic Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-stone-300 active:scale-95 transition"
            title="Switch Sensor"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-stone-300 active:scale-95 transition"
            title="Toggle Voice Synthesizer"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-300" /> : <VolumeX className="w-3.5 h-3.5 text-stone-500" />}
          </button>
        </div>
      </header>

      {/* Voice Pacing and Tempo Slider Tray */}
      {showSettings && (
        <div className="w-full mb-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center text-[11px] font-mono text-stone-300">
            <span>Voice Tempo & Pacing</span>
            <span className="text-cyan-400">{Math.round(speechRate * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.65"
            max="1.05"
            step="0.01"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 bg-white/[0.1] rounded-lg h-1.5 cursor-pointer"
          />
          <span className="text-[10px] text-stone-400">Calibrated for natural human pauses.</span>
        </div>
      )}

      {/* Cyber Reticle Optical Viewfinder */}
      <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden bg-black border border-white/[0.1] shadow-2xl flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
        />

        {/* Viewfinder Reticle Corners */}
        <div className="absolute inset-5 pointer-events-none border border-white/[0.07] rounded-2xl flex flex-col justify-between p-3.5">
          <div className="flex justify-between items-start">
            <span className="w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400/90 rounded-tl-sm" />
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/[0.09] text-[10px] font-mono text-stone-300">
              <span className={`w-1.5 h-1.5 rounded-full ${analyzing ? 'bg-amber-400 animate-ping' : 'bg-cyan-400'}`} />
              <span>{statusLog}</span>
            </div>
            <span className="w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400/90 rounded-tr-sm" />
          </div>

          <div className="flex justify-between">
            <span className="w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400/90 rounded-bl-sm" />
            <span className="w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400/90 rounded-br-sm" />
          </div>
        </div>

        {/* Polaroid Specimen Thumbnail */}
        {snapshotPreview && (
          <div className="absolute bottom-3 left-3 w-12 h-16 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/60 backdrop-blur-md">
            <img src={snapshotPreview} alt="Captured" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Main Inspection Trigger Button */}
      <button
        onClick={captureAndInspect}
        disabled={analyzing}
        className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 hover:opacity-95 text-white font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Zap className="w-4 h-4 fill-white text-transparent" />
        <span>{analyzing ? "Synthesizing Neural Graph..." : "Capture & Inspect Target"}</span>
      </button>

      {/* Diagnostic Intelligence Deck */}
      {diagnosis && (
        <div className="w-full mt-3 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-3xl p-4 shadow-2xl flex flex-col gap-3.5 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">Verified Entity</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              {diagnosis.confidence}% Precision
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">{diagnosis.identified_object}</h2>
              {diagnosis.scientific_name && (
                <span className="text-xs text-stone-400 font-mono italic">({diagnosis.scientific_name})</span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {diagnosis.domain} • <span className="text-fuchsia-400 font-serif italic">{diagnosis.aesthetic_vibe}</span>
            </p>
          </div>

          {/* Secondary Detected Items */}
          {diagnosis.scene_objects && diagnosis.scene_objects.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mr-1">
                <Eye className="w-3 h-3 text-cyan-400" /> Also In Scene:
              </span>
              {diagnosis.scene_objects.map((obj, i) => (
                <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] text-stone-300">
                  {obj.name} <span className="text-cyan-400 text-[9px]">{obj.confidence}%</span>
                </span>
              ))}
            </div>
          )}

          {/* Interactive Feature Tabs */}
          <div className="flex rounded-xl bg-white/[0.03] p-1 border border-white/[0.06] gap-1">
            {[
              { id: 'utility', label: 'Function', icon: Compass },
              { id: 'materials', label: 'Material', icon: Atom },
              { id: 'mechanics', label: 'Mechanics', icon: Cpu },
              { id: 'guidelines', label: 'Insights', icon: Sparkles }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition ${activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                    }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Information Panels */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-xs leading-relaxed text-stone-300 min-h-[72px] flex flex-col justify-center">
            {activeTab === 'utility' && (
              <div>
                <span className="text-[10px] uppercase font-mono text-cyan-400 block mb-1">Practical Purpose</span>
                <p>{diagnosis.functional_purpose || diagnosis.technical_summary}</p>
              </div>
            )}
            {activeTab === 'materials' && (
              <div>
                <span className="text-[10px] uppercase font-mono text-fuchsia-400 block mb-1">Surface & Chemistry</span>
                <p>{diagnosis.material_profile || "Composite solid state matter with structured surface boundary."}</p>
              </div>
            )}
            {activeTab === 'mechanics' && (
              <div>
                <span className="text-[10px] uppercase font-mono text-indigo-400 block mb-1">Internal Mechanism</span>
                <p>{diagnosis.mechanics || "Static force distribution equilibrium under ambient gravity."}</p>
              </div>
            )}
            {activeTab === 'guidelines' && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-mono text-emerald-400 block mb-0.5">Telemetry Highlights</span>
                <div className="flex flex-wrap gap-1.5">
                  {(diagnosis.insights || diagnosis.characteristics || ["Structural Symmetry", "Stable Plane"]).map((item, idx) => (
                    <span key={idx} className="text-[10px] font-mono bg-white/[0.03] border border-white/[0.06] text-stone-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CornerDownRight className="w-2.5 h-2.5 text-cyan-400" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discovery Feed & Telemetry Archive */}
      {history.length > 0 && (
        <div className="w-full mt-3 rounded-3xl bg-white/[0.02] border border-white/[0.06] p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium">
            <span className="flex items-center gap-1.5 text-stone-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Session Telemetry Feed
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-stone-500">{history.length} Scanned</span>
              <button
                onClick={exportTelemetryReport}
                className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 transition"
                title="Download JSON Report"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {history.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-medium text-stone-200">{item.name}</span>
                  <span className="text-[10px] text-stone-500 font-mono">[{item.domain}]</span>
                </div>
                <span className="text-[10px] font-mono text-stone-500">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}