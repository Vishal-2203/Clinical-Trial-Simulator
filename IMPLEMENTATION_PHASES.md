# Clinical Trial Simulator - Phasewise Implementation Plan

This document breaks down the Clinical Trial Simulator project into logical implementation phases, reflecting the work that has been completed.

---

## Phase 1: Core Environment Foundation (Weeks 1-4)

### Objectives
- Build the basic trial state machine and step logic
- Implement fundamental trial configuration system
- Create core data models and enums

### Deliverables

#### 1.1 Trial State & Configuration
- `src/cts/config.py` - Trial configuration dataclass
  - Disease type selection
  - Enrollment caps
  - Budget constraints
  - Stage definitions (stage1, stage2, stage3)
- `src/cts/environment/models.py` - Core RL models
  - `TrialState` - immutable state representation
  - `Observation` - agent observation space
  - `Action` / `ActionType` - action space (recruit, adjust_dose, etc.)
  - `StepResult` - environment step return type
- `tests/test_env.py` - baseline environment tests

#### 1.2 Trial Environment Skeleton
- `src/cts/environment/trial_env.py` - TrialEnv class
  - `reset()` - initialize trial to week 0
  - `step(action)` - advance one week
  - `_to_observation()` - convert state to observation
  - State validation & bounds checking

#### 1.3 Configuration Management
- `config.py` - default configurations for different diseases
- Stage-based trial flow (stage1 → stage2 → stage3 progression)
- Environment variables/YAML support

### Success Criteria
- Environment can reset and take 100+ consecutive actions without crashes
- State remains valid (week monotonically increases, budget non-negative)
- All 10 action types are recognized and produce state changes

---

## Phase 2: Pharmacokinetics (PK) & Pharmacodynamics (PD) Layer (Weeks 5-8)

### Objectives
- Simulate realistic drug absorption and distribution
- Model dose-response relationships
- Integrate patient population heterogeneity

### Deliverables

#### 2.1 Two-Compartment PK Model
- `src/cts/pk/__init__.py` - PK engine
  - `TwoCompartmentPK` class
  - `PKParameters` dataclass (absorption, distribution, elimination rates)
  - State update: concentration(dose, previous_conc, time_elapsed)
  - Multi-patient support

#### 2.2 Pharmacogenomics
- CYP2D6 & CYP3A4 polymorphism effects
- Poor metabolizer (1.8× AUC), intermediate, extensive metabolizer
- Allele frequency distributions per population

#### 2.3 PD Model
- Hill equation for dose-response
- Efficacy curve (S-shaped, concentration-dependent)
- Toxicity threshold modeling
- Control arm background efficacy

#### 2.4 Tests
- `tests/test_pk.py`
  - PK steady state convergence
  - Dose linearity
  - Metabolizer phenotype stratification

### Success Criteria
- Central compartment concentration correctly reaches steady state (6 weeks for example drug)
- Dose adjustment causes measurable biomarker change (within 1-2 weeks)
- Control arm efficacy remains stable; treatment arm shows dose-dependent improvement

---

## Phase 3: Patient & Site Management (Weeks 9-12)

### Objectives
- Simulate realistic multi-site patient recruitment
- Model patient heterogeneity and dropout dynamics
- Track per-patient biomarker trajectories

### Deliverables

#### 3.1 Patient Generator
- `src/cts/patient/generator.py`
  - Synthetic patient generation with realistic distributions
  - Age, weight, comorbidity, baseline biomarker sampling
  - CYP2D6 phenotype assignment
  - Patient ID tracking

#### 3.2 Site Manager
- `src/cts/site/site_manager.py`
  - 8 global sites (US, EU, APAC distribution)
  - Site activation schedule (staggered over trial timeline)
  - Per-site recruitment rate (Poisson)
  - GCP compliance tracking

#### 3.3 Patient Dropout/Competing Risk Model
- Dropout due to:
  - Efficacy (if no improvement by week 12, some dropout)
  - Toxicity (serious AEs trigger dropout)
  - Administrative (random ~0.5% per week)
- Track patient states: screened → enrolled → active → dropout/completed

#### 3.4 Biomarker Trajectory Tracking
- Per-patient longitudinal biomarker data
- PK-driven: biomarker = f(concentration, patient_genetics)
- Noise modeling: observed_biomarker ≈ true_biomarker + noise

#### 3.5 Tests
- `tests/test_patient_simulation.py`
  - Patient cohort generation reproducibility
  - Dropout rates in expected range
  - Biomarker progression follows dose trends

### Success Criteria
- 8 sites activate sequentially; total enrollment tracks target
- Patients stratified by risk show different dropout rates
- Biomarker ↑ with dose; control arm biomarker stable

---

## Phase 4: Regulatory & Statistical Layer (Weeks 13-16)

### Objectives
- Implement FDA submission rules and stopping boundaries
- Track safety alerts and SAE reporting requirements
- Build statistical power analysis

### Deliverables

#### 4.1 Interim Analysis & Stopping Rules
- `src/cts/statistics/power_analysis.py`
  - O'Brien-Fleming alpha spending
  - Efficacy boundary (cross early → stop for superiority)
  - Futility boundary (cross → stop for lack of efficacy)
  - Safety boundary (SAE rate × patient-years → stop for harm)
  - Interim power re-estimation

#### 4.2 Serious Adverse Event (SAE) Tracking
- 7-day and 15-day SAE reporting windows (FDA requirement)
- SAE causality assessment (unrelated, related, unknown)
- Grading: mild, moderate, severe, life-threatening
- SAE-triggered protocol amendments

#### 4.3 FDA Submission & Regulatory Status
- IND filing (initial permission to start)
- Phase transitions (Phase I → EOP2 → Phase III → NDA)
- SAE reports must be filed within regulatory windows
- FDA sentiment tracking (approving, monitoring, concerned, hold)
- DSMB meeting scheduling (every 8 weeks)

#### 4.4 Milestone Tracking
- IND filed
- Phase I start/complete
- EOP2 meeting
- Phase III start/complete
- NDA filing
- Regulatory hold/termination flags

#### 4.5 Tests
- `tests/test_rewards.py`
  - SAE filing compliance detection
  - Boundary crossing logic validation
  - Power calculation accuracy

### Success Criteria
- SAE filings trigger when biomarker toxicity threshold exceeded
- O'Brien-Fleming boundary crossing stops trial at appropriate power
- Trials hitting safety boundary terminate correctly

---

## Phase 5: Supply Chain & Economics (Weeks 17-20)

### Objectives
- Model realistic drug supply constraints
- Implement budget tracking and ICER calculations
- Add economic realism to decision-making

### Deliverables

#### 5.1 Drug Supply Chain
- `src/cts/supply/drug_supply.py`
  - Queue-based supply ordering (4-week lead time)
  - FEFO (First-Expired-First-Out) batch dispensing
  - Shelf-life expiration (18-month default)
  - Stockout penalties (trial halts if no drug available)

#### 5.2 Budget & Cost Tracking
- $50M trial budget allocation
- Per-action costs:
  - Recruitment: ~$10k per patient (site + lab)
  - Supply ordering: ~$50k per order (COGS + logistics)
  - Dose adjustment: $1k (formulation change)
  - Protocol amendment: $12k (regulatory + operational)
  - DSMB meeting: $25k per meeting
  - FDA meeting: $50k per interaction

#### 5.3 Health Economics
- ICER (Incremental Cost-Effectiveness Ratio) vs. Standard of Care
- QALY (Quality-Adjusted Life Year) delta calculation
- WTP (Willingness-to-Pay) threshold ($100k/QALY typical)
- NDA approval probability as f(ICER, efficacy magnitude, safety)

#### 5.4 Tests
- `tests/test_benchmark_artifacts.py`
  - Supply order → delivery timeline validation
  - Budget consumption tracking
  - ICER calculation accuracy

### Success Criteria
- Supply stockout occurs if agent over-recruits without ordering
- Trial halts if budget exhausted
- ICER improves with training (cost per QALY ↓)

---

## Phase 6: Reward Function & Anti-Cheat Validation (Weeks 21-24)

### Objectives
- Design composite reward capturing multi-objective trial management
- Prevent reward gaming and ensure realistic agent behavior
- Implement verifiable reward breakdown

### Deliverables

#### 6.1 Composite Reward Function
- `src/cts/rewards/verifiers.py`
  - 5-component reward:
    1. **Safety** (25%): −1 per SAE, −10 per fatal AE
    2. **Efficacy** (25%): treatment_biomarker − control_biomarker
    3. **Regulatory Compliance** (20%): SAE filing on-time, milestone tracking
    4. **Budget Efficiency** (15%): (1 − spent/budget_cap)
    5. **Supply Adequacy** (10%): (0 if stockout, 1 otherwise) + power bonus
    6. **Statistical Power** (5%): (power − 0.80)

#### 6.2 Anti-Cheat Validation
- `src/cts/rewards/anti_cheat.py`
  - Verify state transitions are causal
  - Detect impossible actions (e.g., recruit beyond capacity)
  - Detect reward hacking (e.g., recruiting to boost efficacy without drug effect)
  - Log correction triggers for agent learning

#### 6.3 Reward Verification Logs
- Per-step reward component breakdown
- Cumulative reward tracking
- Fraud detection flags

#### 6.4 Tests
- `tests/test_correction.py`
  - Anti-cheat rules correctly identify violations
  - Reward function remains stable across diverse policies

### Success Criteria
- Reward function has no dominant strategy (can't max one component without trade-offs)
- Anti-cheat catches unrealistic agent behaviors
- Reward correctly reflects trial success/failure

---

## Phase 7: Specialized Agent System (Weeks 25-28)

### Objectives
- Implement 7 specialized agents that handle distinct trial aspects
- Enable agent communication and consensus-building
- Provide scaffolding for LLM-based agents

### Deliverables

#### 7.1 Chief Medical Officer (CMO) Agent
- `src/cts/agents/chief_medical_officer_agent.py`
  - Orchestrator role
  - Synthesizes input from 6 other agents
  - Makes final recruitment/dose decisions
  - Status tracking: "safe", "at_risk", "critical"

#### 7.2 DSMB (Data Safety Monitoring Board) Agent
- `src/cts/agents/dsmb_agent.py`
  - Reviews SAEs every 8 weeks
  - Recommends trial halt if safety concern
  - Efficacy interim analysis
  - Consents to dose adjustment or protocol changes

#### 7.3 Biostatistician Agent
- `src/cts/agents/biostatistician_agent.py`
  - Interim power analysis
  - Boundary crossing detection
  - Sample size re-estimation
  - Statistical significance tracking

#### 7.4 Pharmacokineticist Agent
- `src/cts/agents/pharmacokineticist_agent.py`
  - PK model management
  - Dose recommendation based on concentration
  - CYP2D6 stratification advice
  - Therapeutic drug monitoring

#### 7.5 Patient Advocate Agent
- `src/cts/agents/patient_advocate_agent.py`
  - Monitors patient burden (visit frequency)
  - Dropout risk assessment
  - Protocol complexity review
  - Recommends patient-friendly amendments

#### 7.6 Regulatory Affairs Agent
- `src/cts/agents/regulatory_affairs_agent.py`
  - FDA interaction strategy
  - SAE reporting compliance
  - Regulatory pathway guidance
  - Milestone planning

#### 7.7 Pharmacoeconomics Agent
- `src/cts/agents/pharmacoeconomics_agent.py`
  - ICER & health economics
  - Budget allocation
  - Reimbursement probability
  - Cost-efficacy trade-off analysis

#### 7.8 Agent Communication Framework
- Input aggregation from observation
- Output recommendation format (structured JSON)
- Voting/consensus logic

#### 7.9 Tests
- `tests/test_env.py` - agent system integration

### Success Criteria
- All 7 agents receive observation and return recommendation
- CMO synthesizes recommendations into trial decision
- Agent advice correlates with trial outcomes (e.g., biostat power advice matches actual power)

---

## Phase 8: Environment Composition & Curriculum (Weeks 29-32)

### Objectives
- Add multi-disease support with distinct characteristics
- Implement curriculum learning scheduling
- Handle trial composition (drug formulation variants)

### Deliverables

#### 8.1 Disease Profiles
- `src/cts/data/priors.py`
  - Disease-specific priors:
    - Background efficacy (control arm baseline)
    - Dropout rates
    - SAE incidence
    - Expected biomarker distributions
  - 3 example diseases:
    1. Hypertension (high baseline control efficacy, lower toxicity)
    2. Type 2 Diabetes (moderate baseline, GLP-1 like dynamics)
    3. Novel Pathogen Infection (low baseline efficacy, urgency-driven decisions)

#### 8.2 Composition (Drug Formulation)
- `src/cts/composition.py`
  - Drug composition as (ingredient_A, ingredient_B, ingredient_C) ratios
  - Each composition maps to distinct PK profile (absorption rate, metabolism)
  - Agent can adjust composition → new PK parameters
  - Training challenge: composition search + dose optimization

#### 8.3 Curriculum Scheduler
- `src/cts/curriculum/scheduler.py`
  - Stage 1 (easy): Single composition, stable disease
  - Stage 2 (medium): Multiple diseases, composition options
  - Stage 3 (hard): Novel pathogen scenario with fast decisions, high uncertainty
  - Progressive difficulty increase during agent training

#### 8.4 Data Integration (Optional)
- Real ChEMBL drug parameters
- OpenFDA adverse event reports
- Snapshot loading for offline testing

#### 8.5 Tests
- `tests/test_curriculum.py`
  - Curriculum transitions work correctly
  - Difficulty increases as expected

### Success Criteria
- Agent can handle multiple diseases with different dynamics
- Composition changes demonstrably affect trial outcomes
- Curriculum scheduler enables progressive training

---

## Phase 9: LLM Policy Development & Training (Weeks 33-40)

### Objectives
- Train an LLM to manage trials using GRPO (Group Relative Policy Optimization)
- Integrate TRL (Transformers Reinforcement Learning) framework
- Create reproducible training pipeline

### Deliverables

#### 9.1 Policy Interface
- `src/cts/policy_llm.py`
  - LLM-based policy class
  - Input: observation JSON → LLM prompt
  - Output: action JSON (structured)
  - Temperature/sampling control

#### 9.2 GRPO Training Script
- `training/train_grpo.py`
  - TRL GRPO trainer setup
  - Integration with TrialEnv
  - Rollout collection (multiple trial episodes per training step)
  - Reward feedback loop

#### 9.3 Training Configuration
- `training/configs/grpo_medium.yaml`
  - Model: Qwen/Qwen2.5-Coder-14B-Instruct
  - Learning rate: 2e-5
  - Batch size: 16 episodes per step
  - Training steps: 50–200
  - Hardware: 8GB GPU target (with unsloth optimization)

#### 9.4 Checkpoint Management
- Save policy checkpoint at each training step
- Load & evaluate checkpoint on held-out episodes
- Track best policy

#### 9.5 Prompt Engineering
- System prompt teaching CMO role
- Few-shot examples of good decisions
- Output format specification (JSON)

#### 9.6 Training Pipeline Script
- `scripts/run_pipeline.py`
  - Train → Evaluate → Benchmark → Save
  - Iteration support (multiple GRPO runs)
  - Fallback to heuristic policy if training fails

#### 9.7 Tests
- `tests/test_llm_training_rewards.py`
  - Reward signal propagates correctly through rollouts
  - Training improves reward over baseline
- `tests/test_llm_policy_loading.py`
  - Policy checkpoints save/load correctly

### Success Criteria
- Trained policy achieves >28% improvement over random baseline in total reward
- Trained policy learns to stop recruiting when drug concentration > MTC
- Checkpoint reproducibility: same seed → same results

---

## Phase 10: Evaluation & Benchmarking (Weeks 41-44)

### Objectives
- Compare trained policy against baselines
- Generate reproducible benchmark artifacts
- Create visualization dashboard

### Deliverables

#### 10.1 Baseline Policies
- `eval/baselines.py`
  - **Random Policy**: uniformly sample actions
  - **Heuristic Policy**: hard-coded rules
    - Recruit 4 patients/week until power > 0.85
    - Maintain drug concentration in therapeutic range
    - File SAEs on-time
    - Never exceed budget

#### 10.2 Benchmark Runner
- `eval/run_benchmark.py`
  - Run multiple episodes (e.g., 100) with each policy
  - Collect episode-level metrics:
    - Total reward (composite)
    - NDA approval probability
    - Final budget remaining
    - Safety (SAE count)
    - Efficacy (biomarker improvement)
  - Per-disease & per-stage breakdown

#### 10.3 Analytics
- `eval/analytics.py`
  - Summary statistics: mean, std, min, max reward
  - Disease-stratified performance
  - Correction trigger frequency
  - Compliance rate (SAE filing on-time)
  - Timeline visualization (weekly reward trajectory)

#### 10.4 Artifact Storage
- `artifacts/benchmark/latest.json` - full episode results
- `artifacts/benchmark/latest_summary.json` - aggregated stats
- `artifacts/benchmark/latest_timeline.json` - weekly breakdown

#### 10.5 Visualization
- `eval/plots/` - matplotlib/plotly charts
  - Reward curves (training progress)
  - Policy comparison (trained vs. heuristic vs. random)
  - Compliance & safety metrics
  - Disease-specific performance

#### 10.6 Tests
- `tests/test_benchmark_artifacts.py`
  - Benchmark artifacts load correctly
  - Metrics within expected ranges

### Success Criteria
- Trained policy outperforms both random and heuristic on reward
- Benchmark is reproducible: same seed → same results
- Charts clearly show training improvement

---

## Phase 11: Backend API (FastAPI) (Weeks 45-48)

### Objectives
- Expose simulator and trained policy via REST API
- Enable remote trial simulations
- Support frontend integration

### Deliverables

#### 11.1 FastAPI Application
- `server/openenv_api.py`
  - Flask-like FastAPI app
  - CORS middleware enabled

#### 11.2 Core Endpoints
- **POST /reset** - Start new trial
  - Input: `{seed, disease, stage}`
  - Output: observation, state
  
- **POST /step** - Execute action
  - Input: `{session_id, action_type, magnitude, composition}`
  - Output: observation, reward, terminated, info

- **GET /observation/{session_id}** - Current state

- **POST /load-policy** - Load policy checkpoint
  - Input: `{checkpoint_path}`

- **POST /get-recommendation** - Get CMO agent recommendation
  - Input: `{observation}`
  - Output: recommended action + agent breakdown

- **GET /benchmark** - Retrieve latest benchmark results

- **GET /analytics** - Get performance analytics

#### 11.3 Session Management
- In-memory session store (trial state)
- Session ID generation (UUID)
- Timeout handling

#### 11.4 Static File Serving
- Serve built React frontend from `/static/`

#### 11.5 Docker Support
- `Dockerfile` - containerized API
- HuggingFace Spaces integration
- Port 8000 exposure

#### 11.6 Tests
- Integration tests for core endpoints
- Policy loading validation
- Error handling (invalid action, out-of-bounds parameters)

### Success Criteria
- API starts without errors: `uvicorn server.openenv_api:app --reload`
- `/docs` endpoint shows Swagger UI
- All endpoints return valid JSON
- Frontend can connect and call endpoints

---

## Phase 12: Frontend (React + Vite) (Weeks 49-52)

### Objectives
- Build responsive web UI for trial simulation
- Real-time visualization of trial progression
- Interactive policy comparison and analysis

### Deliverables

#### 12.1 Project Setup
- `frontend/package.json` - Node dependencies
- `frontend/vite.config.js` - Vite bundler config
- `frontend/tsconfig.json` - TypeScript settings

#### 12.2 Core Components
- **Dashboard** (`src/Dashboard.jsx`)
  - Trial week display
  - Current observation (enrollment, biomarker, SAE count, etc.)
  - Budget tracker
  - Supply stockout warning

- **Action Panel** (`src/components/ActionPanel.jsx`)
  - Button for each action type
  - Parameter sliders (magnitude, dose adjustment, recruitment count)
  - Submit action → API call

- **Trial Progress** (`src/components/TrialProgress.jsx`)
  - Charts:
    - Enrollment over time
    - Biomarker improvement (treatment vs. control)
    - Budget consumption
    - SAE timeline
  - Built with Recharts

- **Agent Recommendation** (`src/components/AgentRecommendation.jsx`)
  - Display CMO recommendation
  - Agent breakdown (DSMB, biostat, etc.)
  - Confidence scores

- **Landing Page** (`src/LandingPage.jsx`)
  - Project overview
  - Link to simulator
  - Link to novel pathogen DTI analyzer (if implemented)

#### 12.3 State Management
- `src/store.js` - Zustand store
  - Current trial state
  - Session ID
  - Trial history (for charts)
  - Policy selection (trained, random, heuristic)

#### 12.4 API Client
- `src/api.js` - Axios wrapper
  - `/reset` call
  - `/step` call
  - `/benchmark` call
  - Error handling

#### 12.5 Styling
- `src/index.css` - Tailwind or vanilla CSS
- Responsive grid layout
- Dark/light mode (optional)

#### 12.6 Build & Deploy
- `npm run dev` - development server (Vite)
- `npm run build` - production build to `/dist/`
- Static hosting on Vercel / HuggingFace Spaces

#### 12.7 Tests
- Component rendering tests (React Testing Library)
- API integration tests
- E2E tests (Playwright or Cypress)

### Success Criteria
- Frontend builds without errors: `npm run build`
- UI loads at `http://localhost:5173/`
- Can reset trial and step through actions
- Charts update in real-time
- Mobile responsive

---

## Phase 13: Novel Pathogen DTI Predictor (Weeks 53-56)

### Objectives
- Train drug-target interaction (DTI) model for novel pathogen prediction
- Integrate into simulator and frontend
- Provide mechanism-of-action explanations

### Deliverables

#### 13.1 Data Pipeline
- `scripts/build_dti_dataset.py`
  - Query ChEMBL database
  - Fetch protein sequences (FASTA) for pathogen targets
  - Collect drug-protein pairs with efficacy/toxicity labels

#### 13.2 Encoders
- `src/cts/dti/encoders.py`
  - Drug Encoder:
    - SMILES → RDKit fingerprints
    - Chemical descriptors (MW, LogP, HBD/HBA)
  - Protein Encoder:
    - FASTA → k-mer features (or ESM embeddings)
    - Target family embedding
  - Concatenated representations

#### 13.3 DTI Model
- `src/cts/dti/model.py`
  - Simple MLP classifier/regressor
  - Input: drug_embedding + protein_embedding
  - Output:
    - Efficacy score (0–1)
    - Toxicity class (low, medium, high)
    - Confidence interval
  - Training with PyTorch

#### 13.4 Trainer
- `src/cts/dti/trainer.py`
  - Train on labeled DTI dataset
  - Save checkpoint to `artifacts/dti/dti_model.pt`
  - Log training stats

#### 13.5 Predictor
- `src/cts/dti/predictor.py`
  - Load checkpoint
  - Predict efficacy/toxicity for new drug-protein pairs
  - Return structured output (efficacy, toxicity, mechanism, recommendation)

#### 13.6 Backend Integration
- New endpoint: **POST /dti/analyze**
  - Input: drug SMILES, protein FASTA
  - Output: efficacy, toxicity, recommendation

- New endpoint: **GET /dti/model-status**
  - Model version, training timestamp, accuracy metrics

- New endpoint: **POST /dti/drug-lookup**
  - ChEMBL drug name → SMILES

#### 13.7 Frontend Integration
- New tab/page: "Novel Pathogen Analyzer"
  - Input form: drug name/SMILES, pathogen target
  - Results display:
    - Efficacy bar chart
    - Toxicity probability
    - Mechanism summary
    - Recommendation (safe to test, caution, avoid)
  - Integration with trial simulator (optional: use DTI output to inform composition)

#### 13.8 Tests
- `tests/test_dti_*.py`
  - Encoder validation
  - Model inference
  - API endpoints

### Success Criteria
- DTI model trains on ChEMBL data and converges
- Predictor returns confidence intervals
- Frontend displays novel pathogen analyzer
- Mechanism output is interpretable

---

## Phase 14: Integration & Polish (Weeks 57-60)

### Objectives
- End-to-end testing of all components
- Documentation and deployment
- Performance optimization

### Deliverables

#### 14.1 End-to-End Testing
- `tests/test_training_eval_rollout.py`
  - Full pipeline: train → benchmark → save → load
  - Reproducibility check (same seed gives same results)

#### 14.2 Documentation
- README updates (completed ✓)
- API documentation (auto-generated by FastAPI /docs)
- Deployment guide (Docker, HuggingFace Spaces)
- Tutorial notebook: `notebooks/clinical_trial_grpo_training.ipynb`

#### 14.3 Performance Optimization
- Model quantization (if LLM policy is too slow)
- Caching of frequently accessed data (disease profiles, benchmarks)
- API response time < 1s for step calls

#### 14.4 Deployment
- Docker image build & push
- HuggingFace Spaces integration (already live)
- Vercel/Netlify frontend deployment

#### 14.5 Monitoring & Logging
- Structured logging (JSON format)
- Error tracking (Sentry optional)
- Performance metrics (API response times, model inference latency)

#### 14.6 CI/CD Pipeline
- GitHub Actions for:
  - Run pytest on PR
  - Build Docker image
  - Deploy to HuggingFace Spaces on main branch merge

### Success Criteria
- All tests pass: `pytest -q`
- Entire pipeline runs end-to-end in < 1 hour
- Docker image builds successfully
- Deployed app is live and responsive

---

## Phase 15: Advanced Features & Research Extensions (Weeks 61+)

### Objectives
- Add research-grade features
- Enable novel research directions
- Publish findings

### Deliverables

#### 15.1 Adaptive Randomization
- Shift allocation ratio toward treatment arm if efficacy is strong
- Update in real-time during trial
- Cost/benefit trade-off

#### 15.2 Complex Agent Architectures
- Multi-LLM ensembles
- Agent fine-tuning on curriculum
- Communication protocols between agents

#### 15.3 External Data Integration
- Real FDA adverse event database queries
- PubMed literature mining
- Live ChEMBL updates

#### 15.4 Advanced Metrics
- Shapley value attribution (which actions had highest impact)
- Causal inference on policy decisions
- Counterfactual analysis

#### 15.5 Interactive Notebooks
- Jupyter notebooks for exploratory analysis
- Tutorial on training custom policies
- Hyperparameter tuning guide

#### 15.6 Research Papers
- Publish methodology & results
- Benchmark comparisons with other RL environments
- Case studies on specific diseases

### Success Criteria
- ≥1 research paper submitted
- External researchers can reproduce results
- Code and data available on GitHub/OSF

---

## Cross-Cutting Concerns (Throughout All Phases)

### Testing Strategy
- Unit tests (individual functions)
- Integration tests (module interactions)
- End-to-end tests (full pipeline)
- Property-based tests (reward validation)
- Target: >80% code coverage

### Code Quality
- Type hints (Python 3.11+)
- Docstrings (Google style)
- Linting: `pylint`, `black`
- Pre-commit hooks

### Documentation
- Inline comments for complex logic
- Docstring examples
- Design decision ADRs (Architecture Decision Records)
- API documentation

### Version Control
- Semantic versioning (v0.1.0 → v1.0.0)
- Changelog updates
- Release notes

---

## Summary: Timeline & Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (PK/PD)
    ↓
Phase 3 (Patient/Site) ─┬─ Phase 4 (Regulatory)
    ↓                   └─→ Phase 5 (Supply/Economics)
    ↓
Phase 6 (Rewards & Anti-Cheat)
    ↓
Phase 7 (Agent System)
    ↓
Phase 8 (Curriculum)
    ↓
Phase 9 (LLM Training) ─→ Phase 10 (Benchmarking)
    ↓                         ↓
Phase 11 (API) ←─────────────┘
    ↓
Phase 12 (Frontend) ─→ Phase 13 (DTI)
    ↓
Phase 14 (Integration & Polish)
    ↓
Phase 15 (Research Extensions)
```

**Total Estimated Effort**: 15–20 weeks full-time development (4–5 person-months)

---

## Key Success Metrics

1. **Environment Correctness**: State consistency, reproducibility
2. **Agent Learning**: Trained policy beats baselines by >25%
3. **Complexity Handled**: Environment supports 3+ diseases, 50+ decision points/trial
4. **Deployment**: Live on HuggingFace Spaces + accessible API
5. **Usability**: Frontend intuitive; non-experts can run simulations
6. **Research Impact**: Publishable findings or open-source adoption

---

## Notes

- **Parallelization**: Phases 4 and 5 can run in parallel after Phase 3
- **Iteration**: Some phases (especially 9–10) will have multiple iterations
- **Feedback Loops**: Phase 10 results may drive redesign of Phase 6–8 components
- **Agile Cadence**: 2–4 week sprints per phase for iteration and feedback

