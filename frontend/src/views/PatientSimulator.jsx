import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beaker, Users, Activity, Heart, ShieldAlert,
  Flame, TrendingUp, RefreshCw, Zap, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';


const DISEASE_DRUGS = {
  type2_diabetes: {
    name: "Type 2 Diabetes",
    drugName: "Metformin + GLP-1 Combo",
    metricName: "Blood Glucose",
    metricUnit: "mg/dL",
    baseMetric: 180,
    a: { name: "Metformin Ratio", desc: "Reduces liver sugar production" },
    b: { name: "GLP-1 Ratio", desc: "Boosts natural insulin response" },
    c: { name: "Excipient Ratio", desc: "Inactive formulation binder" }
  },
  hypertension: {
    name: "Hypertension",
    drugName: "Lisinopril + Amlodipine Combo",
    metricName: "Systolic Blood Pressure",
    metricUnit: "mmHg",
    baseMetric: 155,
    a: { name: "Lisinopril Ratio", desc: "Vasodilator (opens arteries)" },
    b: { name: "Amlodipine Ratio", desc: "Calcium block (relaxes muscles)" },
    c: { name: "Excipient Ratio", desc: "Inactive formulation binder" }
  },
  nsclc: {
    name: "Non-Small Cell Lung Cancer",
    drugName: "Osimertinib + Cytotoxic Agent",
    metricName: "Tumor Diameter",
    metricUnit: "cm",
    baseMetric: 6.5,
    a: { name: "Osimertinib Ratio", desc: "Targeted tumor cell inhibitor" },
    b: { name: "Cytotoxic Chemo Ratio", desc: "DNA alkylation destroyer" },
    c: { name: "Excipient Ratio", desc: "Inactive formulation binder" }
  }
};

export default function PatientSimulator() {
  const [disease, setDisease] = useState('type2_diabetes');
  
  // Patient settings
  const [age, setAge] = useState(45);
  const [weight, setWeight] = useState(80);
  const [comorbidities, setComorbidities] = useState({
    obesity: false,
    kidney_disease: false,
    high_blood_pressure: false,
  });

  // Drug settings
  const [compA, setCompA] = useState(0.4);
  const [compB, setCompB] = useState(0.3);
  const [compC, setCompC] = useState(0.3);
  const [dosage, setDosage] = useState(1.0);

  // Simulation timeline
  const [week, setWeek] = useState(0);
  const [timeline, setTimeline] = useState([]);

  const activeDrug = DISEASE_DRUGS[disease];

  // Calculate live values based on sliders
  const currentStatus = useMemo(() => {
    const ageMultiplier = age > 65 ? 1.3 : (age < 18 ? 0.8 : 1.0);
    const weightMultiplier = weight > 100 ? 1.25 : 1.0;
    
    // Base clearance factor
    let clearance = 1.0 / (ageMultiplier * weightMultiplier);
    if (comorbidities.kidney_disease) clearance *= 0.6; // slower clearance

    // Effective drug concentration in central body compartment
    const concentration = dosage * 1.2 * clearance;

    // Efficacy and toxicity score
    const efficacyFactor = 0.5 * compA + 0.4 * compB - 0.2 * compC;
    const toxicityFactor = 0.6 * compC + 0.2 * compB;

    // Vitals Calculations
    let hr = 72 + (toxicityFactor * 25 * dosage * ageMultiplier);
    if (comorbidities.high_blood_pressure) hr += 6;

    let untreatedDeterioration = 0;
    if (dosage < 0.25) {
      if (disease === 'type2_diabetes') {
        untreatedDeterioration = week * 12;
      } else if (disease === 'hypertension') {
        untreatedDeterioration = week * 6;
      } else {
        untreatedDeterioration = week * 0.8;
      }
    }

    let primaryValue = activeDrug.baseMetric + untreatedDeterioration;
    if (disease === 'type2_diabetes') {
      const reduction = (60 * compA + 90 * compB) * concentration * efficacyFactor;
      primaryValue = Math.max(75, primaryValue - reduction);
    } else if (disease === 'hypertension') {
      const reduction = (35 * compA + 25 * compB) * concentration * efficacyFactor;
      primaryValue = Math.max(90, primaryValue - reduction);
    } else {
      const reduction = (3.5 * compA + 1.5 * compB) * concentration * efficacyFactor;
      primaryValue = Math.max(0.1, primaryValue - reduction);
    }

    // Danger Level & Simplified Terminology
    let dangerScore = 0;
    let warnings = [];
    if (hr > 100) {
      dangerScore += 1;
      warnings.push("Elevated Heart Rate (Tachycardia)");
    }
    if (hr > 120) {
      dangerScore += 2;
      warnings.push("Critical Cardiac Strain!");
    }

    if (dosage < 0.25) {
      dangerScore += 1;
      if (disease === 'type2_diabetes') {
        warnings.push(`Untreated Diabetes (Glucose rising +12 mg/dL/week)`);
        if (primaryValue > 220) {
          dangerScore += 1;
          warnings.push("High risk of Diabetic Ketoacidosis!");
        }
      } else if (disease === 'hypertension') {
        warnings.push(`Untreated Hypertension (BP rising +6 mmHg/week)`);
        if (primaryValue > 170) {
          dangerScore += 1;
          warnings.push("Severe Stroke or Heart Attack warning!");
        }
      } else {
        warnings.push(`Untreated Cancer (Tumor growing +0.8 cm/week)`);
        if (primaryValue > 8.0) {
          dangerScore += 2;
          warnings.push("Critical metastatic expansion risk!");
        }
      }
    } else {
      if (disease === 'type2_diabetes') {
        if (primaryValue > 250) {
          dangerScore += 2;
          warnings.push("Severely High Blood Sugar");
        }
        if (primaryValue < 80) {
          dangerScore += 1;
          warnings.push("Low Blood Sugar (Hypoglycemia risk)");
        }
      } else if (disease === 'hypertension') {
        if (primaryValue > 180) {
          dangerScore += 2;
          warnings.push("Hypertensive Crisis!");
        }
      } else {
        if (primaryValue > 10) {
          dangerScore += 2;
          warnings.push("Rapid Tumor Growth");
        }
      }
    }

    if (comorbidities.kidney_disease && dosage > 1.5) {
      dangerScore += 1;
      warnings.push("Renal Stress Alert");
    }

    let dangerLevel = "Safe";
    let dangerColor = "#10b981";
    if (dangerScore >= 3) {
      dangerLevel = "Critical Danger";
      dangerColor = "#ef4444";
    } else if (dangerScore >= 1) {
      dangerLevel = "Caution / Warning";
      dangerColor = "#f59e0b";
    }

    // Progress State
    let progress = "Stable";
    if (disease === 'nsclc') {
      progress = primaryValue < 3.0 ? "Tumor Shrinking" : "Tumor Growth";
    } else {
      const reductionPercent = (activeDrug.baseMetric - primaryValue) / activeDrug.baseMetric;
      progress = reductionPercent > 0.25 ? "Condition Improving" : (reductionPercent > 0.05 ? "Condition Controlled" : "Sub-optimal Control");
    }

    return {
      heartRate: Math.round(hr),
      primaryValue: parseFloat(primaryValue.toFixed(1)),
      dangerLevel,
      dangerColor,
      progress,
      warnings: warnings.length > 0 ? warnings : ["No active alerts. Patient responding normally."],
    };
  }, [disease, age, weight, comorbidities, compA, compB, compC, dosage, activeDrug, week]);


  const containerRef = React.useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const width = container.clientWidth || 180;
    const height = container.clientHeight || 180;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 110);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(1, 1, 1).normalize();
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.6);
    dirLight2.position.set(-1, -1, 1).normalize();
    scene.add(dirLight2);

    let model = null;
    const loader = new FBXLoader();
    
    loader.load('/muschelman.fbx', (object) => {
      model = object;
      
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 55 / maxDim;
      object.scale.set(scale, scale, scale);
      
      const center = box.getCenter(new THREE.Vector3());
      object.position.x = -center.x * scale;
      object.position.y = -center.y * scale - 12;
      object.position.z = -center.z * scale;
      
      object.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhongMaterial({
            color: 0x475569,
            emissive: 0x1e1e2f,
            specular: 0x111111,
            shininess: 30,
            transparent: true,
            opacity: 0.85,
            wireframe: false
          });
        }
      });
      
      scene.add(object);
    }, undefined, (err) => {
      console.error("Error loading FBX model:", err);
    });

    let animationFrameId = null;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      
      if (model) {
        model.rotation.y = elapsedTime * 0.4;
        
        const color = new THREE.Color(currentStatus.dangerColor);
        const pulse = 1.0 + Math.sin(elapsedTime * (currentStatus.dangerLevel === 'Critical Danger' ? 8.0 : 3.0)) * 0.35;
        
        model.traverse((child) => {
          if (child.isMesh) {
            child.material.emissive.copy(color).multiplyScalar(0.25 * pulse);
            if (currentStatus.dangerLevel === 'Critical Danger') {
              child.material.wireframe = true;
              child.material.opacity = 0.55;
            } else {
              child.material.wireframe = false;
              child.material.opacity = 0.85;
            }
          }
        });
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, [currentStatus]);

  // Auto-normalize composition sliders
  const adjustComp = (val, target) => {
    if (target === 'a') {
      const remaining = 1.0 - val;
      const sumOthers = compB + compC || 1;
      setCompA(val);
      setCompB((compB / sumOthers) * remaining);
      setCompC((compC / sumOthers) * remaining);
    } else if (target === 'b') {
      const remaining = 1.0 - val;
      const sumOthers = compA + compC || 1;
      setCompB(val);
      setCompA((compA / sumOthers) * remaining);
      setCompC((compC / sumOthers) * remaining);
    } else {
      const remaining = 1.0 - val;
      const sumOthers = compA + compB || 1;
      setCompC(val);
      setCompA((compA / sumOthers) * remaining);
      setCompB((compB / sumOthers) * remaining);
    }
  };



  // Reset simulation when disease changes
  useEffect(() => {
    setWeek(0);
    setTimeline([{
      week: 0,
      heartRate: 72,
      primaryValue: activeDrug.baseMetric,
    }]);
  }, [disease, activeDrug]);

  // Run next step
  const handleStep = () => {
    const nextWeek = week + 1;
    setWeek(nextWeek);
    setTimeline([
      ...timeline,
      {
        week: nextWeek,
        heartRate: currentStatus.heartRate,
        primaryValue: currentStatus.primaryValue,
      }
    ]);
  };

  const handleReset = () => {
    setWeek(0);
    setTimeline([{
      week: 0,
      heartRate: 72,
      primaryValue: activeDrug.baseMetric,
    }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Patient Physiology Simulator</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Simplified patient testing view. Change demographics and drug composition to see live organ impacts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            style={{
              padding: '10px 16px', borderRadius: 10, background: '#0f111a',
              border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc',
              fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
          >
            <option value="type2_diabetes" style={{ background: '#0f111a', color: '#f8fafc' }}>Type 2 Diabetes</option>
            <option value="hypertension" style={{ background: '#0f111a', color: '#f8fafc' }}>Hypertension</option>
            <option value="nsclc" style={{ background: '#0f111a', color: '#f8fafc' }}>Lung Cancer (NSCLC)</option>
          </select>
          <button
            onClick={handleReset}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)', color: '#94a3b8',
              fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 1.5fr', gap: 16, flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Configuration Controls */}
        <div className="liquid-glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          
          {/* Patient Details */}
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
              1. Patient Configuration
            </h3>
            
            {/* Age */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                <span>Age</span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{age} years old</span>
              </div>
              <input
                type="range" min="10" max="90" value={age}
                onChange={(e) => setAge(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Weight */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                <span>Weight</span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{weight} kg</span>
              </div>
              <input
                type="range" min="40" max="150" value={weight}
                onChange={(e) => setWeight(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Comorbidities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Medical Conditions</span>
              {[
                { id: 'obesity', label: 'Obesity' },
                { id: 'kidney_disease', label: 'Kidney Disease' },
                { id: 'high_blood_pressure', label: 'High Blood Pressure' },
              ].map((cond) => (
                <label key={cond.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={comorbidities[cond.id]}
                    onChange={(e) => setComorbidities({ ...comorbidities, [cond.id]: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  {cond.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>
              2. Custom Cure Composition
            </h3>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
              Adjust active ratios (Total must equal 100%)
            </div>

            {/* Component A */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
                <span>{activeDrug.a.name}</span>
                <span style={{ fontWeight: 700, color: '#3b82f6' }}>{(compA * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01" value={compA}
                onChange={(e) => adjustComp(parseFloat(e.target.value), 'a')}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Component B */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
                <span>{activeDrug.b.name}</span>
                <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{(compB * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01" value={compB}
                onChange={(e) => adjustComp(parseFloat(e.target.value), 'b')}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Component C */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
                <span>{activeDrug.c.name}</span>
                <span style={{ fontWeight: 700, color: '#ec4899' }}>{(compC * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01" value={compC}
                onChange={(e) => adjustComp(parseFloat(e.target.value), 'c')}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Dosage Slider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                <span>Total Dosage Level</span>
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{dosage.toFixed(2)}x</span>
              </div>
              <input
                type="range" min="0.2" max="2.5" step="0.05" value={dosage}
                onChange={(e) => setDosage(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Center Column: Organ / Physiological Vitals Map */}
        <div className="liquid-glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 1 }}>
            Physiological Body Scan
          </h3>

          {/* Simple Body Scan Graphic */}
          <div
            ref={containerRef}
            style={{
              height: 180, borderRadius: 12, background: 'rgba(0,0,0,0.25)',
              position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {/* Visual Pulse Wave overlay */}
            <div style={{ position: 'absolute', bottom: 10, left: 20, fontSize: 10, color: '#475569', fontFamily: 'monospace', zIndex: 10 }}>
              PULSE: {currentStatus.heartRate} BPM
            </div>
            {/* 3D Model Marker indicator */}
            <div style={{ position: 'absolute', top: 10, right: 15, fontSize: 8, color: '#64748b', letterSpacing: 1, zIndex: 10 }}>
              3D MUSCHELMAN ACTIVE
            </div>
          </div>

          {/* Vitals Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Safety Status</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: currentStatus.dangerColor, marginTop: 4 }}>
                {currentStatus.dangerLevel}
              </div>
            </div>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Efficacy / Progress</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#3b82f6', marginTop: 4 }}>
                {currentStatus.progress}
              </div>
            </div>
          </div>

          {/* Current Numbers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#94a3b8' }}>Heart Rate:</span>
              <span style={{ fontWeight: 800 }}>{currentStatus.heartRate} bpm</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#94a3b8' }}>{activeDrug.metricName}:</span>
              <span style={{ fontWeight: 800, color: '#10b981' }}>{currentStatus.primaryValue} {activeDrug.metricUnit}</span>
            </div>
          </div>

          {/* Warnings List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Diagnostics & Alerts</span>
            <div style={{
              flex: 1, padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.15)',
              fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: 6
            }}>
              {currentStatus.warnings.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: currentStatus.dangerColor }}>•</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Step */}
          <button
            onClick={handleStep}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 0 12px rgba(59,130,246,0.3)'
            }}
          >
            Advance Week ({week}) <ArrowRight size={14} />
          </button>
        </div>

        {/* Right Column: Dynamic Timeline charts */}
        <div className="liquid-glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: 1 }}>
            Patient Response Trajectory
          </h3>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            {/* Vital Rate Plot */}
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{activeDrug.metricName} OVER TIME</div>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="week" stroke="#334155" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#334155" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Line type="monotone" dataKey="primaryValue" stroke="#10b981" strokeWidth={2.5} name={activeDrug.metricName} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Heart Rate Plot */}
            <div style={{ flex: 1, position: 'relative', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>HEART RATE RESPONSE</div>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="week" stroke="#334155" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#334155" tick={{ fontSize: 10 }} domain={[60, 140]} />
                  <Tooltip contentStyle={{ background: '#0f111a', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Line type="monotone" dataKey="heartRate" stroke="#ec4899" strokeWidth={2} name="Heart Rate (BPM)" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
