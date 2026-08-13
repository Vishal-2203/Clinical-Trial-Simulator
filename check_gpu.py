#!/usr/bin/env python3
"""Check GPU availability and memory."""
"""GPU Detection Utility - Updated 2026-08-13"""
import torch
import sys

print("=" * 60)
print("GPU DETECTION")
print("=" * 60)

print(f"\nPyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"Number of GPUs: {torch.cuda.device_count()}")
    
    for i in range(torch.cuda.device_count()):
        print(f"\n--- GPU {i} ---")
        props = torch.cuda.get_device_properties(i)
        print(f"Name: {props.name}")
        total_memory_gb = props.total_memory / 1e9
        print(f"Total Memory: {total_memory_gb:.1f}GB")
        
        # Get free memory
        free_memory_gb = torch.cuda.mem_get_info(i)[0] / 1e9
        used_memory_gb = total_memory_gb - free_memory_gb
        print(f"Free Memory: {free_memory_gb:.1f}GB")
        print(f"Used Memory: {used_memory_gb:.1f}GB")
        
        # Recommendations
        print(f"\n✓ Recommended config:")
        if total_memory_gb >= 24:
            print("  - 14B model with full precision (fastest)")
            print("  - Config: grpo_medium.yaml (uses 4-bit already)")
        elif total_memory_gb >= 16:
            print("  - 14B model with 4-bit quantization")
            print("  - Config: grpo_medium.yaml")
        elif total_memory_gb >= 8:
            print("  - 14B model with 4-bit quantization")
            print("  - Config: grpo_gpu_8gb.yaml (optimized for 8GB)")
        elif total_memory_gb >= 4:
            print("  - 7B model recommended")
            print("  - Or use CPU with lightweight trainer")
        else:
            print("  - GPU too small, use CPU with lightweight trainer")
else:
    print("\n❌ NO GPU DETECTED - Using CPU (very slow)")
    print("\nTo fix:")
    print("1. Ensure NVIDIA GPU is available")
    print("2. Install CUDA toolkit")
    print("3. Install cuDNN")
    print("4. Reinstall PyTorch with CUDA support:")
    print("   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")

print("\n" + "=" * 60)
