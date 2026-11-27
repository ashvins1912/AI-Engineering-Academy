import { bVal, nVal, type RoadmapTrack } from './mlRoadmap2026Types'

export const mlRoadmapTracksPart2: RoadmapTrack[] = [
  // =========================================================================
  // TRACK 09 — DEEP LEARNING FRAMEWORKS (6 TOPICS)
  // =========================================================================
  {
    id: 'ml26-09-frameworks',
    number: 9,
    phase: 'deep-vision-nlp',
    phaseLabel: 'DL / CV / NLP',
    title: 'Deep Learning Frameworks',
    summary: 'Master PyTorch, TensorFlow, Keras, JAX, Hugging Face, and ONNX for research-to-production portability.',
    architectAuditNote: 'Frameworks are compiler + autodiff runtimes: choose PyTorch for research & LLM ecosystem velocity, JAX/XLA for TPU & functional SPMD scaling, and ONNX/TensorRT for low-latency cross-runtime serving.',
    topics: [
      {
        id: 't09-pytorch',
        title: 'PyTorch: Deep learning framework',
        explanation: 'Dynamic eager-mode tensor & autograd library with `torch.compile` graph capture—the dominant standard across frontier AI labs and production LLM stacks.',
        analogy: 'A live sculpting studio where you can inspect every clay curve immediately, then fire it in a compiler kiln (`torch.compile`) for production speed.',
        technicalDetail: 'PyTorch builds dynamic DAGs via Tape-based Reverse-Mode Autodiff; `torch.compile(model)` lowers Python bytecode through TorchDynamo + Inductor into fused Triton GPU kernels.',
        productionPitfall: 'Forgetting `optimizer.zero_grad(set_to_none=True)` accumulates gradients across steps; forgetting `model.eval()` + `torch.inference_mode()` leaves Dropout active and wastes VRAM.',
        pythonSnippet: `import torch, torch.nn as nn\nmodel = torch.compile(nn.Sequential(nn.Linear(64, 128), nn.GELU(), nn.Linear(128, 2)))\nwith torch.inference_mode():\n    logits = model(torch.randn(8, 64))`
      },
      {
        id: 't09-tensorflow',
        title: 'TensorFlow: Machine learning platform',
        explanation: 'End-to-end production ML ecosystem featuring `tf.function` XLA graph compilation, TFX pipelines, TensorFlow Serving, and LiteRT (TFLite) edge runtimes.',
        analogy: 'An industrial assembly factory with built-in conveyors, quality scanners, and mobile shipping crates.',
        technicalDetail: '`@tf.function` traces Python operations into static `SavedModel` protobuf graphs that execute in C++ without Python GIL overhead, ideal for multi-tenant serving and mobile.',
        productionPitfall: 'Passing changing Python scalars or varying tensor shapes into `@tf.function` triggers expensive graph retracing on every call—always declare explicit `input_signature`.',
        pythonSnippet: `import tensorflow as tf\n@tf.function(input_signature=[tf.TensorSpec([None, 32], tf.float32)])\ndef forward_step(x):\n    return tf.nn.relu(x * 2.0)`
      },
      {
        id: 't09-keras',
        title: 'Keras: High-level deep learning API',
        explanation: 'Clean, multi-backend neural API (Keras 3 runs seamlessly over PyTorch, JAX, or TensorFlow) designed for rapid prototyping and standardized `fit`/`evaluate` workflows.',
        analogy: 'A universal architectural cockpit whose controls can pilot three different jet engines underneath.',
        technicalDetail: 'Supports Sequential, Functional (DAGs with skip connections), and Subclassed models; `KERAS_BACKEND=jax` compiles the exact same model via XLA.',
        productionPitfall: 'Relying only on `model.fit()` without custom callbacks, mixed precision (`mixed_float16`), or gradient clipping hides training instability on complex tasks.',
        pythonSnippet: `import keras\ninputs = keras.Input(shape=(64,))\nx = keras.layers.Dense(128, activation="gelu")(inputs)\noutputs = keras.layers.Dense(10, activation="softmax")(x)\nmodel = keras.Model(inputs, outputs)`
      },
      {
        id: 't09-jax',
        title: 'JAX: High-performance numerical computing',
        explanation: 'Pure-functional NumPy-like library with composable function transformations (`jit`, `grad`, `vmap`, `pmap`/`shard_map`) compiled via XLA for GPUs and TPUs.',
        analogy: 'A pure mathematical compiler where functions never mutate state and automatically parallelize across thousands of chips.',
        technicalDetail: 'Requires explicit PRNG key splitting (`jax.random.split`) and immutable parameter pytrees (`Flax`/`Optax`), enabling deterministic SPMD sharding at massive cluster scale.',
        productionPitfall: 'Mutating external Python lists/state inside `@jax.jit` functions causes silent side-effect bugs because JAX traces Python only once and caches the XLA kernel.',
        pythonSnippet: `import jax, jax.numpy as jnp\n@jax.jit\ndef loss_fn(w, x, y):\n    return jnp.mean((x @ w - y) ** 2)\ngrads = jax.grad(loss_fn)(jnp.zeros((4,)), jnp.ones((8, 4)), jnp.ones((8,)))`
      },
      {
        id: 't09-huggingface',
        title: 'Hugging Face: Pretrained models and machine learning tools',
        explanation: 'Open ecosystem (`transformers`, `datasets`, `accelerate`, `peft`, `safetensors`) providing standardized access to hundreds of thousands of pretrained foundation models.',
        analogy: 'GitHub + Maven Central for pretrained neural weights, tokenizers, and streaming datasets.',
        technicalDetail: 'Use `AutoTokenizer` + `AutoModelForCausalLM` with `device_map="auto"` and `safetensors` (zero-pickle memory-mapped weights) to prevent arbitrary code execution vulnerabilities.',
        productionPitfall: 'Loading models without pinning a git `revision` commit hash breaks reproducibility when upstream maintainers update weights or tokenizer configs.',
        pythonSnippet: `from transformers import AutoTokenizer, AutoModelForSequenceClassification\nrepo = "distilbert-base-uncased-finetuned-sst-2-english"\ntok = AutoTokenizer.from_pretrained(repo)\nmodel = AutoModelForSequenceClassification.from_pretrained(repo)`
      },
      {
        id: 't09-onnx',
        title: 'ONNX: Model interoperability',
        explanation: 'Open Neural Network Exchange intermediate representation that decouples training frameworks (PyTorch/TF/scikit-learn) from high-speed inference runtimes (ONNX Runtime, TensorRT, CoreML).',
        analogy: 'PDF for neural networks—author in any design tool, render blazingly fast on any device.',
        technicalDetail: 'Exports static operator graphs with operator fusion (Conv+BN+ReLU -> single kernel) and INT8/FP16 post-training quantization for 2x–6x lower CPU/GPU serving latency.',
        productionPitfall: 'Data-dependent Python `if/else` control flow inside `forward()` fails static tracing unless rewritten with `torch.where` or Dynamo export (`dynamo=True`).',
        pythonSnippet: `import torch, onnxruntime as ort\ntorch.onnx.export(model, dummy_x, "model.onnx", input_names=["x"], output_names=["y"], dynamic_axes={"x": {0: "batch"}})\nsess = ort.InferenceSession("model.onnx", providers=["CPUExecutionProvider"])`
      }
    ],
    mermaidDfd: `flowchart LR
  HF["Hugging Face Hub (safetensors)"] --> FW["PyTorch / JAX / Keras Authoring"]
  FW --> COMP["Graph Compiler (torch.compile / XLA)"]
  COMP --> ONNX["ONNX Export + Operator Fusion"]
  ONNX --> QUANT["FP16 / INT8 Quantization"]
  QUANT --> SERVE["ONNX Runtime / TensorRT Serving"]`,
    dfdNodeLabels: { HF: 'Pretrained Weights', FW: 'Framework Training', COMP: 'Compiler Fusion', ONNX: 'ONNX Graph', QUANT: 'Quantizer', SERVE: 'Fast Inference' },
    dfdSteps: [
      { step: 1, nodeId: 'HF', title: 'Pinned SafeTensors Load', description: 'Load verified pretrained weights & tokenizer pinned to an immutable commit hash.', payload: { format: 'safetensors', revision: 'a91f3c2', pickle_risk: false } },
      { step: 2, nodeId: 'COMP', title: 'Kernel Fusion Compilation', description: 'Fuse elementwise ops (MatMul + Bias + GELU) into a single GPU SRAM pass.', payload: { compiler: 'TorchInductor / XLA', memory_trips_cut: '3.4x' } },
      { step: 3, nodeId: 'ONNX', title: 'Framework-Agnostic IR Export', description: 'Freeze trained model into portable ONNX graph with dynamic batch axis.', payload: { opset: 17, dynamic_batch: true, fused_nodes: 42 } },
      { step: 4, nodeId: 'SERVE', title: 'Quantized Production Runtime', description: 'Run INT8/FP16 inference in C++ without PyTorch/Python overhead.', payload: { p99_ms: 4.8, speedup_vs_eager: '4.6x', vram_saved_pct: 62 } }
    ],
    simTitle: 'Framework Compiler, Operator Fusion & ONNX Quantization Simulator',
    simSubtitle: 'Toggle graph compilation, ONNX Runtime export, precision (FP32/FP16/INT8), and batch size to inspect latency and throughput.',
    simControls: [
      { id: 'batchSize', label: 'Inference Batch Size', type: 'slider', min: 1, max: 64, step: 1, unit: 'req', defaultValue: 16 },
      { id: 'layers', label: 'Transformer / MLP Blocks', type: 'slider', min: 4, max: 32, step: 2, unit: 'layers', defaultValue: 12 },
      { id: 'compiled', label: 'Enable Graph Compiler (torch.compile / XLA / ONNX)', type: 'toggle', defaultValue: true },
      { id: 'int8', label: 'Apply INT8 Quantization (vs FP32)', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const batch = nVal(vals.batchSize, 16)
      const layers = nVal(vals.layers, 12)
      const compiled = bVal(vals.compiled, true)
      const int8 = bVal(vals.int8, true)
      const eagerMs = Number((layers * (1.2 + batch * 0.14)).toFixed(1))
      const compileFactor = compiled ? 0.54 : 1.0
      const quantFactor = int8 ? 0.45 : 1.0
      const activeMs = Number(Math.max(1.2, eagerMs * compileFactor * quantFactor).toFixed(1))
      const qps = Math.round((batch / activeMs) * 1000)
      const vramMb = Math.round(layers * (int8 ? 18 : 72) + batch * (int8 ? 3.5 : 14))
      const speedup = Number((eagerMs / activeMs).toFixed(2))
      const health = activeMs <= 20 ? 'optimal' : activeMs <= 45 ? 'tradeoff' : 'breaking'
      return {
        health,
        headline: `${compiled ? 'Compiled + Fused' : 'Python Eager'} (${int8 ? 'INT8' : 'FP32'}): ${activeMs}ms latency (${speedup}× speedup, ${qps.toLocaleString()} req/s)`,
        explanation: compiled && int8
          ? 'Operator fusion cuts HBM memory round-trips while INT8 tensor cores quadruple arithmetic throughput and shrink weight footprint by 75%.'
          : 'Uncompiled FP32 eager execution launches separate kernels per op and is severely memory-bandwidth bound.',
        kpis: [
          { label: 'Batch Latency', value: `${activeMs} ms`, sub: `Eager FP32: ${eagerMs} ms`, status: health },
          { label: 'Throughput', value: `${qps.toLocaleString()} req/s`, sub: `Batch ${batch}`, status: qps >= 500 ? 'optimal' : 'tradeoff' },
          { label: 'Speedup Factor', value: `${speedup}×`, sub: compiled ? 'Fused kernels' : 'Unfused eager', status: speedup >= 2.5 ? 'optimal' : speedup >= 1.5 ? 'tradeoff' : 'breaking' },
          { label: 'Model VRAM', value: `${vramMb} MB`, sub: int8 ? 'INT8 weights' : 'FP32 weights', status: vramMb < 900 ? 'optimal' : 'tradeoff' }
        ],
        bars: [
          { label: 'Eager FP32 Baseline', pct: 100, display: `${eagerMs} ms`, tone: 'danger' },
          { label: 'Active Runtime Latency', pct: Math.max(5, Math.round((activeMs / eagerMs) * 100)), display: `${activeMs} ms`, tone: health === 'optimal' ? 'positive' : 'warning' },
          { label: 'Memory Footprint vs FP32', pct: int8 ? 25 : 100, display: `${vramMb} MB`, tone: int8 ? 'positive' : 'warning' }
        ]
      }
    },
    playgroundTitle: 'Live INT8 Symmetric Quantization & Dequantization Error Sandbox',
    playgroundTask: 'Quantize a float32 weight matrix to INT8 like ONNX Runtime / TensorRT and verify MSE quantization error and 4x memory savings.',
    executableCode: `// Track 09 — Symmetric Per-Tensor INT8 Quantization (ONNX / TensorRT pattern)
const fp32Weights = [-0.842, -0.315, 0.012, 0.274, 0.618, 0.955, -0.488, 0.731];
const maxAbs = Math.max(...fp32Weights.map(Math.abs));
const scale = maxAbs / 127;

const int8Weights = fp32Weights.map(w => Math.max(-127, Math.min(127, Math.round(w / scale))));
const dequantized = int8Weights.map(q => Number((q * scale).toFixed(5)));
const mse = fp32Weights.reduce((acc, w, i) => acc + (w - dequantized[i]) ** 2, 0) / fp32Weights.length;
const compressionRatio = 32 / 8;

console.log("[Quant Scale]", scale.toFixed(6));
console.log("[INT8 Tensor]", JSON.stringify(int8Weights));
console.log("[Dequantized]", JSON.stringify(dequantized));
console.log("[Quant MSE]", mse.toExponential(3), "| Compression:", compressionRatio + "x");

assert(mse < 1e-4, "INT8 symmetric quantization error stayed below 1e-4 MSE");
assert(int8Weights.every(q => q >= -127 && q <= 127), "All quantized weights fit inside signed INT8 range");
emitMetric("Quantization MSE", mse.toExponential(2), "FP32 -> INT8", "optimal");
emitMetric("Memory Savings", "75%", "4x smaller weights", "optimal");
emitArtifact("ONNX INT8 Calibration", { scale: Number(scale.toFixed(6)), int8Weights, mse: Number(mse.toExponential(3)) });`,
    pythonReference: `import onnxruntime as ort\nfrom onnxruntime.quantization import quantize_dynamic, QuantType\n\nquantize_dynamic("model_fp32.onnx", "model_int8.onnx", weight_type=QuantType.QInt8)\nsess = ort.InferenceSession("model_int8.onnx")`
  },

  // =========================================================================
  // TRACK 10 — COMPUTER VISION (10 TOPICS)
  // =========================================================================
  {
    id: 'ml26-10-cv',
    number: 10,
    phase: 'deep-vision-nlp',
    phaseLabel: 'DL / CV / NLP',
    title: 'Computer Vision',
    summary: 'Master Image Processing, Classification, Detection, Segmentation, CNNs, Transfer Learning, ViTs, OpenCV, YOLO, and Image Generation.',
    architectAuditNote: 'Computer vision is spatial hierarchy engineering: always align RGB/BGR channel order, use IoU/mAP (not accuracy) for detection, and start with pretrained backbones before training from scratch.',
    topics: [
      {
        id: 't10-imgproc',
        title: 'Image Processing',
        explanation: 'Low-level pixel operations—resizing, color-space conversion (RGB/HSV/Grayscale), histogram equalization, Gaussian denoising, and Sobel/Canny edge detection.',
        analogy: 'Cleaning smudges off a camera lens and adjusting lighting before asking a human inspector to examine the photo.',
        technicalDetail: 'Images are 3D tensors `[H, W, C]` (or `[C, H, W]` in PyTorch) normalized to `[0, 1]` or ImageNet mean/std `([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])`.',
        productionPitfall: 'Training on PIL RGB images while serving OpenCV BGR images swaps red and blue channels, silently destroying model accuracy in production.',
        pythonSnippet: `import cv2\nimg_bgr = cv2.imread("sample.jpg")\nimg_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)\nedges = cv2.Canny(cv2.GaussianBlur(img_rgb, (5, 5), 0), 80, 180)`
      },
      {
        id: 't10-classification',
        title: 'Image Classification',
        explanation: 'Assigning a single label (or multi-label tags) to an entire image by mapping global pooled visual features through a softmax/sigmoid classifier head.',
        analogy: 'Glancing at an X-ray scan and stamping the whole chart "Normal" or "Pneumonia".',
        technicalDetail: 'Evaluated with Top-1/Top-5 accuracy and calibration ECE; augmentations like RandomResizedCrop, MixUp, and RandAugment dramatically improve generalization.',
        productionPitfall: 'Shortcut learning—a classifier learns hospital watermark text or snow backgrounds instead of the actual object; verify with Grad-CAM heatmaps.',
        pythonSnippet: `import timm, torch\nmodel = timm.create_model("convnext_small.fb_in22k", pretrained=True, num_classes=5)\nprobs = torch.softmax(model(torch.randn(2, 3, 224, 224)), dim=-1)`
      },
      {
        id: 't10-detection',
        title: 'Object Detection',
        explanation: 'Localizing and classifying multiple objects in a single frame by predicting bounding boxes `(x, y, w, h)` + class scores and pruning duplicates with Non-Maximum Suppression (NMS).',
        analogy: 'Drawing labeled highlighter boxes around every pedestrian, cyclist, and traffic sign on a dashcam frame.',
        technicalDetail: 'Evaluated via `mAP@0.5` and `mAP@[0.5:0.95]` using Intersection over Union `IoU = Area(A ∩ B) / Area(A ∪ B)`.',
        productionPitfall: 'Too low an NMS IoU threshold suppresses genuinely overlapping objects in crowded scenes; too high leaves duplicate ghost boxes.',
        pythonSnippet: `from torchvision.ops import nms\nkeep_indices = nms(boxes_xyxy, scores, iou_threshold=0.45)`
      },
      {
        id: 't10-segmentation',
        title: 'Image Segmentation',
        explanation: 'Pixel-level classification: Semantic Segmentation labels every pixel by class, Instance Segmentation separates individual objects, and Panoptic combines both.',
        analogy: 'Coloring every exact pixel of each lane line and car silhouette rather than drawing rough rectangles.',
        technicalDetail: 'Architectures like U-Net, Mask2Former, and SAM (Segment Anything) use encoder-decoder skip connections and Dice + Cross-Entropy loss for crisp boundaries.',
        productionPitfall: 'Pixel accuracy looks 98% even if a tiny 2% tumor mask is completely missed—always monitor Dice Score / mIoU.',
        pythonSnippet: `def dice_loss(pred_probs, target, eps=1e-6):\n    inter = (pred_probs * target).sum(dim=(1, 2))\n    return 1.0 - (2 * inter + eps) / (pred_probs.sum(dim=(1, 2)) + target.sum(dim=(1, 2)) + eps)`
      },
      {
        id: 't10-cnn',
        title: 'Convolutional Neural Networks (CNNs)',
        explanation: 'Parameter-sharing spatial filters that slide across images to build hierarchical features: edges -> textures -> object parts -> whole objects.',
        analogy: 'A team of magnifying glasses scanning every patch of an image with the exact same visual template.',
        technicalDetail: 'Output spatial size `floor((H + 2P - K) / S) + 1`; ResNet residual skip connections `y = F(x) + x` solve vanishing gradients in deep 50–152 layer networks.',
        productionPitfall: 'Aggressive early striding/pooling destroys fine spatial detail needed for small-object detection or OCR.',
        pythonSnippet: `import torch.nn as nn\nconv_block = nn.Sequential(\n    nn.Conv2d(3, 64, kernel_size=3, stride=1, padding=1, bias=False),\n    nn.BatchNorm2d(64), nn.SiLU()\n)`
      },
      {
        id: 't10-transfer',
        title: 'Transfer Learning',
        explanation: 'Reusing visual representations pretrained on millions of images (ImageNet/LAION/DINOv2) and adapting them to a specialized domain with 100x less labeled data.',
        analogy: 'Teaching a seasoned radiologist to spot a rare new fracture in one afternoon instead of training someone from kindergarten.',
        technicalDetail: 'Stage 1: freeze backbone and train new head (high LR). Stage 2: unfreeze top blocks and fine-tune with 10x smaller LR + cosine decay.',
        productionPitfall: 'Fine-tuning an entire pretrained backbone with a high learning rate immediately wipes out useful pretrained filters (catastrophic forgetting).',
        pythonSnippet: `for p in model.parameters(): p.requires_grad = False\nfor p in model.get_classifier().parameters(): p.requires_grad = True`
      },
      {
        id: 't10-vit',
        title: 'Vision Transformers (ViTs)',
        explanation: 'Splits an image into fixed patches (e.g., 16x16), linearly embeds them as visual tokens with positional encodings, and applies global multi-head self-attention.',
        analogy: 'Cutting a painting into a mosaic of tiles and letting every tile communicate directly with every other tile across the canvas.',
        technicalDetail: 'Self-attention scales `O(N^2)` in patch count `N = (H*W)/P^2`; ViTs lack CNN translation inductive bias, so they excel when pretrained on large datasets (CLIP/SigLIP/DINOv2).',
        productionPitfall: 'Training a vanilla ViT from scratch on <50k images underperforms ConvNeXt/ResNet unless using heavy augmentation or self-supervised pretraining.',
        pythonSnippet: `import timm\nvit = timm.create_model("vit_base_patch16_224", pretrained=True, num_classes=10)`
      },
      {
        id: 't10-opencv',
        title: 'OpenCV',
        explanation: 'Battle-tested C++/Python real-time computer vision library powering camera capture, perspective warps, optical flow, contour geometry, and video pipelines.',
        analogy: 'The Swiss Army knife of real-time video streams and geometric pixel math.',
        technicalDetail: 'Handles hardware-accelerated video decoding, homography transforms (`cv2.warpPerspective`), morphological filtering, and fast resize/letterboxing before GPU inference.',
        productionPitfall: 'Running naive Python frame loops with `cv2.VideoCapture` blocks on I/O; decouple frame grabbing into a dedicated producer thread/queue.',
        pythonSnippet: `import cv2\nresized = cv2.resize(frame, (640, 640), interpolation=cv2.INTER_LINEAR)`
      },
      {
        id: 't10-yolo',
        title: 'YOLO',
        explanation: 'You Only Look Once—single-stage real-time object detector that predicts all bounding boxes and classes in one forward pass at 60–200+ FPS.',
        analogy: 'A goalkeeper reading the entire field in a single blink rather than scanning each square yard one by one.',
        technicalDetail: 'Modern YOLO (v8/v10/v11) uses anchor-free decoupled heads, FPN/PAN multi-scale feature pyramids, and CIoU + DFL losses—some variants (v10) even remove NMS.',
        productionPitfall: 'Deploying at a smaller input resolution (`320px`) than trained (`640px`) slashes recall on distant small objects unless trained with multi-scale augmentation.',
        pythonSnippet: `from ultralytics import YOLO\nmodel = YOLO("yolo11n.pt")\nresults = model.predict("street.jpg", imgsz=640, conf=0.35, iou=0.45)`
      },
      {
        id: 't10-imggen',
        title: 'Image Generation',
        explanation: 'Synthesizing photorealistic or controllable images from noise and text prompts using Latent Diffusion Models (LDMs), Flow Matching, VAEs, and DiT backbones.',
        analogy: 'A sculptor gradually chiseling coherent marble detail out of static television snow guided by a text description.',
        technicalDetail: 'A VAE compresses pixels `8x` into latent space; a U-Net or Diffusion Transformer (DiT) predicts noise/velocity across `T` denoising steps guided by Classifier-Free Guidance (CFG).',
        productionPitfall: 'Excessive CFG guidance scale (>12) causes oversaturated, burned artifacts; too few steps without a distilled/flow-matching scheduler produces blurry textures.',
        pythonSnippet: `from diffusers import AutoPipelineForText2Image\nimport torch\npipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16)\nimg = pipe("blueprint of a modern robotics lab", num_inference_steps=4, guidance_scale=0.0).images[0]`
      }
    ],
    mermaidDfd: `flowchart LR
  CAM["OpenCV Capture (BGR -> RGB)"] --> AUG["Letterbox Resize + Normalize"]
  AUG --> BACK["Pretrained CNN / ViT Backbone"]
  BACK --> HEAD["Task Head (Classify / YOLO / U-Net)"]
  HEAD --> NMS["NMS + Confidence Filter (IoU)"]
  NMS --> OUT["Boxes / Masks / Diffusion Latents"]`,
    dfdNodeLabels: { CAM: 'OpenCV Stream', AUG: 'Preprocess', BACK: 'CNN / ViT', HEAD: 'Task Head', NMS: 'IoU + NMS', OUT: 'Visual Output' },
    dfdSteps: [
      { step: 1, nodeId: 'CAM', title: 'Frame Capture & Color Fix', description: 'Convert OpenCV BGR frame to RGB float32 tensor with aspect-preserving letterbox.', payload: { resolution: '640x640', channels: 'RGB', normalized: true } },
      { step: 2, nodeId: 'BACK', title: 'Multi-Scale Feature Extraction', description: 'CNN pyramid or ViT patch attention encodes edges, parts, and global semantics.', payload: { backbone: 'ViT-B/16', patch_tokens: 196, stride_levels: [8, 16, 32] } },
      { step: 3, nodeId: 'NMS', title: 'IoU Non-Maximum Suppression', description: 'Suppress overlapping duplicate detections while preserving distinct instances.', payload: { raw_boxes: 8400, after_conf: 24, after_nms: 6, iou_thresh: 0.45 } },
      { step: 4, nodeId: 'OUT', title: 'Real-Time Vision Output', description: 'Emit verified bounding boxes, pixel masks, or denoised latent frames.', payload: { fps: 92, mAP_50_95: 0.54, latency_ms: 10.8 } }
    ],
    simTitle: 'YOLO / ViT Resolution, Patch Cost & NMS Threshold Simulator',
    simSubtitle: 'Tune input resolution, ViT patch size, and NMS IoU threshold to balance FPS, small-object recall, and duplicate suppression.',
    simControls: [
      { id: 'imgSize', label: 'Input Resolution (px)', type: 'slider', min: 224, max: 1024, step: 64, unit: 'px', defaultValue: 640 },
      { id: 'patchSize', label: 'ViT Patch Size (px)', type: 'slider', min: 8, max: 32, step: 8, unit: 'px', defaultValue: 16 },
      { id: 'nmsIou', label: 'NMS IoU Threshold (%)', type: 'slider', min: 20, max: 85, step: 5, unit: '%', defaultValue: 45 },
      { id: 'transfer', label: 'Use Pretrained Backbone (Transfer Learning)', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const sz = nVal(vals.imgSize, 640)
      const patch = nVal(vals.patchSize, 16)
      const iou = nVal(vals.nmsIou, 45)
      const transfer = bVal(vals.transfer, true)
      const tokens = Math.round((sz / patch) ** 2)
      const attnCost = Number(((tokens * tokens) / 1e6).toFixed(2))
      const fps = Math.max(4, Math.round(140 / (0.35 + (sz / 640) ** 2 * (16 / patch))))
      const smallObjRecall = Math.min(97, Math.round((transfer ? 64 : 38) + (sz / 1024) * 32 - (iou < 30 ? 12 : 0)))
      const dupRate = iou > 65 ? Math.round((iou - 60) * 1.4) : iou < 30 ? 0 : 2
      const health = !transfer || dupRate > 15 || fps < 12 ? 'breaking' : attnCost > 4 || smallObjRecall < 75 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: `${fps} FPS · ${tokens.toLocaleString()} ViT tokens · ${smallObjRecall}% small-object recall (${dupRate}% duplicate boxes)`,
        explanation: `Doubling resolution quadruples ViT patch count (N) and increases self-attention memory by 16× (O(N²)). Pretrained transfer weights boost low-data mAP dramatically.`,
        kpis: [
          { label: 'Real-Time Speed', value: `${fps} FPS`, sub: `${sz}×${sz} input`, status: fps >= 30 ? 'optimal' : fps >= 15 ? 'tradeoff' : 'breaking' },
          { label: 'ViT Patch Tokens', value: tokens.toLocaleString(), sub: `Attention ~${attnCost}M ops`, status: tokens <= 1600 ? 'optimal' : tokens <= 4096 ? 'tradeoff' : 'breaking' },
          { label: 'Small-Object Recall', value: `${smallObjRecall}%`, sub: transfer ? 'Pretrained backbone' : 'From scratch', status: smallObjRecall >= 80 ? 'optimal' : 'tradeoff' },
          { label: 'Duplicate Box Risk', value: `${dupRate}%`, sub: `NMS IoU ${(iou / 100).toFixed(2)}`, status: dupRate <= 5 ? 'optimal' : 'breaking' }
        ],
        bars: [
          { label: 'Small-Object Recall', pct: smallObjRecall, display: `${smallObjRecall}%`, tone: smallObjRecall >= 80 ? 'positive' : 'warning' },
          { label: 'Speed Headroom (vs 120 FPS)', pct: Math.min(100, Math.round((fps / 120) * 100)), display: `${fps} FPS`, tone: fps >= 30 ? 'positive' : 'danger' },
          { label: 'Duplicate Box Noise', pct: Math.min(100, dupRate * 2), display: `${dupRate}%`, tone: dupRate <= 5 ? 'positive' : 'danger' }
        ]
      }
    },
    playgroundTitle: 'Live 2D Convolution + IoU + Non-Maximum Suppression (NMS) Sandbox',
    playgroundTask: 'Compute exact bounding-box IoU and execute greedy NMS to filter duplicate YOLO predictions in real time.',
    executableCode: `// Track 10 — Exact Bounding Box IoU + Non-Maximum Suppression (YOLO Post-Processing)
function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (areaA + areaB - inter || 1);
}

const detections = [
  { id: "b1", cls: "car", score: 0.94, x1: 100, y1: 100, x2: 220, y2: 200 },
  { id: "b2", cls: "car", score: 0.86, x1: 108, y1: 106, x2: 226, y2: 204 }, // duplicate overlap
  { id: "b3", cls: "car", score: 0.72, x1: 112, y1: 104, x2: 218, y2: 198 }, // duplicate overlap
  { id: "b4", cls: "pedestrian", score: 0.91, x1: 310, y1: 120, x2: 360, y2: 260 }
];

const iouThresh = 0.45;
const sorted = [...detections].sort((a, b) => b.score - a.score);
const kept = [];
for (const cand of sorted) {
  const suppressed = kept.some(k => k.cls === cand.cls && iou(k, cand) > iouThresh);
  if (!suppressed) kept.push(cand);
}

const overlap12 = iou(detections[0], detections[1]);
console.log("[IoU b1 vs b2]", overlap12.toFixed(3));
console.log("[NMS Kept]", kept.map(k => k.id + ":" + k.cls + "(" + k.score + ")").join(", "));

assert(overlap12 > 0.75, "Overlapping car boxes have high IoU > 0.75");
assert(kept.length === 2, "NMS suppressed 2 duplicate boxes and kept 2 unique objects");
emitMetric("IoU (b1, b2)", overlap12.toFixed(3), "Threshold 0.45", "optimal");
emitMetric("Objects Kept", String(kept.length) + " / " + detections.length, "Clean NMS", "optimal");
emitArtifact("NMS Final Detections", kept);`,
    pythonReference: `import torch\nfrom torchvision.ops import nms\n\nboxes = torch.tensor([[100.,100.,220.,200.],[108.,106.,226.,204.],[310.,120.,360.,260.]])\nscores = torch.tensor([0.94, 0.86, 0.91])\nkeep = nms(boxes, scores, iou_threshold=0.45)`
  },

  // =========================================================================
  // TRACK 11 — NATURAL LANGUAGE PROCESSING (NLP) (12 TOPICS)
  // =========================================================================
  {
    id: 'ml26-11-nlp',
    number: 11,
    phase: 'deep-vision-nlp',
    phaseLabel: 'DL / CV / NLP',
    title: 'Natural Language Processing (NLP)',
    summary: 'Master Text Preprocessing, Tokenization, Stemming/Lemmatization, Embeddings, Word2Vec/GloVe, RNNs, LSTM/GRU, Attention, Transformers, Classification, Sentiment, and NER.',
    architectAuditNote: 'NLP evolved from sparse word bags -> static dense vectors -> sequential RNNs -> parallel self-attention Transformers. Match model weight to latency: TF-IDF/DistilBERT often beats a 70B LLM on narrow NER/classification.',
    topics: [
      {
        id: 't11-preprocess',
        title: 'Text Preprocessing',
        explanation: 'Normalizing raw text—Unicode NFKC cleanup, HTML stripping, whitespace collapsing, URL/PII redaction—tailored carefully to the downstream model.',
        analogy: 'Washing sand and twigs off archaeological tablets without scrubbing away the carved letters.',
        technicalDetail: 'Classical models (TF-IDF) benefit from lowercasing and punctuation removal, whereas modern Transformers rely on casing and punctuation for NER and sentiment.',
        productionPitfall: 'Removing stop words like "not" or "no" in sentiment pipelines flips "not good" into "good".',
        pythonSnippet: `import re, unicodedata\ndef clean_text(s: str) -> str:\n    s = unicodedata.normalize("NFKC", s)\n    return re.sub(r"\\s+", " ", s).strip()`
      },
      {
        id: 't11-tokenization',
        title: 'Tokenization',
        explanation: 'Segmenting text into discrete integer IDs using subword algorithms (BPE, WordPiece, SentencePiece Unigram) that balance vocabulary size with zero out-of-vocabulary failures.',
        analogy: 'Breaking rare words like "unbelievable" into familiar LEGO bricks ("un", "believ", "able").',
        technicalDetail: 'BPE iteratively merges the most frequent adjacent byte/character pairs until reaching target vocab size (e.g., 32k–128k tokens).',
        productionPitfall: 'Mismatched tokenizer versions or missing special tokens (`<BOS>`, `<EOS>`, chat templates) silently degrades model outputs.',
        pythonSnippet: `from tokenizers import Tokenizer, models, trainers, pre_tokenizers\ntok = Tokenizer(models.BPE())\ntok.pre_tokenizer = pre_tokenizers.Whitespace()`
      },
      {
        id: 't11-stem-lemma',
        title: 'Stemming and Lemmatization',
        explanation: 'Reducing inflected words to base forms: Stemming chops suffixes heuristically ("studies" -> "studi"), while Lemmatization uses vocabulary + POS tags ("better" -> "good").',
        analogy: 'Stemming uses scissors; lemmatization looks up the exact root word in a dictionary.',
        technicalDetail: 'Used mainly in classical search/BM25 and topic modeling; generally skipped before subword Transformers because subword tokens already encode morphology.',
        productionPitfall: 'Over-stemming merges distinct meanings ("universe" and "university" -> "univers"), hurting search precision.',
        pythonSnippet: `import spacy\nnlp = spacy.load("en_core_web_sm")\nlemmas = [t.lemma_ for t in nlp("The models were running faster")]`
      },
      {
        id: 't11-embeddings',
        title: 'Word Embeddings',
        explanation: 'Dense continuous vectors in `R^d` where geometric proximity (cosine similarity) reflects semantic and syntactic similarity.',
        analogy: 'Placing every word on a 3D globe where synonyms live in the same neighborhood and analogies form parallel arrows.',
        technicalDetail: 'Maps sparse one-hot IDs (`V = 50,000`) through a learned lookup table `E ∈ R^(V×d)`; modern contextual embeddings vary by surrounding sentence context.',
        productionPitfall: 'Using Euclidean distance on unnormalized embeddings conflates word frequency magnitude with semantic meaning—L2-normalize and use cosine similarity.',
        pythonSnippet: `import numpy as np\ncosine = lambda a, b: float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))`
      },
      {
        id: 't11-w2v-glove',
        title: 'Word2Vec and GloVe',
        explanation: 'Classic static embedding algorithms: Word2Vec predicts context words via Skip-Gram/CBOW with negative sampling; GloVe factorizes a global word co-occurrence log-matrix.',
        analogy: 'Learning what a word means strictly by noticing which company it keeps across millions of sentences.',
        technicalDetail: 'Captures linear relationships (`vec("king") - vec("man") + vec("woman") ≈ vec("queen")`) but assigns only one static vector to polysemous words like "bank".',
        productionPitfall: 'Static embeddings cannot distinguish "river bank" from "bank account"—upgrade to contextual Transformer encoders when disambiguation matters.',
        pythonSnippet: `from gensim.models import Word2Vec\nmodel = Word2Vec(sentences, vector_size=128, window=5, sg=1, negative=10)`
      },
      {
        id: 't11-rnn',
        title: 'Recurrent Neural Networks (RNNs)',
        explanation: 'Sequential networks that pass a hidden state vector `h_t = tanh(W_h h_{t-1} + W_x x_t)` step-by-step across time to model ordered sequences.',
        analogy: 'Reading a book one word at a time while keeping a tiny sticky-note summary in your head.',
        technicalDetail: 'Trained via Backpropagation Through Time (BPTT); repeated matrix multiplication `W_h^T` causes vanishing or exploding gradients over long sequences.',
        productionPitfall: 'Vanilla RNNs forget context after ~15–20 tokens and cannot parallelize across sequence length during training.',
        pythonSnippet: `import torch.nn as nn\nrnn = nn.RNN(input_size=64, hidden_size=128, batch_first=True)`
      },
      {
        id: 't11-lstm-gru',
        title: 'LSTM and GRU',
        explanation: 'Gated recurrent architectures that introduce learned forget/input/output (LSTM) or reset/update (GRU) valves to carry long-range memory without vanishing gradients.',
        analogy: 'Upgrading the sticky-note into a whiteboard with an explicit eraser (forget gate) and highlighter (input gate).',
        technicalDetail: 'LSTM maintains an additive cell-state highway `c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t`; GRU merges cell and hidden state with ~25% fewer parameters.',
        productionPitfall: 'Still fundamentally sequential `O(T)` at training time, making long-context training far slower than Transformers.',
        pythonSnippet: `import torch.nn as nn\nlstm = nn.LSTM(input_size=128, hidden_size=256, num_layers=2, bidirectional=True, batch_first=True)`
      },
      {
        id: 't11-attention',
        title: 'Attention Mechanisms',
        explanation: 'Allows every output step to dynamically compute weighted relevance scores over all input tokens—eliminating the fixed-size bottleneck of seq2seq RNNs.',
        analogy: 'Instead of memorizing an entire page before translating, your eyes glance directly back at the exact source phrase you need.',
        technicalDetail: 'Scaled Dot-Product Attention: `Attention(Q, K, V) = softmax((Q K^T) / sqrt(d_k)) V`; dividing by `sqrt(d_k)` prevents softmax saturation.',
        productionPitfall: 'Forgetting causal masking during autoregressive decoding lets future tokens leak into current predictions during training.',
        pythonSnippet: `import torch, math\nscores = (Q @ K.transpose(-2, -1)) / math.sqrt(Q.size(-1))\nweights = torch.softmax(scores, dim=-1)\ncontext = weights @ V`
      },
      {
        id: 't11-transformers',
        title: 'Transformers',
        explanation: 'Pure-attention encoder/decoder architecture stacking Multi-Head Self-Attention, residual LayerNorm/RMSNorm, positional encodings (RoPE), and position-wise FFN blocks.',
        analogy: 'A conference room where every word simultaneously consults every other word across multiple specialist perspectives (heads).',
        technicalDetail: 'Enables full sequence parallelism during training; Encoder-only (BERT/DeBERTa) excels at understanding, Decoder-only (GPT/Claude) excels at generation.',
        productionPitfall: 'Standard self-attention memory grows quadratically `O(L^2)` in sequence length—use FlashAttention to fuse attention in GPU SRAM in `O(L)` memory.',
        pythonSnippet: `import torch.nn as nn\nlayer = nn.TransformerEncoderLayer(d_model=256, nhead=8, dim_feedforward=1024, batch_first=True)`
      },
      {
        id: 't11-text-cls',
        title: 'Text Classification',
        explanation: 'Categorizing documents, support tickets, or emails into predefined classes using TF-IDF + Linear/LogReg baselines or fine-tuned DeBERTa/RoBERTa encoders.',
        analogy: 'An automated mailroom sorting thousands of incoming letters into the right department bins in milliseconds.',
        technicalDetail: 'Pool the `[CLS]` token or mean-pooled hidden states into a linear head trained with Cross-Entropy (multi-class) or BCEWithLogitsLoss (multi-label).',
        productionPitfall: 'Jumping straight to an expensive LLM API when a 100M-parameter DeBERTa classifier achieves higher F1 at 1/50th the cost and 5ms latency.',
        pythonSnippet: `from sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.pipeline import make_pipeline\nclf = make_pipeline(TfidfVectorizer(ngram_range=(1, 2)), LogisticRegression(max_iter=1000))`
      },
      {
        id: 't11-sentiment',
        title: 'Sentiment Analysis',
        explanation: 'Quantifying polarity (positive/neutral/negative), emotion, or aspect-level opinion ("great screen, terrible battery") from reviews, calls, and social feeds.',
        analogy: 'Reading customer tone and separating praise for the food from complaints about slow delivery.',
        technicalDetail: 'Aspect-Based Sentiment Analysis (ABSA) pairs entity extraction with targeted polarity classification to avoid averaging conflicting opinions into "neutral".',
        productionPitfall: 'Domain shift—words like "unpredictable" are positive for movie plots but negative for cloud APIs; always fine-tune on domain-labeled samples.',
        pythonSnippet: `from transformers import pipeline\nclf = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest")\nprint(clf("Great battery life, though the setup took 20 minutes."))`
      },
      {
        id: 't11-ner',
        title: 'Named Entity Recognition',
        explanation: 'Token-level sequence labeling that locates and classifies spans like `PERSON`, `ORG`, `DATE`, `MONEY`, or custom domain entities using BIO/BILOU tagging.',
        analogy: 'Color-coding every person, company, dollar amount, and date inside a legal contract.',
        technicalDetail: 'Uses BIO tags (`B-ORG`, `I-ORG`, `O`) with a Transformer encoder + optional CRF layer; evaluated strictly with entity-level span F1 (`seqeval`), never token accuracy.',
        productionPitfall: 'Subword tokenization splits one word into multiple pieces—assign entity labels only to the first subword and mask continuation subwords with `-100`.',
        pythonSnippet: `from transformers import pipeline\nner = pipeline("ner", aggregation_strategy="simple")\nentities = ner("Anthropic released Claude in San Francisco.")`
      }
    ],
    mermaidDfd: `flowchart LR
  TXT["Raw Text + Normalization"] --> TOK["Subword Tokenizer (BPE / WordPiece)"]
  TOK --> EMB["Token + Positional Embeddings"]
  EMB --> ATTN["Multi-Head Self-Attention (Q, K, V)"]
  ATTN --> FFN["Residual + LayerNorm + FFN"]
  FFN --> TASK["Task Head (Sentiment / NER BIO / Classify)"]`,
    dfdNodeLabels: { TXT: 'Text Clean', TOK: 'Subword BPE', EMB: 'Embeddings', ATTN: 'Self-Attention', FFN: 'Transformer FFN', TASK: 'NLP Head' },
    dfdSteps: [
      { step: 1, nodeId: 'TOK', title: 'Subword BPE Tokenization', description: 'Convert raw text into subword IDs with zero out-of-vocabulary drops.', payload: { text: 'not great latency', tokens: ['not', 'great', 'lat', 'ency'], ids: [407, 1049, 1821, 904] } },
      { step: 2, nodeId: 'EMB', title: 'Dense Vector Lookup', description: 'Project each token ID into a d_model contextual embedding with positional signal.', payload: { shape: '[1, 4, 768]', positional: 'RoPE', l2_norm: 1.0 } },
      { step: 3, nodeId: 'ATTN', title: 'Scaled Dot-Product Attention', description: 'Token "great" attends strongly to "not" to invert sentiment polarity.', payload: { attn_great_to_not: 0.71, heads: 12, scale: '1/sqrt(64)' } },
      { step: 4, nodeId: 'TASK', title: 'Classification & BIO NER Output', description: 'Predict polarity score and exact entity span offsets.', payload: { sentiment: 'NEGATIVE (0.94)', entities: [{ span: 'latency', label: 'METRIC' }] } }
    ],
    simTitle: 'RNN vs. Transformer Self-Attention Complexity & Context Simulator',
    simSubtitle: 'Compare sequence length, hidden dimension, FlashAttention, and model family (RNN/LSTM vs Transformer) on path length and memory.',
    simControls: [
      { id: 'seqLen', label: 'Sequence Length (Tokens)', type: 'slider', min: 128, max: 8192, step: 128, unit: 'tok', defaultValue: 1024 },
      { id: 'heads', label: 'Attention Heads', type: 'slider', min: 2, max: 32, step: 2, unit: 'heads', defaultValue: 12 },
      { id: 'useTransformer', label: 'Transformer Self-Attention (vs. LSTM)', type: 'toggle', defaultValue: true },
      { id: 'flashAttn', label: 'Enable FlashAttention (O(L) SRAM Tiling)', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const L = nVal(vals.seqLen, 1024)
      const heads = nVal(vals.heads, 12)
      const isTx = bVal(vals.useTransformer, true)
      const flash = bVal(vals.flashAttn, true)
      const naiveAttnMb = Number(((heads * L * L * 2) / (1024 * 1024)).toFixed(1))
      const activeMemMb = !isTx ? Number(((L * 0.08)).toFixed(1)) : flash ? Number(((heads * L * 64 * 2) / (1024 * 1024)).toFixed(1)) : naiveAttnMb
      const maxPath = isTx ? 1 : L
      const trainThroughput = isTx ? Math.round(9200 / (1 + L / 2048)) : Math.round(950 / (1 + L / 1024))
      const longRecall = isTx ? 96 : Math.max(24, Math.round(92 - L / 45))
      const health = !isTx && L > 512 ? 'breaking' : isTx && !flash && activeMemMb > 1500 ? 'breaking' : activeMemMb > 600 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: isTx
          ? `Transformer (${flash ? 'FlashAttention' : 'Standard O(L²)'}): ${activeMemMb} MB attention RAM · Path length = 1 hop`
          : `LSTM Sequential Bottleneck: ${maxPath} recurrent hops · Long-range recall drops to ${longRecall}%`,
        explanation: isTx
          ? 'Every token attends directly to every other token in 1 hop; FlashAttention tiles Q/K/V in GPU SRAM to eliminate the O(L²) HBM attention matrix.'
          : 'LSTM propagates information sequentially through T steps, capping training parallelism and degrading recall beyond a few hundred tokens.',
        kpis: [
          { label: 'Attention / State RAM', value: `${activeMemMb} MB`, sub: isTx ? (flash ? 'O(L) Flash' : 'O(L²) Naive') : 'O(L) Recurrent', status: activeMemMb < 500 ? 'optimal' : activeMemMb < 1500 ? 'tradeoff' : 'breaking' },
          { label: 'Max Dependency Hops', value: `${maxPath} hop${maxPath > 1 ? 's' : ''}`, sub: isTx ? 'Direct global link' : 'Sequential BPTT', status: maxPath === 1 ? 'optimal' : 'breaking' },
          { label: 'Long-Context Recall', value: `${longRecall}%`, sub: `At ${L} tokens`, status: longRecall >= 85 ? 'optimal' : 'breaking' },
          { label: 'Train Speed', value: `${trainThroughput.toLocaleString()} tok/s`, sub: isTx ? 'Parallel GPU' : 'Serial time steps', status: trainThroughput >= 3000 ? 'optimal' : 'tradeoff' }
        ],
        bars: [
          { label: 'Long-Context Retention', pct: longRecall, display: `${longRecall}%`, tone: longRecall >= 85 ? 'positive' : 'danger' },
          { label: 'Attention Memory vs Naive O(L²)', pct: Math.min(100, Math.max(4, Math.round((activeMemMb / Math.max(1, naiveAttnMb)) * 100))), display: `${activeMemMb} MB`, tone: activeMemMb < 500 ? 'positive' : 'danger' },
          { label: 'Parallel Throughput', pct: Math.min(100, Math.round((trainThroughput / 9500) * 100)), display: `${trainThroughput.toLocaleString()} tok/s`, tone: isTx ? 'positive' : 'warning' }
        ]
      }
    },
    playgroundTitle: 'Live Scaled Dot-Product Self-Attention & Cosine Embedding Sandbox',
    playgroundTask: 'Compute exact `softmax(Q K^T / sqrt(d_k)) V` attention weights across a sentence and observe contextual negation focus.',
    executableCode: `// Track 11 — Exact Scaled Dot-Product Attention (Q, K, V)
const tokens = ["The", "API", "was", "not", "fast"];
const Q = [[0.1,0.2],[0.8,0.1],[0.2,0.3],[0.9,0.9],[0.85,0.85]];
const K = [[0.1,0.1],[0.7,0.2],[0.2,0.2],[0.95,0.9],[0.8,0.7]];
const V = [[0.1,0.0],[0.5,0.2],[0.2,0.2],[-1.0,-0.9],[0.9,0.8]];
const dk = Q[0].length;

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const softmax = arr => {
  const m = Math.max(...arr);
  const ex = arr.map(v => Math.exp(v - m));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map(v => v / sum);
};

// Focus on last token ("fast", index 4)
const rawScores = K.map(k => dot(Q[4], k) / Math.sqrt(dk));
const attnWeights = softmax(rawScores);
const ctxVec = [0, 1].map(dim => attnWeights.reduce((s, w, i) => s + w * V[i][dim], 0));

const topIdx = attnWeights.indexOf(Math.max(...attnWeights));
console.log("[Attention from 'fast']", tokens.map((t, i) => t + ":" + (attnWeights[i] * 100).toFixed(1) + "%").join(" | "));
console.log("[Context Vector]", ctxVec.map(v => v.toFixed(3)));

assert(tokens[topIdx] === "not", "Token 'fast' attended most strongly to negation token 'not'");
assert(Math.abs(attnWeights.reduce((a, b) => a + b, 0) - 1) < 1e-6, "Softmax attention weights sum to 1.0");
emitMetric("Top Attended Token", tokens[topIdx], (attnWeights[topIdx] * 100).toFixed(1) + "% weight", "optimal");
emitMetric("Context Polarity", ctxVec[0].toFixed(3), "Shifted by negation", "optimal");
emitArtifact("Attention Distribution", Object.fromEntries(tokens.map((t, i) => [t, Number(attnWeights[i].toFixed(4))])));`,
    pythonReference: `import torch, math\ndef scaled_dot_product_attention(Q, K, V):\n    scores = (Q @ K.transpose(-2, -1)) / math.sqrt(Q.size(-1))\n    weights = torch.softmax(scores, dim=-1)\n    return weights @ V, weights`
  },

  // =========================================================================
  // TRACK 12 — GENERATIVE AI & LARGE LANGUAGE MODELS (12 TOPICS)
  // =========================================================================
  {
    id: 'ml26-12-genai-llm',
    number: 12,
    phase: 'genai-rl',
    phaseLabel: 'GenAI & RL',
    title: 'Generative AI & Large Language Models',
    summary: 'Master Transformer Architecture, LLMs, GPT/Llama/Claude/Gemini, Prompting, Embeddings, RAG, Fine-Tuning, PEFT, LoRA/QLoRA, Vector DBs, Multimodal AI, and AI Agents.',
    architectAuditNote: 'Follow the Adaptation Ladder: start with Prompting + Evals -> add Hybrid RAG for fresh facts -> apply LoRA/QLoRA fine-tuning only for style/format/domain reasoning -> wrap AI Agents in deterministic harnesses.',
    topics: [
      {
        id: 't12-tx-arch',
        title: 'Transformer Architecture',
        explanation: 'Modern decoder-only LLM stack combining Pre-RMSNorm, Grouped-Query Attention (GQA), RoPE positional rotation, SwiGLU FFN, and KV caching for fast autoregressive decoding.',
        analogy: 'A high-speed relay factory where previous tokens cache their notes (KV Cache) so each new generated word never recomputes the past.',
        technicalDetail: 'GQA shares K/V heads across multiple Q heads to shrink KV cache VRAM by 4x–8x; SwiGLU improves perplexity per FLOP over vanilla ReLU.',
        productionPitfall: 'Ignoring KV-cache growth at 128k context causes GPU OOM crashes even when model weights fit easily in memory.',
        pythonSnippet: `# KV Cache memory bytes per token = 2 * n_layers * n_kv_heads * head_dim * dtype_bytes\nkv_bytes_per_tok = 2 * 32 * 8 * 128 * 2  # ~131 KB/token in FP16`
      },
      {
        id: 't12-llms',
        title: 'Large Language Models (LLMs)',
        explanation: 'Billion-parameter foundation models trained in 3 stages: self-supervised Next-Token Prediction pretraining, Supervised Fine-Tuning (SFT), and RLHF/DPO/RLVR alignment.',
        analogy: 'Reading the entire world library (pretraining), studying expert Q&A handbooks (SFT), then taking coached mock exams with feedback (RL alignment).',
        technicalDetail: 'Chinchilla scaling laws balance parameters `N` and training tokens `D` (~20 tokens/param compute-optimal, or over-trained 100+ tok/param for cheaper inference).',
        productionPitfall: 'Treating an LLM as a deterministic factual database rather than a probabilistic reasoning engine causes silent hallucinations.',
        pythonSnippet: `# Autoregressive decoding with temperature + nucleus (top-p) sampling\n# next_token ~ softmax(logits / temperature) filtered to cumulative prob <= top_p`
      },
      {
        id: 't12-frontier-models',
        title: 'GPT, Llama, Claude & Gemini',
        explanation: 'Leading frontier & open-weight model families: GPT (reasoning/broad ecosystem), Claude (long-horizon coding & safety), Gemini (native long-context multimodal), and Llama (open-weight self-hosted control).',
        analogy: 'Specialized fleet vehicles—use compact fast models for routing, long-context multimodal models for video/docs, and open weights for strict on-prem privacy.',
        technicalDetail: 'Architect multi-model routing behind a unified gateway so tasks route by latency/cost/privacy tier (e.g., cheap classifier -> frontier reasoner fallback) with automatic failover.',
        productionPitfall: 'Hardcoding prompts and tool schemas to one vendor API locks you in and leaves you vulnerable to model deprecations or pricing shifts.',
        pythonSnippet: `MODEL_ROUTER = {\n    "classify": "fast-small-tier",\n    "code_audit": "frontier-reasoning-tier",\n    "private_pii": "self-hosted-llama-vllm"\n}`
      },
      {
        id: 't12-prompting',
        title: 'Prompt Engineering',
        explanation: 'Systematic specification design: clear role + constraints, few-shot input/output exemplars, structured JSON schemas, explicit abstention rules, and automated prompt regression tests.',
        analogy: 'Writing an unambiguous engineering spec with concrete worked examples instead of vague hallway instructions.',
        technicalDetail: 'Version prompts in Git alongside golden eval sets; enforce Structured Outputs (JSON Schema / constrained decoding) for zero parsing failures.',
        productionPitfall: 'Vibe-checking 3 manual prompts after an edit—a tweak that fixes 1 edge case often breaks 15 previously passing cases without an eval suite.',
        pythonSnippet: `SYSTEM_PROMPT = (\n    "Answer strictly from the provided <context>. "\n    "If the answer is absent, output {\"status\": \"insufficient_evidence\"}."\n)`
      },
      {
        id: 't12-embeddings',
        title: 'Embeddings',
        explanation: 'Bi-encoder dense semantic vectors (`768`–`3072` dims) trained with contrastive loss (InfoNCE) so semantically related queries and passages cluster tightly.',
        analogy: 'Assigning every paragraph a GPS coordinate in meaning-space so similar concepts sit next door regardless of exact wording.',
        technicalDetail: 'Matryoshka Representation Learning (MRL) lets you truncate embeddings (e.g., 1536 -> 512 dims) with minimal recall loss to save 3x index RAM.',
        productionPitfall: 'Switching embedding models without re-indexing your vector store mixes incompatible coordinate spaces, returning random garbage.',
        pythonSnippet: `from sentence_transformers import SentenceTransformer\nenc = SentenceTransformer("BAAI/bge-small-en-v1.5")\nvecs = enc.encode(["How does LoRA work?"], normalize_embeddings=True)`
      },
      {
        id: 't12-rag',
        title: 'Retrieval-Augmented Generation (RAG)',
        explanation: 'Grounding LLM generation in external, freshly indexed knowledge via semantic chunking -> hybrid retrieval (BM25 + dense vectors) -> cross-encoder reranking -> cited synthesis.',
        analogy: 'Turning a closed-book memory exam into an open-book research task where every claim must cite an exact page number.',
        technicalDetail: 'Combine Reciprocal Rank Fusion (RRF) of lexical + dense retrieval, filter by similarity threshold, and rerank Top-25 down to Top-5 high-signal chunks.',
        productionPitfall: 'Blindly stuffing Top-20 noisy chunks into the prompt triggers "Lost in the Middle" attention decay and prompt-injection exposure.',
        pythonSnippet: `def rrf_score(bm25_rank: int, dense_rank: int, k: int = 60) -> float:\n    return 1.0 / (k + bm25_rank) + 1.0 / (k + dense_rank)`
      },
      {
        id: 't12-finetuning',
        title: 'Fine-Tuning',
        explanation: 'Updating pretrained weights on curated domain demonstrations (SFT) or preference pairs (DPO/GRPO) to teach strict output formats, tone, tool use, or specialized reasoning.',
        analogy: 'Sending a general-practice doctor through a cardiology fellowship with thousands of reviewed cases.',
        technicalDetail: 'Full fine-tuning updates all `W` parameters (requiring ~16 bytes/param in mixed precision + AdamW states); prefer PEFT unless rewriting deep domain knowledge.',
        productionPitfall: 'Fine-tuning on noisy, unverified synthetic data degrades reasoning and causes catastrophic forgetting of instruction following.',
        pythonSnippet: `# Memory rule of thumb: Full AdamW FP16 training ≈ 16 bytes * param_count\n# 7B model full fine-tune ≈ 112 GB VRAM (excluding activations)`
      },
      {
        id: 't12-peft',
        title: 'Parameter-Efficient Fine-Tuning (PEFT)',
        explanation: 'Freezing 99%+ of base LLM weights and training tiny modular adapters (LoRA, DoRA, Prefix Tuning) so one base model serves dozens of specialized tasks cleanly.',
        analogy: 'Keeping one master engine block and swapping lightweight bolt-on turbo kits for each race track.',
        technicalDetail: 'Reduces optimizer state VRAM by >90%, prevents catastrophic forgetting, and enables multi-tenant dynamic adapter hot-swapping in vLLM/S-LoRA.',
        productionPitfall: 'Applying adapters only to `q_proj`/`v_proj` when targeting complex reasoning—targeting all linear layers (`q,k,v,o,gate,up,down`) matches full fine-tuning far better.',
        pythonSnippet: `from peft import LoraConfig, get_peft_model\ncfg = LoraConfig(r=16, lora_alpha=32, target_modules=["q_proj","k_proj","v_proj","o_proj"], lora_dropout=0.05)`
      },
      {
        id: 't12-lora-qlora',
        title: 'LoRA & QLoRA',
        explanation: 'LoRA injects trainable low-rank matrices `ΔW = B @ A` (`r << d`) alongside frozen weights; QLoRA adds 4-bit NormalFloat (NF4) base quantization + paged optimizers to fine-tune 70B models on a single GPU.',
        analogy: 'Instead of reprinting an entire encyclopedia, attaching slim transparent overlay sheets (`A` and `B`) that record only the exact edits.',
        technicalDetail: 'Init `A ~ N(0, σ²)` and `B = 0` so `ΔW = 0` at step 0; at inference, merge `W_merged = W + (alpha/r) * B @ A` for zero extra latency.',
        productionPitfall: 'Setting rank `r` too small (`r=2`) underfits complex tasks, while setting `lora_alpha` mismatching `r` destabilizes learning rate scaling.',
        pythonSnippet: `from transformers import BitsAndBytesConfig\nbnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True)`
      },
      {
        id: 't12-vectordb',
        title: 'Vector Databases',
        explanation: 'Specialized Approximate Nearest Neighbor (ANN) indexes (HNSW, IVF-PQ, DiskANN in pgvector, Qdrant, Milvus, Pinecone) supporting millisecond similarity search + metadata filtering.',
        analogy: 'A multi-dimensional highway network with express ramps (HNSW layers) that jumps straight to the closest semantic neighbors in O(log N) time.',
        technicalDetail: 'HNSW trades RAM (`M`, `efConstruction`) for ~98% recall@10; pre-filtering metadata (tenant_id, ACL permissions) is mandatory for secure enterprise RAG.',
        productionPitfall: 'Post-filtering permissions after Top-K retrieval returns zero valid results for restricted users—always apply ACL filters inside the index query.',
        pythonSnippet: `# pgvector HNSW cosine index with tenant ACL pre-filter\n# CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);`
      },
      {
        id: 't12-multimodal',
        title: 'Multimodal AI',
        explanation: 'Unified models processing and generating across text, images, audio, and video by projecting non-text modalities (via ViT/Whisper encoders or native tokenizers) into a shared Transformer latent space.',
        analogy: 'A translator fluent in sight, sound, and language who thinks in one unified conceptual mind.',
        technicalDetail: 'Vision-Language Models (VLMs) align visual patch tokens with text via contrastive pretraining (CLIP/SigLIP) + projector MLP + multimodal instruction tuning.',
        productionPitfall: 'High-resolution screenshots explode into thousands of image tokens, spiking TTFT latency and cost—use dynamic tiling and OCR hybrid routing.',
        pythonSnippet: `# Multimodal message payload: combine concise system spec + cropped high-res region\nmsg = [{"type": "text", "text": "Extract invoice total"}, {"type": "image_url", "url": "crop.png"}]`
      },
      {
        id: 't12-agents',
        title: 'AI Agents',
        explanation: 'Goal-directed LLM loops that plan, invoke typed tools/MCP servers, inspect observations, manage working/long-term memory, and verify completion inside deterministic guardrails.',
        analogy: 'Moving from an advisor who only writes suggestions to a junior engineer with sandboxed terminal access, unit tests, and an approval checklist.',
        technicalDetail: 'Compound reliability obeys `Pass^k`: if a single tool step is 95% reliable, a 10-step agent succeeds only `0.95^10 = 60%` unless wrapped in schema validation, retries, and verifier gates.',
        productionPitfall: 'Unbounded `while True` agent loops without max-step budgets, token ceilings, or human approval on destructive tools cause runaway bills and outages.',
        pythonSnippet: `for step in range(MAX_STEPS):\n    action = llm_decide(state, tools=TYPED_TOOLS)\n    if action.type == "final": break\n    obs = execute_sandboxed_tool(action)\n    state.append(obs)`
      }
    ],
    mermaidDfd: `flowchart LR
  USR["User Query / Multimodal Input"] --> VDB["Hybrid Vector DB (HNSW + BM25 + ACL)"]
  VDB --> RR["Cross-Encoder Reranker + Prompt Guard"]
  RR --> LLM["Foundation LLM + LoRA Adapter (GQA/KV)"]
  LLM --> AGT["Agent Harness (Typed Tools + Verifier)"]
  AGT --> OUT["Cited Grounded Answer / Action"]`,
    dfdNodeLabels: { USR: 'User Input', VDB: 'Vector DB + ACL', RR: 'Reranker', LLM: 'LLM + LoRA', AGT: 'Agent Harness', OUT: 'Verified Output' },
    dfdSteps: [
      { step: 1, nodeId: 'VDB', title: 'ACL-Filtered Hybrid Retrieval', description: 'Search dense HNSW + lexical BM25 strictly inside authorized tenant partitions.', payload: { candidates: 25, acl_enforced: true, p95_ms: 14 } },
      { step: 2, nodeId: 'RR', title: 'Rerank & Context Packing', description: 'Keep Top-5 highest-evidence chunks and strip prompt-injection payloads.', payload: { kept_chunks: 5, context_tokens: 1850, injection_blocked: true } },
      { step: 3, nodeId: 'LLM', title: 'Base LLM + Merged LoRA Forward', description: 'Run QLoRA/LoRA-tuned decoder with GQA KV caching and JSON schema constraints.', payload: { base: '7B-NF4', lora_rank: 16, trainable_pct: 0.42 } },
      { step: 4, nodeId: 'AGT', title: 'Deterministic Harness Verification', description: 'Validate tool schema, enforce step budget, and check citation faithfulness.', payload: { steps_used: 2, max_steps: 6, faithfulness: 0.96 } }
    ],
    simTitle: 'QLoRA Fine-Tuning VRAM & Agent Reliability (Pass^k) Simulator',
    simSubtitle: 'Configure model size, LoRA rank, 4-bit QLoRA quantization, and agent step depth to inspect GPU VRAM fit and end-to-end success probability.',
    simControls: [
      { id: 'paramsB', label: 'Base Model Size (Billion Params)', type: 'slider', min: 3, max: 70, step: 1, unit: 'B', defaultValue: 8 },
      { id: 'loraRank', label: 'LoRA Rank (r)', type: 'slider', min: 4, max: 128, step: 4, unit: 'r', defaultValue: 16 },
      { id: 'qlora4bit', label: 'Use 4-Bit NF4 QLoRA (vs Full FP16 Fine-Tune)', type: 'toggle', defaultValue: true },
      { id: 'agentSteps', label: 'Agent Multi-Step Depth (k)', type: 'slider', min: 1, max: 15, step: 1, unit: 'steps', defaultValue: 5 }
    ],
    runSim: vals => {
      const B = nVal(vals.paramsB, 8)
      const rank = nVal(vals.loraRank, 16)
      const qlora = bVal(vals.qlora4bit, true)
      const steps = nVal(vals.agentSteps, 5)
      const fullVramGb = Number((B * 16).toFixed(1))
      const adapterPct = Number(((rank / 4096) * 100 * 1.4).toFixed(2))
      const activeVramGb = qlora
        ? Number((B * 0.62 + B * (adapterPct / 100) * 16 + 2.4).toFixed(1))
        : fullVramGb
      const fitsSingle24 = activeVramGb <= 24
      const fitsSingle80 = activeVramGb <= 80
      const stepAcc = 0.94
      const passK = Math.round(Math.pow(stepAcc, steps) * 100)
      const health = !fitsSingle80 || passK < 55 ? 'breaking' : !fitsSingle24 || passK < 75 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: `${qlora ? 'QLoRA NF4' : 'Full FP16'}: ${activeVramGb} GB VRAM (${fitsSingle24 ? 'fits 1× 24GB GPU' : fitsSingle80 ? 'fits 1× 80GB H100' : 'needs multi-GPU cluster'}) · ${steps}-step Agent Pass^k = ${passK}%`,
        explanation: qlora
          ? `4-bit NF4 freezes base weights at ~0.62 GB/B while updating only ${adapterPct}% low-rank LoRA weights—slashing VRAM by ${Math.round((1 - activeVramGb / fullVramGb) * 100)}%.`
          : `Full FP16 + AdamW requires ~16 GB per billion parameters (${fullVramGb} GB). Enable QLoRA to train on commodity GPUs.`,
        kpis: [
          { label: 'Training VRAM', value: `${activeVramGb} GB`, sub: `Full FP16: ${fullVramGb} GB`, status: fitsSingle24 ? 'optimal' : fitsSingle80 ? 'tradeoff' : 'breaking' },
          { label: 'Trainable Params', value: qlora ? `${adapterPct}%` : '100%', sub: qlora ? `LoRA rank r=${rank}` : 'All weights', status: 'optimal' },
          { label: 'Agent Pass^k', value: `${passK}%`, sub: `0.94^${steps} steps`, status: passK >= 75 ? 'optimal' : passK >= 55 ? 'tradeoff' : 'breaking' },
          { label: 'Hardware Tier', value: fitsSingle24 ? '1× 24GB' : fitsSingle80 ? '1× 80GB' : `${Math.ceil(activeVramGb / 80)}× 80GB`, sub: 'GPU requirement', status: fitsSingle24 ? 'optimal' : fitsSingle80 ? 'tradeoff' : 'breaking' }
        ],
        bars: [
          { label: 'VRAM vs Full Fine-Tune', pct: Math.max(4, Math.min(100, Math.round((activeVramGb / fullVramGb) * 100))), display: `${activeVramGb} GB`, tone: fitsSingle24 ? 'positive' : fitsSingle80 ? 'warning' : 'danger' },
          { label: 'Agent Reliability (Pass^k)', pct: passK, display: `${passK}%`, tone: passK >= 75 ? 'positive' : passK >= 55 ? 'warning' : 'danger' },
          { label: 'VRAM Saved by QLoRA', pct: qlora ? Math.round((1 - activeVramGb / fullVramGb) * 100) : 0, display: `${qlora ? Math.round((1 - activeVramGb / fullVramGb) * 100) : 0}%`, tone: qlora ? 'positive' : 'warning' }
        ]
      }
    },
    playgroundTitle: 'Live Hybrid RAG (RRF) + LoRA Parameter Savings Calculator Sandbox',
    playgroundTask: 'Fuse dense + BM25 rankings with Reciprocal Rank Fusion and verify LoRA low-rank parameter reduction math.',
    executableCode: `// Track 12 — Hybrid RAG (RRF) + LoRA Parameter Compression Math
const denseRank = { doc_policy: 2, doc_faq: 1, doc_sla: 4 };
const bm25Rank  = { doc_policy: 1, doc_faq: 5, doc_sla: 2 };
const k = 60;

const fused = Object.keys(denseRank)
  .map(id => ({ id, score: Number((1 / (k + denseRank[id]) + 1 / (k + bm25Rank[id])).toFixed(5)) }))
  .sort((a, b) => b.score - a.score);

// LoRA parameter count for a 4096 x 4096 projection matrix
const d = 4096, r = 16;
const fullParams = d * d;
const loraParams = 2 * d * r;
const reductionPct = Number(((1 - loraParams / fullParams) * 100).toFixed(2));

console.log("[Hybrid RRF Ranking]", fused.map(x => x.id + ":" + x.score).join(" > "));
console.log("[LoRA Matrix]", fullParams.toLocaleString(), "->", loraParams.toLocaleString(), "params (" + reductionPct + "% reduction)");

assert(fused[0].id === "doc_policy", "RRF promoted doc_policy to #1 by combining strong lexical + dense rank");
assert(reductionPct > 99, "LoRA r=16 reduced trainable weights by >99%");
emitMetric("Top RRF Chunk", fused[0].id, "Score " + fused[0].score, "optimal");
emitMetric("LoRA Savings", reductionPct + "%", "r=16 vs 4096x4096", "optimal");
emitArtifact("RRF + LoRA Audit", { fused, fullParams, loraParams, reductionPct });`,
    pythonReference: `from peft import LoraConfig, get_peft_model\n\nlora_cfg = LoraConfig(r=16, lora_alpha=32, target_modules=["q_proj", "k_proj", "v_proj", "o_proj"])\npeft_model = get_peft_model(base_model, lora_cfg)\npeft_model.print_trainable_parameters()`
  },

  // =========================================================================
  // TRACK 13 — REINFORCEMENT LEARNING (9 TOPICS)
  // =========================================================================
  {
    id: 'ml26-13-rl',
    number: 13,
    phase: 'genai-rl',
    phaseLabel: 'GenAI & RL',
    title: 'Reinforcement Learning',
    summary: 'Master MDPs, Rewards & Policies, Value Functions, Q-Learning, DQN, Policy Gradients, Actor-Critic, PPO, and Multi-Agent RL.',
    architectAuditNote: 'RL optimizes sequential decisions under delayed rewards—and powers modern LLM post-training (PPO/GRPO). Always defend against reward hacking with KL penalties and verifiable evaluators.',
    topics: [
      {
        id: 't13-mdp',
        title: 'Markov Decision Processes',
        explanation: 'Formal tuple `(S, A, P, R, γ)` defining states, actions, transition dynamics `P(s\'|s,a)`, rewards `R`, and discount factor `γ ∈ [0,1)` where the future depends only on the current state.',
        analogy: 'A board game where everything you need to choose your next move is visible on the current board, without needing the history of earlier turns.',
        technicalDetail: 'If critical velocity or history is unobserved, the environment becomes a Partially Observable MDP (POMDP), requiring frame stacking or recurrent/Transformer memory.',
        productionPitfall: 'Omitting key hidden state variables violates the Markov property, causing policies to oscillate endlessly.',
        pythonSnippet: `# MDP transition step: next_state, reward, terminated, truncated, info = env.step(action)\nG_t = sum((gamma ** k) * r for k, r in enumerate(rewards))`
      },
      {
        id: 't13-rewards-policies',
        title: 'Rewards and Policies',
        explanation: 'The Reward signal specifies *what* objective to maximize, while the Policy `π(a|s)` specifies *how* the agent acts—balancing exploration (trying new actions) vs. exploitation.',
        analogy: 'Reward is the scoreboard; policy is the athlete’s playbook.',
        technicalDetail: 'Sparse rewards (only +1 at finish) are hard to explore; reward shaping adds potential-based guidance `F(s,s\') = γΦ(s\') - Φ(s)` without altering the optimal policy.',
        productionPitfall: 'Reward hacking—an agent discovers an unintended exploit (e.g., spinning in circles to farm bonus points or writing verbose fluff to trick an LLM reward model).',
        pythonSnippet: `import random\ndef epsilon_greedy(q_vals, eps=0.1):\n    return random.randrange(len(q_vals)) if random.random() < eps else max(range(len(q_vals)), key=lambda i: q_vals[i])`
      },
      {
        id: 't13-value-fn',
        title: 'Value Functions',
        explanation: 'State-value `V^π(s)` estimates expected cumulative discounted return starting in `s`; Action-value `Q^π(s,a)` estimates return after taking action `a` in `s`, linked by the Bellman Equation.',
        analogy: 'A chess grandmaster glancing at a board position and immediately knowing whether White is ahead by +2.5 pawns.',
        technicalDetail: 'Bellman Optimality: `Q*(s,a) = E[r + γ max_{a\'} Q*(s\', a\')]`; Advantage `A(s,a) = Q(s,a) - V(s)` measures how much better action `a` is than average.',
        productionPitfall: 'Setting discount `γ = 0.999` on noisy long horizons explodes value variance; too small (`γ = 0.5`) makes the agent myopic.',
        pythonSnippet: `# Generalized Advantage Estimation (GAE) temporal difference residual\ndelta_t = reward + gamma * V_next * (1 - done) - V_curr`
      },
      {
        id: 't13-qlearning',
        title: 'Q-Learning',
        explanation: 'Model-free, off-policy Temporal-Difference algorithm that iteratively updates a lookup table `Q(s,a)` toward observed reward plus the best future `max Q(s\',a\')`.',
        analogy: 'Updating a restaurant rating notebook every time you eat there, factoring in both tonight’s meal and the best dessert place nearby.',
        technicalDetail: '`Q(s,a) <- Q(s,a) + α [r + γ max_{a\'} Q(s\',a\') - Q(s,a)]`; converges to `Q*` in tabular MDPs when all state-action pairs are visited infinitely often.',
        productionPitfall: 'Tabular Q-learning suffers from the curse of dimensionality and fails completely on continuous states like robotics or images.',
        pythonSnippet: `Q[s, a] += alpha * (r + gamma * np.max(Q[s_next]) - Q[s, a])`
      },
      {
        id: 't13-dqn',
        title: 'Deep Q-Networks (DQN)',
        explanation: 'Replaces the Q-table with a neural network `Q_θ(s,a)` stabilized by two key inventions: Experience Replay buffers (breaking temporal correlation) and periodic Target Networks.',
        analogy: 'Learning from shuffled flashcard memories rather than memorizing only the last 5 seconds while the textbook keeps changing.',
        technicalDetail: 'Double DQN decouples action selection (`argmax Q_θ`) from evaluation (`Q_{θ-}`) to eliminate systematic Q-value overestimation bias.',
        productionPitfall: 'Training a Q-network online without replay buffer or target network creates a moving target feedback loop that diverges rapidly.',
        pythonSnippet: `with torch.no_grad():\n    next_a = q_net(s_next).argmax(dim=1, keepdim=True)\n    target = r + gamma * (1 - done) * target_net(s_next).gather(1, next_a)`
      },
      {
        id: 't13-policy-grad',
        title: 'Policy Gradient Methods',
        explanation: 'Directly parameterizes a stochastic policy `π_θ(a|s)` and performs gradient ascent on expected return (`∇J(θ) = E[∇ log π_θ(a|s) · G_t]`), natively handling continuous actions.',
        analogy: 'Practicing free throws and turning up the probability of motions that swished while dialing down motions that missed.',
        technicalDetail: 'REINFORCE is unbiased but suffers high gradient variance; subtracting a state-dependent baseline `b(s) ≈ V(s)` slashes variance without introducing bias.',
        productionPitfall: 'One bad oversized gradient step collapses the policy into a terrible region from which on-policy rollouts can never recover.',
        pythonSnippet: `loss = -(log_probs * (returns - returns.mean()) / (returns.std() + 1e-8)).mean()`
      },
      {
        id: 't13-actor-critic',
        title: 'Actor-Critic Methods',
        explanation: 'Combines two networks: an Actor `π_θ(a|s)` that chooses actions and a Critic `V_φ(s)` that scores them via TD Advantage `A_t`, slashing policy gradient variance.',
        analogy: 'A pilot (Actor) flying the plane while an instructor (Critic) gives instant frame-by-frame score feedback instead of waiting until landing.',
        technicalDetail: 'Algorithms like A2C, A3C, and SAC (Soft Actor-Critic, adding entropy regularization) achieve far higher sample efficiency than pure REINFORCE.',
        productionPitfall: 'Letting the critic lag behind a fast-moving actor produces noisy advantages; tune critic learning rate and GAE `λ` carefully.',
        pythonSnippet: `actor_loss = -(log_prob * advantage.detach()).mean()\ncritic_loss = F.mse_loss(value_pred, returns)`
      },
      {
        id: 't13-ppo',
        title: 'Proximal Policy Optimization (PPO)',
        explanation: 'Workhorse RL algorithm (used in robotics and RLHF) that clips the policy probability ratio `r_t(θ) = π_θ / π_old` within `[1-ε, 1+ε]` to prevent destructive policy updates.',
        analogy: 'Improving your swing with guardrails that forbid changing your stance more than 20% in a single practice session.',
        technicalDetail: '`L^CLIP(θ) = E[min(r_t A_t, clip(r_t, 1-ε, 1+ε) A_t)]` plus value loss, entropy bonus, and (in LLM RLHF) a KL penalty against the reference SFT policy.',
        productionPitfall: 'Omitting the KL-divergence tether in LLM PPO lets the model exploit reward-model quirks into gibberish.',
        pythonSnippet: `ratio = torch.exp(new_logp - old_logp)\nsurr1 = ratio * adv\nsurr2 = torch.clamp(ratio, 1.0 - eps, 1.0 + eps) * adv\nppo_loss = -torch.min(surr1, surr2).mean()`
      },
      {
        id: 't13-marl',
        title: 'Multi-Agent Reinforcement Learning',
        explanation: 'Multiple learning agents interacting in cooperative, competitive, or mixed-motive environments—typically trained via Centralized Training with Decentralized Execution (CTDE).',
        analogy: 'A soccer team that reviews overhead drone footage together in practice (centralized critic), then plays autonomously on match day (decentralized actors).',
        technicalDetail: 'MAPPO and QMIX mitigate environment non-stationarity caused by teammates and opponents simultaneously changing their policies.',
        productionPitfall: 'Training independent agents naively violates stationarity—what worked yesterday fails today because other agents shifted strategy.',
        pythonSnippet: `# CTDE pattern: critic sees global_state, each actor sees only local_obs_i\nactions = [actor_i(obs_i) for actor_i, obs_i in zip(actors, local_obs)]\njoint_value = central_critic(global_state)`
      }
    ],
    mermaidDfd: `flowchart LR
  ENV["Environment (MDP State s_t)"] --> ACT["Actor Policy pi_theta(a|s)"]
  ACT --> STEP["Execute Action a_t -> Reward r_t, s_t+1"]
  STEP --> BUF["Rollout Buffer + GAE Advantage A_t"]
  BUF --> CRIT["Critic V_phi(s) + KL Reference Guard"]
  CRIT --> PPO["PPO Clipped Objective Update (1 +/- eps)"]
  PPO --> ACT`,
    dfdNodeLabels: { ENV: 'MDP State', ACT: 'Actor Policy', STEP: 'Env Transition', BUF: 'GAE Rollouts', CRIT: 'Critic + KL', PPO: 'PPO Clip Update' },
    dfdSteps: [
      { step: 1, nodeId: 'ACT', title: 'Policy Sampling', description: 'Actor samples action a_t from stochastic policy pi_theta(a|s_t) with entropy exploration.', payload: { state: 's_14', action: 'right', entropy: 0.48 } },
      { step: 2, nodeId: 'STEP', title: 'Environment Reward & Next State', description: 'Environment returns immediate reward r_t and transitions to s_{t+1}.', payload: { reward: 1.0, done: false, gamma: 0.99 } },
      { step: 3, nodeId: 'BUF', title: 'Advantage Estimation (GAE)', description: 'Compute TD advantage A_t = Q(s,a) - V(s) to reward better-than-expected moves.', payload: { td_error: 0.34, gae_advantage: 0.42 } },
      { step: 4, nodeId: 'PPO', title: 'Clipped PPO + KL Trust Region', description: 'Clip ratio within [0.8, 1.2] and penalize KL drift to prevent policy collapse.', payload: { clip_eps: 0.2, kl_div: 0.018, stable: true } }
    ],
    simTitle: 'PPO Trust-Region Clipping, Discount (γ) & KL Reward-Hacking Simulator',
    simSubtitle: 'Adjust PPO clip epsilon, discount factor γ, exploration entropy, and KL tether to observe policy stability and reward hacking risk.',
    simControls: [
      { id: 'clipEps', label: 'PPO Clip Epsilon (×100)', type: 'slider', min: 5, max: 60, step: 5, unit: '%', defaultValue: 20 },
      { id: 'gammaPct', label: 'Discount Factor γ (×100)', type: 'slider', min: 50, max: 99, step: 1, unit: '%', defaultValue: 96 },
      { id: 'klPenalty', label: 'Enforce Reference Policy KL Penalty', type: 'toggle', defaultValue: true },
      { id: 'useCritic', label: 'Use Actor-Critic Baseline (vs Pure REINFORCE)', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const eps = nVal(vals.clipEps, 20) / 100
      const gamma = nVal(vals.gammaPct, 96) / 100
      const kl = bVal(vals.klPenalty, true)
      const critic = bVal(vals.useCritic, true)
      const horizon = Math.round(1 / Math.max(0.01, 1 - gamma))
      const gradVariance = Math.round((critic ? 22 : 76) + Math.max(0, (eps - 0.2) * 90))
      const hackRisk = Math.min(95, Math.round((kl ? 8 : 54) + Math.max(0, (eps - 0.25) * 85)))
      const trueScore = Math.max(18, Math.min(98, Math.round(88 - Math.abs(eps - 0.2) * 80 - (kl ? 0 : 28) - (critic ? 0 : 18) - (gamma < 0.8 ? 15 : 0))))
      const health = hackRisk > 45 || gradVariance > 70 || trueScore < 55 ? 'breaking' : trueScore < 75 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: health === 'optimal'
          ? `Stable PPO Convergence: True Eval ${trueScore}/100 · Effective Horizon ${horizon} steps · Reward Hacking ${hackRisk}%`
          : `Unstable RL Update: Variance ${gradVariance}% / Hack Risk ${hackRisk}% — keep clip ε≈0.20 with Critic + KL tether`,
        explanation: `PPO clipping bounds policy drift per update, Actor-Critic baselines cut gradient variance ~3×, and KL penalties prevent reward-model exploitation.`,
        kpis: [
          { label: 'True Eval Return', value: `${trueScore}/100`, sub: `Clip ε = ${eps.toFixed(2)}`, status: trueScore >= 78 ? 'optimal' : trueScore >= 58 ? 'tradeoff' : 'breaking' },
          { label: 'Effective Horizon', value: `${horizon} steps`, sub: `1 / (1 - ${gamma.toFixed(2)})`, status: horizon >= 10 ? 'optimal' : 'tradeoff' },
          { label: 'Gradient Variance', value: `${gradVariance}%`, sub: critic ? 'Critic GAE baseline' : 'High-variance REINFORCE', status: gradVariance <= 35 ? 'optimal' : gradVariance <= 65 ? 'tradeoff' : 'breaking' },
          { label: 'Reward Hack Risk', value: `${hackRisk}%`, sub: kl ? 'KL tether ON' : 'No KL tether', status: hackRisk <= 20 ? 'optimal' : hackRisk <= 45 ? 'tradeoff' : 'breaking' }
        ],
        bars: [
          { label: 'True Task Performance', pct: trueScore, display: `${trueScore}/100`, tone: trueScore >= 75 ? 'positive' : 'warning' },
          { label: 'Gradient Variance', pct: Math.min(100, gradVariance), display: `${gradVariance}%`, tone: gradVariance <= 35 ? 'positive' : 'danger' },
          { label: 'Reward Hacking Risk', pct: hackRisk, display: `${hackRisk}%`, tone: hackRisk <= 20 ? 'positive' : 'danger' }
        ]
      }
    },
    playgroundTitle: 'Live Tabular Q-Learning Gridworld + PPO Clipped Objective Sandbox',
    playgroundTask: 'Train a real Q-Learning agent over 200 episodes on a 5-state corridor and evaluate PPO clipped surrogate loss.',
    executableCode: `// Track 13 — Live Tabular Q-Learning + PPO Clipped Surrogate Math
const Q = Array.from({ length: 5 }, () => [0, 0]); // actions: 0=left, 1=right; goal at state 4
const alpha = 0.25, gamma = 0.9;
for (let ep = 0; ep < 200; ep++) {
  let s = 0;
  for (let step = 0; step < 20 && s < 4; step++) {
    const a = (ep + step) % 5 === 0 ? 0 : (Q[s][1] >= Q[s][0] ? 1 : 0);
    const ns = a === 1 ? Math.min(4, s + 1) : Math.max(0, s - 1);
    const r = ns === 4 ? 10 : -0.1;
    const bestNext = ns === 4 ? 0 : Math.max(...Q[ns]);
    Q[s][a] += alpha * (r + gamma * bestNext - Q[s][a]);
    s = ns;
  }
}

// PPO Clip check with ratio=1.45, adv=+2.0, eps=0.2
const ratio = 1.45, adv = 2.0, eps = 0.2;
const unclipped = ratio * adv;
const clipped = Math.min(Math.max(ratio, 1 - eps), 1 + eps) * adv;
const ppoObj = Math.min(unclipped, clipped);

console.log("[Learned Q(s, right)]", Q.slice(0, 4).map((q, i) => "s" + i + ":" + q[1].toFixed(2)).join(" | "));
console.log("[PPO Surrogate] unclipped =", unclipped.toFixed(2), "| clipped =", clipped.toFixed(2), "-> used =", ppoObj.toFixed(2));

assert(Q[3][1] > 9.5 && Q[0][1] > Q[0][0], "Q-Learning learned optimal right-moving policy toward goal");
assert(Math.abs(ppoObj - 2.4) < 1e-6, "PPO clipped oversized ratio 1.45 down to 1.2 * 2.0 = 2.4");
emitMetric("Q(s3, right)", Q[3][1].toFixed(2), "Target ~10.0", "optimal");
emitMetric("PPO Clipped Obj", ppoObj.toFixed(2), "Guarded vs 2.90", "optimal");
emitArtifact("Learned Q-Table", Q.slice(0, 4).map((q, s) => ({ state: s, left: Number(q[0].toFixed(2)), right: Number(q[1].toFixed(2)) })));`,
    pythonReference: `import numpy as np\nQ = np.zeros((5, 2))\nfor _ in range(200):\n    s = 0\n    while s < 4:\n        a = 1 if Q[s, 1] >= Q[s, 0] else 0\n        ns = min(4, s + 1) if a == 1 else max(0, s - 1)\n        r = 10.0 if ns == 4 else -0.1\n        Q[s, a] += 0.25 * (r + 0.9 * (0 if ns == 4 else Q[ns].max()) - Q[s, a])\n        s = ns`
  },

  // =========================================================================
  // TRACK 14 — MLOPS & MACHINE LEARNING DEPLOYMENT (12 TOPICS)
  // =========================================================================
  {
    id: 'ml26-14-mlops',
    number: 14,
    phase: 'mlops-projects',
    phaseLabel: 'MLOps & Projects',
    title: 'MLOps & Machine Learning Deployment',
    summary: 'Master ML Pipelines, Experiment Tracking, Model & Data Versioning, Registries, Monitoring, Drift Detection, Automated Retraining, CI/CD, MLflow, Kubeflow, and DVC.',
    architectAuditNote: 'Software CI/CD tests Code; MLOps must version and test the triad: Code + Data Snapshot + Model Artifact. Without drift telemetry and automated rollback, every deployed model silently decays.',
    topics: [
      {
        id: 't14-pipelines',
        title: 'ML Pipelines',
        explanation: 'Directed Acyclic Graphs (DAGs) orchestrating ingestion, validation, feature engineering, training, evaluation gates, and promotion as reproducible, cacheable steps.',
        analogy: 'An automated car assembly line where each station verifies part tolerances before passing the chassis forward.',
        technicalDetail: 'Each pipeline step runs in an isolated container with typed input/output artifacts, enabling step-level caching and exact lineage replay.',
        productionPitfall: 'Glue scripts chained with cron jobs hide partial failures and retrain models on half-written upstream tables.',
        pythonSnippet: `# Declarative pipeline contract: ingest -> validate_schema -> train -> evaluate_gate -> register`
      },
      {
        id: 't14-exp-tracking',
        title: 'Experiment Tracking',
        explanation: 'Automatically logging hyperparameters, git commit SHA, dataset hash, loss curves, evaluation metrics, and hardware telemetry for every training run.',
        analogy: 'A chemist’s bound laboratory notebook recording exact reagent weights and temperatures for every trial.',
        technicalDetail: 'Eliminates "which notebook produced `model_final_v3_REAL.pkl`?" by linking every metric plot back to immutable code and data pointers.',
        productionPitfall: 'Logging training metrics only without validation slice metrics or random seeds prevents reproducing winning runs.',
        pythonSnippet: `import mlflow\nwith mlflow.start_run():\n    mlflow.log_params({"lr": 3e-4, "max_depth": 6})\n    mlflow.log_metrics({"val_pr_auc": 0.84, "ece": 0.021})`
      },
      {
        id: 't14-model-ver',
        title: 'Model Versioning',
        explanation: 'Immutable semantic versioning of serialized weights, preprocessing pipelines, label maps, and dependency locks so any production prediction can be audited or rolled back instantly.',
        analogy: 'Issuing each aircraft software build a unique tail-stamped serial number before flight certification.',
        technicalDetail: 'Always bundle the feature transformer (`ColumnTransformer`/tokenizer) with the model weights and record an input/output signature schema.',
        productionPitfall: 'Overwriting `s3://models/prod/model.bin` in place destroys rollback capability during an outage.',
        pythonSnippet: `# Immutable artifact URI: s3://ml-artifacts/churn/v2.4.1-sha9f21c/model.onnx`
      },
      {
        id: 't14-registry',
        title: 'Model Registry',
        explanation: 'Centralized governance catalog tracking model lineage, evaluation sign-offs, and lifecycle aliases (`@candidate`, `@shadow`, `@champion`) with approval gates.',
        analogy: 'An air-traffic control tower authorizing which planes move from hangar to runway.',
        technicalDetail: 'Serving clusters pull by alias (`models:/fraud_detector@champion`) rather than hardcoded paths, decoupling ML release promotion from infra redeploys.',
        productionPitfall: 'Allowing developers to promote models straight to `@champion` without automated shadow evaluation or regression checks.',
        pythonSnippet: `client = mlflow.MlflowClient()\nclient.set_registered_model_alias("fraud_xgb", "champion", version="14")`
      },
      {
        id: 't14-data-ver',
        title: 'Data Versioning',
        explanation: 'Content-addressed snapshots of training/validation datasets (via DVC, LakeFS, or Iceberg snapshot IDs) so historical models can be reproduced bit-for-bit.',
        analogy: 'Git commits for terabyte-scale tables and image folders without duplicating files into Git history.',
        technicalDetail: 'Stores lightweight `.dvc` MD5/SHA256 pointer manifests in Git while keeping heavy Parquet/image blobs in S3/GCS object storage.',
        productionPitfall: 'Pointing training jobs at mutable `SELECT * FROM users` tables makes every re-run train on different data.',
        pythonSnippet: `# Iceberg time-travel snapshot read for deterministic training\n# spark.read.option("snapshot-id", 84729103847).table("lake.transactions")`
      },
      {
        id: 't14-monitoring',
        title: 'Model Monitoring',
        explanation: 'Continuous production observability across 4 layers: system health (p99 latency/errors), data quality (nulls/schema), prediction distribution, and delayed business KPIs.',
        analogy: 'A cockpit dashboard monitoring engine temperature, fuel pressure, altitude, and compass heading simultaneously.',
        technicalDetail: 'Log prediction inputs, outputs, model version, and correlation IDs asynchronously to a monitoring lake to join later with ground-truth outcomes.',
        productionPitfall: 'Monitoring only HTTP 200 status codes—a model returning `0.0` for every request still returns HTTP 200 while silently burning revenue.',
        pythonSnippet: `metrics = {"model_ver": "v14", "p99_ms": 18.4, "null_rate": 0.001, "pos_pred_rate": 0.042}`
      },
      {
        id: 't14-drift',
        title: 'Model Drift Detection',
        explanation: 'Detecting Data Drift (covariate shift `P(X)` changes via PSI/KS/Wasserstein) and Concept Drift (`P(Y|X)` relationship changes, e.g., fraudsters adapting tactics).',
        analogy: 'A smoke detector warning you that the weather or customer behavior has shifted before accuracy crashes.',
        technicalDetail: 'Population Stability Index `PSI = Σ (Actual% - Expected%) * ln(Actual% / Expected%)`: `<0.10` stable, `0.10–0.25` monitor, `>0.25` severe shift.',
        productionPitfall: 'Alerting on raw p-values of KS tests at 10M rows triggers constant false alarms for tiny meaningless shifts—use effect-size metrics (PSI / Jensen-Shannon).',
        pythonSnippet: `import numpy as np\ndef psi(exp, act):\n    e, a = np.clip(exp, 1e-6, 1), np.clip(act, 1e-6, 1)\n    return float(np.sum((a - e) * np.log(a / e)))`
      },
      {
        id: 't14-retraining',
        title: 'Automated Retraining',
        explanation: 'Triggering scheduled or drift/performance-driven retraining pipelines with strict Champion-vs-Challenger offline + shadow validation gates before auto-promotion.',
        analogy: 'An automatic tire-pit system that swaps in fresh tires only after verifying pressure and lug torque.',
        technicalDetail: 'Combine rolling time-window datasets with golden regression test slices so retraining adapts to new trends without forgetting rare critical cases.',
        productionPitfall: 'Blindly auto-promoting retrained models on corrupted upstream data amplifies poison into production (feedback-loop collapse).',
        pythonSnippet: `if challenger_pr_auc >= champion_pr_auc + 0.005 and challenger_ece <= 0.03:\n    promote_to_canary(challenger_version, traffic_pct=10)`
      },
      {
        id: 't14-cicd',
        title: 'CI/CD for Machine Learning',
        explanation: 'Extending Git CI/CD into Continuous Training (CT) and Continuous Evaluation (CE): PRs run unit tests, data-schema tests, slice-fairness checks, and latency benchmarks.',
        analogy: 'Automated crash tests, emissions checks, and road trials every time an engineer modifies an engine blueprint.',
        technicalDetail: 'Include behavioral tests: invariance (typos shouldn’t flip intent), directional expectation (higher income shouldn’t raise default risk), and latency budgets.',
        productionPitfall: 'Skipping feature-skew tests between offline training code and online serving code causes silent train-serve skew.',
        pythonSnippet: `# pytest behavioral invariance check in CI\ndef test_monotonic_credit_score(model):\n    assert model.predict_proba(high_score)[0,1] <= model.predict_proba(low_score)[0,1]`
      },
      {
        id: 't14-mlflow',
        title: 'MLflow',
        explanation: 'Open-source MLOps backbone providing Experiment Tracking, standardized `MLmodel` packaging, Model Registry aliases, and LLM Evaluation tracing.',
        analogy: 'The central ledger connecting every experiment, serialized model package, and production release stage.',
        technicalDetail: 'Back MLflow with PostgreSQL (metadata) + S3/GCS (artifacts) in production instead of local SQLite files.',
        productionPitfall: 'Using local `./mlruns` folders inside ephemeral CI runners loses all experiment history once the container exits.',
        pythonSnippet: `import mlflow.sklearn\nmlflow.set_tracking_uri("https://mlflow.internal")\nmlflow.sklearn.log_model(pipe, "model", registered_model_name="churn_clf")`
      },
      {
        id: 't14-kubeflow',
        title: 'Kubeflow',
        explanation: 'Kubernetes-native ML orchestration platform (`Kubeflow Pipelines`, `Katib` HPO, `KServe`) executing scalable containerized DAGs across GPU node pools.',
        analogy: 'A Kubernetes factory controller spinning up GPU pods for each training step and tearing them down the instant work finishes.',
        technicalDetail: 'Define typed Python `@dsl.component` steps compiled to Argo Workflows IR with GPU resource requests, retries, and artifact caching.',
        productionPitfall: 'Adopting full Kubeflow too early for a 2-person team adds heavy Kubernetes maintenance overhead—start lean with Prefect/Dagster/MLflow until scale demands it.',
        pythonSnippet: `from kfp import dsl\n@dsl.component(base_image="python:3.11-slim")\ndef evaluate_gate(val_auc: float) -> bool:\n    return val_auc >= 0.85`
      },
      {
        id: 't14-dvc',
        title: 'DVC',
        explanation: 'Data Version Control—Git-native tool that hashes large datasets/models to S3/GCS remotes and runs reproducible `dvc.yaml` DAG pipelines with `dvc repro`.',
        analogy: 'Git LFS purpose-built for ML datasets and reproducible Make-style training stages.',
        technicalDetail: '`dvc.yaml` defines stage dependencies (`deps`), parameters (`params.yaml`), outputs (`outs`), and metrics (`metrics.json`), skipping unchanged stages automatically.',
        productionPitfall: 'Forgetting `dvc push` after `git push` leaves teammates with `.dvc` pointer files pointing to missing remote blobs.',
        pythonSnippet: `# CLI workflow:\n# dvc add data/train.parquet && git add data/train.parquet.dvc\n# dvc repro && dvc push`
      }
    ],
    mermaidDfd: `flowchart LR
  DVC["Data Snapshot (DVC / Iceberg)"] --> PIPE["CI/CT Pipeline (Kubeflow / GitHub)"]
  PIPE --> TRK["Experiment Tracking (MLflow)"]
  TRK --> REG["Model Registry (@champion Gate)"]
  REG --> MON["Production Monitor (PSI Drift + Latency)"]
  MON -->|PSI > 0.25| PIPE`,
    dfdNodeLabels: { DVC: 'Versioned Data', PIPE: 'CI/CT Pipeline', TRK: 'MLflow Tracking', REG: 'Registry Gate', MON: 'Drift Monitor' },
    dfdSteps: [
      { step: 1, nodeId: 'DVC', title: 'Immutable Data & Code Lock', description: 'Pin exact Git SHA + DVC/Iceberg dataset snapshot for 100% reproducibility.', payload: { git_sha: 'c48e1a9', data_hash: 'md5:91a8f2', rows: 1400000 } },
      { step: 2, nodeId: 'TRK', title: 'Experiment Logging', description: 'Track hyperparameters, slice PR-AUC, calibration ECE, and artifact signature.', payload: { run_id: 'mlf_8821', val_pr_auc: 0.874, ece: 0.019 } },
      { step: 3, nodeId: 'REG', title: 'Champion-Challenger Gate', description: 'Promote to @champion only after passing fairness, skew, and latency gates.', payload: { gate_passed: true, alias: '@champion', canary_pct: 10 } },
      { step: 4, nodeId: 'MON', title: 'PSI Drift Loop -> Auto-Retrain', description: 'Detect covariate shift (PSI > 0.25) and trigger gated retraining automatically.', payload: { psi: 0.29, alert: 'DRIFT_DETECTED', retrain_triggered: true } }
    ],
    simTitle: 'Production Model Drift (PSI), Retrain Cadence & Rollback Gate Simulator',
    simSubtitle: 'Simulate covariate shift speed, PSI alert threshold, and shadow promotion gates to observe production F1 decay and bad-deploy risk.',
    simControls: [
      { id: 'driftRate', label: 'Monthly Covariate Shift Severity', type: 'slider', min: 1, max: 10, step: 1, unit: 'lvl', defaultValue: 6 },
      { id: 'retrainDays', label: 'Retraining Interval (Days)', type: 'slider', min: 7, max: 180, step: 7, unit: 'days', defaultValue: 28 },
      { id: 'shadowGate', label: 'Enforce Champion-Challenger Shadow Gate', type: 'toggle', defaultValue: true },
      { id: 'dataVersioned', label: 'Immutable Data + Feature Versioning (DVC/Iceberg)', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const drift = nVal(vals.driftRate, 6)
      const cadence = nVal(vals.retrainDays, 28)
      const gate = bVal(vals.shadowGate, true)
      const ver = bVal(vals.dataVersioned, true)
      const psi = Number(Math.min(0.65, (drift * cadence) / 950).toFixed(2))
      const liveF1 = Math.max(52, Math.round(92 - psi * 58 - (gate ? 0 : 8)))
      const badDeployRisk = Math.min(90, (gate ? 3 : 42) + (ver ? 0 : 28))
      const rollbackMins = ver ? 2 : 95
      const health = psi > 0.25 || badDeployRisk > 30 ? 'breaking' : psi > 0.12 || badDeployRisk > 12 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: `Live PSI = ${psi} (${psi > 0.25 ? 'Severe Drift' : psi > 0.12 ? 'Moderate Shift' : 'Stable'}) · Live F1 ${liveF1}% · Rollback ${rollbackMins}m`,
        explanation: `Shorter drift-triggered retrain loops keep PSI under 0.15, while Shadow Gates + immutable versioning eliminate bad promotions and enable 2-minute rollbacks.`,
        kpis: [
          { label: 'Feature Drift (PSI)', value: psi.toFixed(2), sub: '<0.10 stable · >0.25 alert', status: psi <= 0.12 ? 'optimal' : psi <= 0.25 ? 'tradeoff' : 'breaking' },
          { label: 'Live Production F1', value: `${liveF1}%`, sub: `Every ${cadence}d retrain`, status: liveF1 >= 84 ? 'optimal' : liveF1 >= 74 ? 'tradeoff' : 'breaking' },
          { label: 'Bad-Release Risk', value: `${badDeployRisk}%`, sub: gate ? 'Shadow gate ON' : 'Blind auto-push', status: badDeployRisk <= 10 ? 'optimal' : badDeployRisk <= 30 ? 'tradeoff' : 'breaking' },
          { label: 'Rollback MTTR', value: `${rollbackMins} min`, sub: ver ? 'Immutable registry' : 'Manual rebuild', status: ver ? 'optimal' : 'breaking' }
        ],
        bars: [
          { label: 'Live Model F1 Health', pct: liveF1, display: `${liveF1}%`, tone: liveF1 >= 84 ? 'positive' : 'warning' },
          { label: 'Drift Severity (PSI / 0.50)', pct: Math.min(100, Math.round((psi / 0.5) * 100)), display: `PSI ${psi}`, tone: psi <= 0.12 ? 'positive' : psi <= 0.25 ? 'warning' : 'danger' },
          { label: 'Bad-Release Exposure', pct: badDeployRisk, display: `${badDeployRisk}%`, tone: badDeployRisk <= 10 ? 'positive' : 'danger' }
        ]
      }
    },
    playgroundTitle: 'Live PSI Drift Detector & Champion-Challenger Promotion Gate Sandbox',
    playgroundTask: 'Calculate exact Population Stability Index (PSI) across binned feature distributions and run an automated MLflow promotion gate.',
    executableCode: `// Track 14 — Exact PSI Drift Detection + Champion-Challenger Gate
const expectedBins = [0.20, 0.30, 0.25, 0.15, 0.10];
const actualBins   = [0.08, 0.18, 0.24, 0.28, 0.22]; // shifted right

const psi = expectedBins.reduce((sum, e, i) => {
  const a = Math.max(actualBins[i], 1e-6);
  return sum + (a - e) * Math.log(a / e);
}, 0);

const status = psi > 0.25 ? "SEVERE_DRIFT_RETRAIN" : psi > 0.10 ? "MODERATE_MONITOR" : "STABLE";
const champion = { prAuc: 0.842, p99Ms: 19, ece: 0.024 };
const challenger = { prAuc: 0.869, p99Ms: 21, ece: 0.018 };
const promote = challenger.prAuc >= champion.prAuc + 0.01 && challenger.p99Ms <= 25 && challenger.ece <= 0.03;

console.log("[PSI Drift]", psi.toFixed(4), "->", status);
console.log("[Promotion Gate] Promote Challenger?", promote, "| Delta PR-AUC:", (challenger.prAuc - champion.prAuc).toFixed(3));

assert(psi > 0.25, "Detected severe feature shift (PSI > 0.25)");
assert(promote === true, "Challenger passed PR-AUC, latency, and calibration promotion gates");
emitMetric("Feature PSI", psi.toFixed(3), status, "breaking");
emitMetric("Gate Decision", promote ? "PROMOTE" : "HOLD", "+2.7% PR-AUC", "optimal");
emitArtifact("MLOps Gate Audit", { psi: Number(psi.toFixed(4)), status, promote, challenger });`,
    pythonReference: `import numpy as np\ndef compute_psi(expected, actual):\n    e, a = np.clip(expected, 1e-6, 1), np.clip(actual, 1e-6, 1)\n    return float(np.sum((a - e) * np.log(a / e)))`
  },

  // =========================================================================
  // TRACK 15 — ML ENGINEERING & CLOUD DEPLOYMENT (11 TOPICS)
  // =========================================================================
  {
    id: 'ml26-15-mleng-cloud',
    number: 15,
    phase: 'mlops-projects',
    phaseLabel: 'MLOps & Projects',
    title: 'ML Engineering & Cloud Deployment',
    summary: 'Master FastAPI & Flask, REST APIs, Docker, Kubernetes, AWS SageMaker, Google Vertex AI, Azure ML, GPU Computing, Distributed Training, Model Optimization, and Cloud Infrastructure.',
    architectAuditNote: 'Production ML Engineering is systems engineering: isolate CPU/GPU inference workers, batch requests dynamically, containerize cleanly with multi-stage Docker builds, and right-size cloud GPUs with autoscaling.',
    topics: [
      {
        id: 't15-fastapi-flask',
        title: 'FastAPI & Flask: Model serving',
        explanation: 'Python web frameworks for wrapping models as HTTP microservices: FastAPI adds async I/O, Pydantic schema validation, and OpenAPI docs; Flask offers lightweight WSGI simplicity.',
        analogy: 'The storefront counter taking validated customer orders and handing them cleanly to the kitchen (inference engine).',
        technicalDetail: 'Load the model once in FastAPI’s `lifespan` startup hook (never per request) and run CPU/GPU inference in a threadpool/dedicated Triton or vLLM backend to avoid blocking the async event loop.',
        productionPitfall: 'Running heavy synchronous `model.predict()` directly inside an `async def` FastAPI endpoint freezes the entire event loop for all concurrent users.',
        pythonSnippet: `from fastapi import FastAPI\nfrom pydantic import BaseModel\napp = FastAPI()\nclass Req(BaseModel): features: list[float]\n@app.post("/predict")\ndef predict(req: Req): return {"score": float(model.predict([req.features])[0])}`
      },
      {
        id: 't15-rest',
        title: 'REST APIs',
        explanation: 'Stateless HTTP JSON contracts (`/v1/predict`, `/healthz`, `/readyz`) with versioned schemas, request IDs, timeouts, rate limiting, and deterministic error codes.',
        analogy: 'Standardized shipping labels and loading dock protocols so any client application can talk to your model.',
        technicalDetail: 'Separate `/healthz` (process alive) from `/readyz` (model weights loaded & warm-up inference passed) so load balancers never route traffic to cold containers.',
        productionPitfall: 'Returning unversioned fields or changing response JSON types silently crashes downstream mobile and backend callers.',
        pythonSnippet: `@app.get("/readyz")\ndef readyz():\n    return {"ready": MODEL_LOADED, "model_version": "v2.4.1"}`
      },
      {
        id: 't15-docker',
        title: 'Docker: Containerization',
        explanation: 'Packaging OS libraries, CUDA/cuDNN drivers, pinned Python wheels, and model code into immutable OCI images that run identically from laptop to cloud cluster.',
        analogy: 'Standardized intermodal shipping containers that fit onto any truck, train, or cargo ship without repacking.',
        technicalDetail: 'Use multi-stage builds, non-root `USER`, `.dockerignore` (exclude raw datasets), and layer caching (`COPY pyproject.toml` before `COPY src/`) for fast lean images.',
        productionPitfall: 'Baking 15 GB model weights inside the Docker image makes CI builds and Kubernetes pod rollouts painfully slow—mount weights from object storage/PVC at startup.',
        pythonSnippet: `FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY src/ ./src/\nUSER 1000\nCMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]`
      },
      {
        id: 't15-k8s',
        title: 'Kubernetes: Container orchestration',
        explanation: 'Declarative cluster scheduler managing replicas, GPU device plugins, Horizontal Pod Autoscaling (HPA), canary rollouts, and self-healing restarts across nodes.',
        analogy: 'An automated port crane director that spawns extra lanes during rush hour and replaces stalled trucks automatically.',
        technicalDetail: 'Configure strict `resources.requests/limits` (CPU, RAM, `nvidia.com/gpu: 1`), readiness probes, and custom queue-depth HPA metrics (not just CPU %) for GPU workloads.',
        productionPitfall: 'Autoscaling GPU pods solely on CPU utilization fails because GPU inference saturates VRAM/SMs while host CPU stays at 15%.',
        pythonSnippet: `# K8s GPU resource request snippet (YAML):\n# resources:\n#   limits:\n#     nvidia.com/gpu: "1"\n#     memory: "16Gi"`
      },
      {
        id: 't15-sagemaker',
        title: 'AWS SageMaker',
        explanation: 'AWS managed ML suite spanning distributed training jobs (with Managed Spot savings), Feature Store, Pipelines, Model Registry, and serverless/multi-model endpoints.',
        analogy: 'A full-service AWS ML factory floor with on-demand GPU bays and autoscaling storefront counters.',
        technicalDetail: 'Use Managed Spot Training (up to 70% cheaper) with S3 checkpointing, and Multi-Model Endpoints (MME) to pack dozens of small models onto shared instances.',
        productionPitfall: 'Leaving idle `ml.g5.12xlarge` Jupyter notebook instances running 24/7 burns thousands of dollars monthly—enforce idle auto-shutdown policies.',
        pythonSnippet: `# SageMaker deployment pattern: Estimator.fit() -> register_model() -> deploy(instance_type="ml.g5.xlarge")`
      },
      {
        id: 't15-vertex',
        title: 'Google Vertex AI',
        explanation: 'Google Cloud unified AI platform uniting BigQuery ML, Vertex Pipelines (KFP), Feature Store, Vector Search, TPU/GPU custom training, and Model Garden serving.',
        analogy: 'An integrated Google Cloud campus linking warehouse analytics, TPU supercomputers, and global prediction endpoints.',
        technicalDetail: 'Natively supports Ray on Vertex AI, BigQuery direct data streaming (zero CSV export), and prediction traffic splitting for zero-downtime canary rollouts.',
        productionPitfall: 'Cross-region GCS buckets and training clusters incur massive egress fees and I/O bottlenecks—always co-locate storage and compute in the same region.',
        pythonSnippet: `# Vertex AI SDK: aiplatform.init(project=..., location="us-central1"); endpoint.deploy(model, traffic_percentage=20)`
      },
      {
        id: 't15-azureml',
        title: 'Azure Machine Learning',
        explanation: 'Microsoft Azure enterprise ML workspace featuring compute clusters, managed online/batch endpoints, Responsible AI dashboards, and tight Entra ID/VNet governance.',
        analogy: 'An enterprise-governed ML foundry with strict corporate identity badges and private network tunnels.',
        technicalDetail: 'Uses declarative YAML CLI v2 (`az ml job create`, `az ml online-deployment create`) for GitOps-driven reproducible cloud infrastructure.',
        productionPitfall: 'Ignoring private endpoints and managed identities exposes inference APIs or embeds long-lived SAS keys in training scripts.',
        pythonSnippet: `# Azure ML CLI v2: az ml online-endpoint invoke --name churn-ep --request-file sample.json`
      },
      {
        id: 't15-gpu',
        title: 'GPU Computing',
        explanation: 'Massively parallel SIMT hardware (thousands of CUDA/Tensor Cores + high-bandwidth HBM) accelerating matrix multiplications (`GEMM`) 50x–200x over CPUs.',
        analogy: 'Trading 8 Formula-1 couriers (CPU cores) for 10,000 synchronized cyclists carrying one matrix tile each (GPU cores).',
        technicalDetail: 'Understand the Roofline Model: Prefill/Training is Compute-bound (TFLOPS), while single-request LLM Decode is Memory-Bandwidth-bound (HBM GB/s)—batching lifts arithmetic intensity.',
        productionPitfall: 'Starving a $4/hr GPU at 12% utilization because single-threaded Python CPU data loading (`num_workers=0`) cannot feed batches fast enough.',
        pythonSnippet: `loader = DataLoader(ds, batch_size=64, num_workers=8, pin_memory=True, persistent_workers=True)`
      },
      {
        id: 't15-distributed',
        title: 'Distributed Training',
        explanation: 'Scaling training across multiple GPUs/nodes via Data Parallelism (DDP), Sharded Data Parallelism (FSDP / DeepSpeed ZeRO), Tensor Parallelism (TP), and Pipeline Parallelism (PP).',
        analogy: 'Dividing a massive jigsaw puzzle by handing each worker a different box of pieces (DDP) or splitting one giant section across fast-connected neighbors (TP/FSDP).',
        technicalDetail: 'DDP replicates full weights + AllReduce gradients; FSDP/ZeRO-3 shards parameters, gradients, and optimizer states across GPUs; TP requires high-speed NVLink intra-node.',
        productionPitfall: 'Running Tensor Parallelism across slow Ethernet nodes instead of intra-node NVLink spends 80% of step time waiting on AllReduce communication.',
        pythonSnippet: `# PyTorch FSDP / DDP launch:\n# torchrun --nproc_per_node=4 train.py --fsdp full_shard`
      },
      {
        id: 't15-optimization',
        title: 'Model Optimization',
        explanation: 'Compressing and accelerating models for target hardware SLAs using Quantization (FP8/INT8/INT4), Structured Pruning, Knowledge Distillation, Dynamic Batching, and Speculative Decoding.',
        analogy: 'Distilling a 500-page encyclopedia into a pocket field guide that answers 99% of questions in 10x less time.',
        technicalDetail: 'Distillation trains a compact student model to match a large teacher’s soft probability logits (`KL(p_teacher || p_student)`), retaining reasoning at a fraction of inference cost.',
        productionPitfall: 'Measuring only offline accuracy after quantization without checking tail calibration and rare-class recall drops.',
        pythonSnippet: `# Dynamic batching + FP16 TensorRT / vLLM serving cuts p99 latency and increases GPU utilization 4x`
      },
      {
        id: 't15-cloud-infra',
        title: 'Cloud Infrastructure',
        explanation: 'Production foundations: Infrastructure-as-Code (Terraform), VPC private subnets, IAM least-privilege roles, FinOps GPU cost budgets, object-storage data lakes, and multi-AZ resilience.',
        analogy: 'The power grid, plumbing, security gates, and accounting meters that keep an entire hospital running 24/7.',
        technicalDetail: 'Codify GPU node pools, autoscaling bounds (`min=0` for dev, warm pool for prod), secrets management (KMS/Vault), and budget alerts in Terraform.',
        productionPitfall: 'Click-ops console deployments create undocumented snowflake clusters that cannot be rebuilt during disaster recovery.',
        pythonSnippet: `# Terraform principle: declarative GPU node pool + Spot fallback + VPC endpoint to S3/GCS`
      }
    ],
    mermaidDfd: `flowchart LR
  CLI["Client Apps (REST JSON)"] --> GW["API Gateway + Auth + Rate Limit"]
  GW --> K8S["K8s Ingress + FastAPI / KServe Pods"]
  K8S --> BATCH["Dynamic Batcher (Triton / vLLM)"]
  BATCH --> GPU["Optimized Model (FP16/INT8 on GPU)"]
  GPU --> OBS["Cloud Telemetry + HPA GPU Autoscale"]`,
    dfdNodeLabels: { CLI: 'REST Clients', GW: 'API Gateway', K8S: 'K8s + FastAPI', BATCH: 'Dynamic Batcher', GPU: 'GPU Engine', OBS: 'HPA & FinOps' },
    dfdSteps: [
      { step: 1, nodeId: 'GW', title: 'Validated REST Ingress', description: 'Authenticate Bearer token, enforce rate limit, and validate Pydantic JSON contract.', payload: { route: '/v1/predict', schema_valid: true, auth: 'IAM/OIDC' } },
      { step: 2, nodeId: 'BATCH', title: 'Micro-Batch Coalescing', description: 'Group concurrent arrivals within a 8ms window to saturate GPU Tensor Cores.', payload: { batch_size: 16, queue_wait_ms: 6.2, gpu_util_pct: 84 } },
      { step: 3, nodeId: 'GPU', title: 'Quantized Kernel Execution', description: 'Execute fused FP16/INT8 graph in C++ without Python GIL contention.', payload: { compute_ms: 9.4, total_p99_ms: 17.8, dtype: 'FP16' } },
      { step: 4, nodeId: 'OBS', title: 'Queue-Depth HPA Autoscaling', description: 'Scale GPU replicas up on queue depth and scale down to save FinOps spend.', payload: { replicas: '2 -> 4', cost_per_1m_req: '$1.42', sla_met: true } }
    ],
    simTitle: 'Cloud GPU Serving, Dynamic Batching & FinOps Cost Simulator',
    simSubtitle: 'Tune QPS traffic, dynamic batch window, GPU count, and model optimization to inspect p99 latency, GPU utilization, and monthly cloud cost.',
    simControls: [
      { id: 'qps', label: 'Incoming Traffic (Req/sec)', type: 'slider', min: 10, max: 500, step: 10, unit: 'QPS', defaultValue: 120 },
      { id: 'replicas', label: 'GPU Serving Replicas (L4/A10G)', type: 'slider', min: 1, max: 12, step: 1, unit: 'GPUs', defaultValue: 2 },
      { id: 'dynBatch', label: 'Enable Dynamic Micro-Batching (Triton/vLLM)', type: 'toggle', defaultValue: true },
      { id: 'quantized', label: 'Enable FP16/INT8 Optimization + Distillation', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const qps = nVal(vals.qps, 120)
      const gpus = nVal(vals.replicas, 2)
      const batching = bVal(vals.dynBatch, true)
      const opt = bVal(vals.quantized, true)
      const capPerGpu = (batching ? 95 : 28) * (opt ? 2.1 : 1.0)
      const totalCap = Math.round(capPerGpu * gpus)
      const utilPct = Math.round((qps / Math.max(1, totalCap)) * 100)
      const baseMs = opt ? 8 : 22
      const queueMs = utilPct >= 95 ? 240 + (utilPct - 95) * 14 : Math.round((utilPct / 100) * (batching ? 18 : 48))
      const p99Ms = baseMs + queueMs
      const monthlyUsd = Math.round(gpus * 740)
      const costPer1M = Number(((monthlyUsd / Math.max(1, qps * 2.592))).toFixed(2))
      const health = utilPct > 92 || p99Ms > 120 ? 'breaking' : utilPct < 25 || p99Ms > 60 ? 'tradeoff' : 'optimal'
      return {
        health,
        headline: utilPct > 95
          ? `Overloaded (${utilPct}% of ${totalCap} QPS capacity): p99 spikes to ${p99Ms}ms — scale GPUs or enable batching`
          : `Healthy Serving: ${utilPct}% GPU load · p99 ${p99Ms}ms · $${monthlyUsd.toLocaleString()}/mo ($${costPer1M}/1M req)`,
        explanation: `Dynamic batching + FP16/INT8 optimization multiplies single-GPU QPS capacity by ~7×, slashing monthly cloud bills while keeping p99 under SLA.`,
        kpis: [
          { label: 'p99 Latency', value: `${p99Ms} ms`, sub: 'SLA target < 60ms', status: p99Ms <= 60 ? 'optimal' : p99Ms <= 120 ? 'tradeoff' : 'breaking' },
          { label: 'Cluster Load', value: `${utilPct}%`, sub: `Cap: ${totalCap} QPS`, status: utilPct >= 30 && utilPct <= 85 ? 'optimal' : utilPct < 30 ? 'tradeoff' : 'breaking' },
          { label: 'Monthly GPU Cost', value: `$${monthlyUsd.toLocaleString()}`, sub: `${gpus}× cloud GPU`, status: monthlyUsd <= 3000 ? 'optimal' : 'tradeoff' },
          { label: 'Unit Economics', value: `$${costPer1M}`, sub: 'per 1M requests', status: costPer1M <= 3 ? 'optimal' : costPer1M <= 8 ? 'tradeoff' : 'breaking' }
        ],
        bars: [
          { label: 'Cluster Saturation', pct: Math.min(100, utilPct), display: `${utilPct}%`, tone: utilPct <= 85 ? 'positive' : 'danger' },
          { label: 'Latency vs 150ms Budget', pct: Math.min(100, Math.round((p99Ms / 150) * 100)), display: `${p99Ms} ms`, tone: p99Ms <= 60 ? 'positive' : p99Ms <= 120 ? 'warning' : 'danger' },
          { label: 'Capacity Headroom', pct: Math.max(0, Math.min(100, 100 - utilPct)), display: `${Math.max(0, totalCap - qps)} QPS free`, tone: utilPct <= 85 ? 'positive' : 'danger' }
        ]
      }
    },
    playgroundTitle: 'Live Dynamic Micro-Batcher & Kubernetes HPA Autoscaler Sandbox',
    playgroundTask: 'Simulate incoming REST requests coalescing into GPU micro-batches and compute exact K8s HPA desired replica count.',
    executableCode: `// Track 15 — Dynamic Micro-Batching + Kubernetes HPA Replica Calculator
const incomingQps = 280;
const singleReqLatencyMs = 14;
const maxBatch = 16;
const batchGpuMs = 26; // sub-linear GPU scaling for 16 batched requests

const unbatchedQpsPerGpu = Math.floor(1000 / singleReqLatencyMs);
const batchedQpsPerGpu = Math.floor((1000 / batchGpuMs) * maxBatch);
const targetUtil = 0.70;

const gpusWithoutBatch = Math.ceil(incomingQps / (unbatchedQpsPerGpu * targetUtil));
const gpusWithBatch = Math.ceil(incomingQps / (batchedQpsPerGpu * targetUtil));
const monthlySavedUsd = (gpusWithoutBatch - gpusWithBatch) * 740;

console.log("[Unbatched GPU Cap]", unbatchedQpsPerGpu, "QPS -> Needs", gpusWithoutBatch, "GPUs");
console.log("[Batched GPU Cap]", batchedQpsPerGpu, "QPS -> Needs", gpusWithBatch, "GPU(s)");
console.log("[FinOps Savings] $" + monthlySavedUsd.toLocaleString() + "/month saved via dynamic batching");

assert(batchedQpsPerGpu > unbatchedQpsPerGpu * 5, "Dynamic batching lifted GPU throughput by >5x");
assert(gpusWithBatch < gpusWithoutBatch, "HPA provisioned fewer GPU replicas with batching enabled");
emitMetric("Batched GPU Cap", batchedQpsPerGpu + " QPS", "vs " + unbatchedQpsPerGpu + " QPS", "optimal");
emitMetric("Monthly Savings", "$" + monthlySavedUsd.toLocaleString(), gpusWithoutBatch + " -> " + gpusWithBatch + " GPUs", "optimal");
emitArtifact("K8s HPA Capacity Plan", { incomingQps, unbatchedQpsPerGpu, batchedQpsPerGpu, gpusWithoutBatch, gpusWithBatch, monthlySavedUsd });`,
    pythonReference: `# FastAPI + ONNX/Triton pattern: async endpoint -> dynamic batch queue -> GPU worker\n# K8s HPA scales replicas = ceil(current_qps / (target_qps_per_pod))`
  },

  // =========================================================================
  // TRACK 16 — MACHINE LEARNING PROJECTS (14 TOPICS)
  // =========================================================================
  {
    id: 'ml26-16-projects',
    number: 16,
    phase: 'mlops-projects',
    phaseLabel: 'MLOps & Projects',
    title: 'Machine Learning Projects',
    summary: 'Apply end-to-end engineering across all 14 real-world capstone blueprints: Tabular, Fraud, RecSys, Forecasting, CV, Chatbot, RAG, Anomaly Detection, and Full MLOps Platform.',
    architectAuditNote: 'Employers hire production builders, not notebook runners. Every capstone should ship: time/group leak-free splits, business-metric evaluation, explainability, FastAPI/Docker serving, and drift monitoring.',
    topics: [
      {
        id: 't16-house-price',
        title: 'House Price Prediction',
        explanation: 'Tabular regression predicting property values using spatial coordinates, neighborhood comps, log-transformed targets, and gradient boosted trees (LightGBM/XGBoost).',
        analogy: 'An automated real-estate appraiser weighing square footage, zip-code trends, and recent comparable sales.',
        technicalDetail: 'Train on `log1p(price)` to stabilize right-skewed luxury outliers, evaluate with MAE/RMSLE on temporal splits, and explain valuations with SHAP.',
        productionPitfall: 'Random train/test splits leak future neighborhood price booms into training—always split chronologically by sale date.',
        pythonSnippet: `y_log = np.log1p(df["sale_price"])\n# Predict back in dollars: pred_usd = np.expm1(model.predict(X_val))`
      },
      {
        id: 't16-churn',
        title: 'Customer Churn Prediction',
        explanation: 'Predicting which subscribers will cancel in the next 30 days using RFM engagement velocity, support tickets, and calibrated probabilities to drive retention offers.',
        analogy: 'Spotting gym members whose weekly visits dropped 60% before they cancel their membership.',
        technicalDetail: 'Build point-in-time ASOF feature snapshots (30d/7d rolling activity) and rank customers by Uplift / Top-Decile Lift rather than raw accuracy.',
        productionPitfall: 'Including a `cancellation_email_sent` feature causes 99% offline AUC and 0% real-world value (target leakage).',
        pythonSnippet: `# Rank top 10% highest risk accounts for targeted retention outreach\ntop_decile = df.assign(p=probs).nlargest(int(len(df) * 0.1), "p")`
      },
      {
        id: 't16-credit-risk',
        title: 'Credit Risk Classification',
        explanation: 'Regulated Probability-of-Default (PD) modeling requiring monotonic constraints, calibrated probabilities, Weight-of-Evidence (WoE) features, and Adverse Action SHAP reason codes.',
        analogy: 'A bank underwriter who must not only decide whether to approve a loan, but legally explain the exact top 3 reasons for any decline.',
        technicalDetail: 'Use XGBoost/LightGBM with `monotone_constraints`, evaluate KS-statistic + Brier Score + Disparate Impact fairness across protected classes.',
        productionPitfall: 'Deploying an uncalibrated black-box model violates lending regulations (ECOA/FCRA) and misprices expected loss `EL = PD × LGD × EAD`.',
        pythonSnippet: `model = LGBMClassifier(monotone_constraints=[-1, 1, -1])  # higher income -> lower default risk`
      },
      {
        id: 't16-spam',
        title: 'Spam Detection System',
        explanation: 'Low-latency text + sender-reputation classification filtering malicious/unwanted messages with ultra-low false positive tolerance so genuine invoices are never blocked.',
        analogy: 'A strict nightclub bouncer who must block troublemakers while never accidentally turning away VIP guests.',
        technicalDetail: 'Combine TF-IDF character n-grams (catches obfuscation like "fr33 m0ney") + domain metadata + LightGBM/DistilBERT with threshold tuned to Precision ≥ 99.5%.',
        productionPitfall: 'Optimizing F1 equally weights false positives and false negatives—blocking 2% of legitimate user emails destroys product trust.',
        pythonSnippet: `vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=50000)`
      },
      {
        id: 't16-fraud',
        title: 'Fraud Detection System',
        explanation: 'Sub-50ms real-time transaction scoring under extreme class imbalance (0.1% fraud) combining streaming velocity features, graph device-sharing signals, and cost-sensitive thresholds.',
        analogy: 'A card-network radar spotting that a card swiped in New York was somehow used in Tokyo 4 minutes later.',
        technicalDetail: 'Compute online velocity aggregations (txns in last 5m/1h) via Redis/Flink, evaluate PR-AUC + Recall@1%FPR, and handle 30–60 day chargeback label delay.',
        productionPitfall: 'Using SMOTE on real-time fraud breaks probability calibration—prefer class weighting + focal loss + isotonic calibration.',
        pythonSnippet: `# Cost-sensitive decision: block if P(fraud) * amount > false_decline_cost\nshould_block = (p_fraud * tx_amount) > 18.0`
      },
      {
        id: 't16-recsys',
        title: 'Recommendation Engine',
        explanation: 'Two-stage retrieval + ranking architecture: Candidate Generation (Two-Tower Neural / ALS Collaborative Filtering + ANN) narrows millions of items to 200, then a Deep/GBDT Ranker orders Top-10.',
        analogy: 'A librarian grabbing 20 relevant books from 5 million shelves (retrieval), then picking the exact top 5 for your mood tonight (ranking).',
        technicalDetail: 'Evaluate offline with NDCG@10 and Recall@100 using temporal leave-last-out splits; handle cold-start items via content embeddings and exploration bandits.',
        productionPitfall: 'Optimizing purely for click-through rate (CTR) promotes clickbait—combine multi-objective rewards (watch time, purchase, diversity).',
        pythonSnippet: `# Two-tower dot product retrieval score: score(u, i) = dot(user_emb, item_emb)`
      },
      {
        id: 't16-stock',
        title: 'Stock Price Forecasting',
        explanation: 'Financial time-series modeling of returns/volatility using strict Walk-Forward Expanding-Window validation, stationary log-returns, and realistic transaction-cost backtesting.',
        analogy: 'Weather forecasting for markets—predicting probability distributions and risk regimes rather than claiming crystal-ball price certainty.',
        technicalDetail: 'Predict log-returns `ln(P_t / P_{t-1})` (stationary) rather than raw prices; evaluate Sharpe Ratio, Max Drawdown, and Directional Accuracy after slippage.',
        productionPitfall: 'Scaling features across the full series or using random K-Fold creates dazzling fake backtests that lose money immediately on live markets.',
        pythonSnippet: `from sklearn.model_selection import TimeSeriesSplit\ntscv = TimeSeriesSplit(n_splits=5, gap=5)  # embargo gap prevents autocorrelation leakage`
      },
      {
        id: 't16-segmentation',
        title: 'Customer Segmentation',
        explanation: 'Unsupervised clustering (RFM features + Standardization + K-Means/GMM/UMAP) grouping customers into actionable personas (Champions, At-Risk, Bargain Hunters).',
        analogy: 'Grouping grocery shoppers into weekly family planners, quick lunch grabbers, and bulk buyers to tailor promotions.',
        technicalDetail: 'Log-transform skewed spend features, standardize, select `K` via Silhouette + business actionability, and track cluster stability over time.',
        productionPitfall: 'Creating 18 statistically neat clusters that marketing teams cannot operationally act on—3 to 6 interpretable personas win in production.',
        pythonSnippet: `rfm_scaled = StandardScaler().fit_transform(np.log1p(rfm[["recency", "frequency", "monetary"]]))`
      },
      {
        id: 't16-img-cls',
        title: 'Image Classification System',
        explanation: 'End-to-end visual inspection pipeline: stratified split, Transfer Learning (ConvNeXt/ViT), Grad-CAM error auditing, ONNX FP16 export, and FastAPI image endpoint.',
        analogy: 'A factory camera inspecting circuit boards at 60 frames/sec and highlighting exact solder defects.',
        technicalDetail: 'Include an Out-of-Distribution (OOD) / "unknown" confidence threshold so blurry or unrelated photos route to human review instead of confident guesses.',
        productionPitfall: 'Duplicate burst photos split across train and validation inflate accuracy to 99%—group splits by capture session/product ID.',
        pythonSnippet: `# Reject low-confidence / OOD inputs to human review queue\nverdict = pred_class if max_prob >= 0.80 else "HUMAN_REVIEW"`
      },
      {
        id: 't16-face-rec',
        title: 'Facial Recognition System',
        explanation: 'Metric-learning verification pipeline: Face Detection (RetinaFace) -> Landmark Alignment -> ArcFace Embedding (`512-d`) -> Cosine Similarity threshold + liveness anti-spoofing.',
        analogy: 'Converting a face geometry into a unique 512-number fingerprint so you verify identity without retraining for every new person.',
        technicalDetail: 'Trained with Additive Angular Margin Loss (ArcFace) for hyperspherical separation; evaluate FAR/FRR ROC curves across demographic subgroups for fairness.',
        productionPitfall: 'Treating face recognition as closed-set N-way classification fails whenever a new user signs up—always use open-set embedding similarity + privacy consent.',
        pythonSnippet: `is_match = float(np.dot(emb_live, emb_enrolled)) >= 0.62  # L2-normalized ArcFace vectors`
      },
      {
        id: 't16-chatbot',
        title: 'AI Chatbot',
        explanation: 'Production conversational assistant with sliding-window + summary memory, SSE token streaming, typed tool calls, PII redaction, and automated safety/quality evals.',
        analogy: 'A knowledgeable concierge with a notepad for conversation context, a phone to check live bookings, and strict privacy rules.',
        technicalDetail: 'Persist turn history in Postgres/Redis keyed by `session_id`, compress older turns once token budget hits 70%, and stream tokens via Server-Sent Events for sub-400ms TTFT.',
        productionPitfall: 'Appending infinite raw chat history blows past context windows, balloons API bills quadratically, and degrades instruction adherence.',
        pythonSnippet: `# Bounded conversation memory: keep system + rolling summary + last 6 verbatim turns\ncontext = [system_msg, summary_msg, *history[-12:]]`
      },
      {
        id: 't16-rag-assistant',
        title: 'RAG-Based Knowledge Assistant',
        explanation: 'Enterprise grounded Q&A system combining document ingestion, semantic chunking, Hybrid Vector+BM25 search, cross-encoder reranking, inline citations, and RAGAS faithfulness evals.',
        analogy: 'An internal research analyst who reads only approved company manuals and attaches clickable page citations to every sentence.',
        technicalDetail: 'Track Retrieval Recall@5 separately from Answer Faithfulness so you know immediately whether a bad answer came from the retriever or the LLM generator.',
        productionPitfall: 'Ignoring document updates/deletions leaves stale policy chunks in the vector index—wire incremental CDC sync + tombstones.',
        pythonSnippet: `# Separate RAG failure modes: eval(retrieval_recall@5) AND eval(answer_faithfulness)`
      },
      {
        id: 't16-anomaly',
        title: 'Real-Time Anomaly Detection',
        explanation: 'Streaming outlier engine ingesting Kafka telemetry (IoT sensors, server latency, payments) using rolling z-scores, Isolation Forests, or Autoencoder reconstruction error with alert deduplication.',
        analogy: 'A hospital heart monitor that distinguishes a true arrhythmia from a sensor wire wiggle.',
        technicalDetail: 'Use stateful sliding windows (Flink/Kafka Streams), dynamic seasonality baselines (Monday 9am != Sunday 3am), and alert cooldowns to prevent PagerDuty fatigue.',
        productionPitfall: 'Using a single static threshold triggers storms during predictable traffic peaks and misses silent drops during quiet hours.',
        pythonSnippet: `is_anomaly = abs(val - rolling_median) / (1.4826 * rolling_mad + 1e-6) > 4.0`
      },
      {
        id: 't16-e2e-platform',
        title: 'End-to-End ML Deployment Platform',
        explanation: 'Flagship portfolio capstone unifying DVC/Iceberg versioned data -> Kubeflow/Prefect training DAG -> MLflow Registry -> Docker/K8s FastAPI + ONNX serving -> Prometheus/PSI drift monitor -> automated retrain loop.',
        analogy: 'Building the entire self-driving factory—not just one engine part—from raw data intake to monitored cloud production.',
        technicalDetail: 'Demonstrates full-lifecycle ownership: Terraform IaC, GitHub Actions CI/CD, shadow canary rollout, SLO dashboards, and documented incident runbooks.',
        productionPitfall: 'Stopping at a Jupyter notebook with 94% accuracy—senior ML interviews probe serving latency, rollback plans, drift recovery, and cloud unit economics.',
        pythonSnippet: `# Complete E2E lifecycle:\n# data(DVC) -> train(CI/CT) -> registry(MLflow) -> serve(FastAPI/Docker/K8s) -> monitor(PSI/p99)`
      }
    ],
    mermaidDfd: `flowchart LR
  BIZ["1. Business KPI & Leak-Free Split"] --> FEAT["2. Feature Pipeline + Baseline"]
  FEAT --> TRAIN["3. Tuned Model + Explainability (SHAP)"]
  TRAIN --> SERVE["4. Containerized API (FastAPI + ONNX)"]
  SERVE --> MON["5. Drift Telemetry + Automated Retrain"]`,
    dfdNodeLabels: { BIZ: 'KPI & Split', FEAT: 'Features', TRAIN: 'Model + SHAP', SERVE: 'API Serving', MON: 'Live Monitor' },
    dfdSteps: [
      { step: 1, nodeId: 'BIZ', title: 'Problem Framing & Split Contract', description: 'Translate business ROI into ML metric (PR-AUC/MAE/NDCG) and lock temporal/group split.', payload: { split: 'temporal_asof', primary_kpi: 'PR-AUC + Expected $', leakage_tests: 'PASS' } },
      { step: 2, nodeId: 'TRAIN', title: 'Baseline -> Tuned -> Calibrated', description: 'Beat simple baseline, calibrate probabilities, and verify slice fairness + SHAP.', payload: { baseline_lift: '+14.2%', brier: 0.041, shap_verified: true } },
      { step: 3, nodeId: 'SERVE', title: 'Production API & Canary Rollout', description: 'Serve quantized model via Docker + FastAPI with /readyz and 10% shadow traffic.', payload: { p99_ms: 19.2, container_mb: 310, canary: '10%' } },
      { step: 4, nodeId: 'MON', title: 'Closed-Loop Production Operations', description: 'Monitor PSI drift, delayed ground-truth labels, and unit cost per 1M predictions.', payload: { psi: 0.06, uptime: '99.96%', roi_positive: true } }
    ],
    simTitle: 'Production ML Capstone Readiness & Business ROI Simulator',
    simSubtitle: 'Configure project rigor (leak-free splits, calibration, serving optimization, and drift monitoring) to audit production readiness and annual ROI.',
    simControls: [
      { id: 'monthlyTxK', label: 'Monthly Scored Events (Thousands)', type: 'slider', min: 50, max: 2000, step: 50, unit: 'k/mo', defaultValue: 500 },
      { id: 'leakFree', label: 'Enforce Temporal/Group Split + Feature Skew Tests', type: 'toggle', defaultValue: true },
      { id: 'calibrated', label: 'Calibrate Thresholds for Business Cost Matrix', type: 'toggle', defaultValue: true },
      { id: 'monitored', label: 'Deploy CI/CD + Drift Monitoring + Rollback', type: 'toggle', defaultValue: true }
    ],
    runSim: vals => {
      const volK = nVal(vals.monthlyTxK, 500)
      const leakFree = bVal(vals.leakFree, true)
      const calibrated = bVal(vals.calibrated, true)
      const monitored = bVal(vals.monitored, true)
      const readiness = (leakFree ? 35 : 8) + (calibrated ? 30 : 10) + (monitored ? 35 : 5)
      const prodLiftPct = Number(((leakFree ? 11.5 : -2.5) + (calibrated ? 6.2 : 0.8) + (monitored ? 4.3 : -4.0)).toFixed(1))
      const annualImpactK = Math.round(volK * 0.14 * (prodLiftPct / 10))
      const incidentRisk = Math.max(4, 88 - readiness)
      const health = readiness >= 85 ? 'optimal' : readiness >= 55 ? 'tradeoff' : 'breaking'
      return {
        health,
        headline: readiness >= 85
          ? `Production-Grade Capstone (${readiness}/100): +${prodLiftPct}% verified business lift (~$${annualImpactK.toLocaleString()}k/yr value)`
          : `Notebook-Only Risk (${readiness}/100): ${incidentRisk}% outage/decay risk — fix leakage, calibration, or monitoring`,
        explanation: `Real-world ML value is captured only when leak-free validation, cost-calibrated decision thresholds, and continuous drift monitoring work together.`,
        kpis: [
          { label: 'Readiness Score', value: `${readiness}/100`, sub: 'Senior Architect Audit', status: health },
          { label: 'Verified Prod Lift', value: `${prodLiftPct >= 0 ? '+' : ''}${prodLiftPct}%`, sub: 'After live deployment', status: prodLiftPct >= 12 ? 'optimal' : prodLiftPct > 0 ? 'tradeoff' : 'breaking' },
          { label: 'Est. Annual Impact', value: `${annualImpactK >= 0 ? '+' : ''}$${annualImpactK.toLocaleString()}k`, sub: `${volK}k events/mo`, status: annualImpactK > 200 ? 'optimal' : annualImpactK > 0 ? 'tradeoff' : 'breaking' },
          { label: 'Silent Failure Risk', value: `${incidentRisk}%`, sub: monitored ? 'Guarded by MLOps' : 'Blind in prod', status: incidentRisk <= 15 ? 'optimal' : incidentRisk <= 45 ? 'tradeoff' : 'breaking' }
        ],
        bars: [
          { label: 'Production Readiness', pct: readiness, display: `${readiness}/100`, tone: readiness >= 85 ? 'positive' : readiness >= 55 ? 'warning' : 'danger' },
          { label: 'Silent Failure Exposure', pct: incidentRisk, display: `${incidentRisk}%`, tone: incidentRisk <= 15 ? 'positive' : 'danger' },
          { label: 'Portfolio Seniority Signal', pct: Math.min(100, readiness + 4), display: readiness >= 85 ? 'Staff/Senior' : 'Prototype', tone: readiness >= 85 ? 'positive' : 'warning' }
        ]
      }
    },
    playgroundTitle: 'Live Cost-Sensitive Fraud & Churn Threshold Optimizer Sandbox',
    playgroundTask: 'Optimize the exact business decision threshold over predicted probabilities to maximize net dollars saved instead of arbitrary 0.50 accuracy.',
    executableCode: `// Track 16 — Capstone Cost-Sensitive Fraud Threshold Optimizer
const txns = [
  { id: "t1", amount: 850, prob: 0.88, fraud: 1 },
  { id: "t2", amount: 420, prob: 0.34, fraud: 1 },
  { id: "t3", amount: 120, prob: 0.29, fraud: 0 },
  { id: "t4", amount: 950, prob: 0.18, fraud: 1 },
  { id: "t5", amount: 60,  prob: 0.12, fraud: 0 },
  { id: "t6", amount: 300, prob: 0.05, fraud: 0 }
];
const falseDeclinePenalty = 25; // customer friction cost

function evaluateThreshold(t) {
  let saved = 0, missed = 0, falsePenalty = 0;
  for (const x of txns) {
    const blocked = x.prob >= t;
    if (blocked && x.fraud === 1) saved += x.amount;
    if (!blocked && x.fraud === 1) missed += x.amount;
    if (blocked && x.fraud === 0) falsePenalty += falseDeclinePenalty;
  }
  return { t, netValue: saved - missed - falsePenalty, saved, missed, falsePenalty };
}

const default50 = evaluateThreshold(0.50);
const best = [0.15, 0.20, 0.30, 0.40, 0.50].map(evaluateThreshold).sort((a, b) => b.netValue - a.netValue)[0];

console.log("[Default t=0.50] Net Value: $" + default50.netValue, "| Missed Fraud: $" + default50.missed);
console.log("[Optimized t=" + best.t + "] Net Value: $" + best.netValue, "| Saved: $" + best.saved, "| FP Cost: $" + best.falsePenalty);

assert(best.netValue > default50.netValue, "Cost-calibrated threshold outperformed naive t=0.50 cutoff");
emitMetric("Optimal Cutoff", "t = " + best.t, "vs default 0.50", "optimal");
emitMetric("Net Value Lift", "+$" + (best.netValue - default50.netValue), "Business ROI gain", "optimal");
emitArtifact("Threshold ROI Audit", { default50, optimized: best });`,
    pythonReference: `# Cost-sensitive decision threshold optimization\n# Block transaction if expected fraud loss (p * amount) > false_decline_cost\nexpected_net = lambda t: sum((x.amt if x.y else -25) for x in txns if x.p >= t)`
  }
]
