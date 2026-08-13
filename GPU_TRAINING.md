# GPU Training Quick Start

## Step 1: Check Your GPU
```powershell
python check_gpu.py
```

This will show:
- ✓ GPU name and VRAM
- ✓ Recommended config
- ✓ Expected speed

## Step 2: Train with GPU (Choose Based on Your VRAM)

### Option A: GPU with 24GB+ (RTX 4090, A100, etc)
**Fastest training** - Use full precision:
```powershell
python training/train_grpo.py --config training/configs/grpo_medium.yaml
```
**Expected time:** 5-10 minutes for 100 steps

---

### Option B: GPU with 16-24GB (RTX 4070 Ti, A40, etc)
**Very fast** - Use 4-bit quantization:
```powershell
python training/train_grpo.py --config training/configs/grpo_medium.yaml
```
**Expected time:** 8-15 minutes for 100 steps

---

### Option C: GPU with 8-16GB (RTX 4070, RTX 3090, A10, etc)
**Fast** - Optimized 4-bit config:
```powershell
python training/train_grpo.py --config training/configs/grpo_gpu_8gb.yaml
```
**Expected time:** 15-25 minutes for 100 steps

---

### Option D: GPU with 4-8GB (RTX 3060, RTX 4060, etc)
**Slow** - Use smaller model or lightweight trainer

**Try lightweight (CPU) first:**
```powershell
python training/train_grpo.py --config training/configs/grpo_fast.yaml
```
**Expected time:** 2-5 minutes (CPU fallback)

---

### Option E: No GPU (CPU Only)
**Very slow** - But works:
```powershell
python training/train_grpo.py --config training/configs/grpo_fast.yaml
```
**Expected time:** 10-20 minutes (lighter config)

---

## Step 3: Monitor Training

Look for these messages:
```
[model] CUDA available: True
[model] GPU: NVIDIA RTX 4090
[model] GPU has sufficient memory, using 4-bit quantization...
[model] ✓ Loaded with 4-bit quantization (2.5GB)
```

Then training should start with:
```
[checkpoint] step=5 mean_reward=0.2314 path=...
[checkpoint] step=10 mean_reward=0.3156 path=...
```

---

## Troubleshooting

**Problem:** "CUDA not available" even though you have GPU
```powershell
# Reinstall PyTorch with CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Problem:** "Out of memory" error
- Use smaller config: `grpo_gpu_8gb.yaml`
- Reduce batch size in config: `batch_size: 2`
- Use lightweight trainer instead

**Problem:** Training is still slow
- Your GPU might not support CUDA (Intel Arc, older AMD)
- Use the lightweight trainer which doesn't need CUDA

---

## Speed Comparison

| Setup | Training Time (100 steps) | Speed |
|-------|---------------------------|-------|
| CPU (float32) | 10-20 min | 🐢 Slow |
| GPU 8GB (4-bit) | 15-25 min | 🐇 Fast |
| GPU 16GB (4-bit) | 8-15 min | 🚀 Very Fast |
| GPU 24GB (full) | 5-10 min | ⚡ Fastest |

---

## Next Steps

1. Run `python check_gpu.py` to detect your GPU
2. Pick the right config from above
3. Run training
4. Monitor progress in the terminal
5. Check artifacts/policy/ for saved checkpoints
