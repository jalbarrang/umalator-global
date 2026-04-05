import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import { RotateCcw, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { CanvasTransform, OcrMaskType } from '@/modules/runners/components/ocr/types';
import { useMaskCompositor } from '@/modules/runners/components/ocr/use-mask-compositor';

interface MaskCanvasEditorProps {
  maskType: OcrMaskType;
  onProcess: (composited: Blob) => void;
  processLabel?: string;
  externalBusy?: boolean;
  className?: string;
}

type MaskWindow = {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_TRANSFORM: CanvasTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

const MIN_SCALE = 0.2;
const MAX_SCALE = 4.0;

const MASK_WINDOWS: Record<OcrMaskType, MaskWindow[]> = {
  'full-details-own': [
    { label: 'Uma Name', x: 300, y: 120, width: 900, height: 200 },
    { label: 'Stats', x: 50, y: 380, width: 1190, height: 120 },
    { label: 'Skills', x: 50, y: 620, width: 1190, height: 1400 },
  ],
  'full-details-other': [
    { label: 'Uma Name', x: 300, y: 120, width: 900, height: 200 },
    { label: 'Stats', x: 50, y: 380, width: 1190, height: 120 },
    { label: 'Skills', x: 50, y: 620, width: 1190, height: 1400 },
  ],
  'skills-only': [{ label: 'Skills', x: 50, y: 50, width: 1190, height: 1400 }],
};

type DragState = {
  pointerId: number;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createFitTransform(
  sourceImage: HTMLImageElement,
  maskWidth: number,
  maskHeight: number,
): CanvasTransform {
  const fitScale = Math.min(
    maskWidth / sourceImage.naturalWidth,
    maskHeight / sourceImage.naturalHeight,
  );

  return {
    scale: fitScale,
    x: (maskWidth - sourceImage.naturalWidth * fitScale) / 2,
    y: (maskHeight - sourceImage.naturalHeight * fitScale) / 2,
  };
}

function drawWindowLabels(context: CanvasRenderingContext2D, maskType: OcrMaskType): void {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '600 38px sans-serif';
  context.fillStyle = 'rgba(255, 255, 255, 0.95)';
  context.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  context.lineWidth = 8;

  for (const window of MASK_WINDOWS[maskType]) {
    const centerX = window.x + window.width / 2;
    const centerY = window.y + window.height / 2;

    context.strokeText(window.label, centerX, centerY);
    context.fillText(window.label, centerX, centerY);
  }

  context.restore();
}

export function MaskCanvasEditor({
  maskType,
  onProcess,
  processLabel = 'Process',
  externalBusy = false,
  className,
}: Readonly<MaskCanvasEditorProps>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<CanvasTransform>(DEFAULT_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { maskImage, maskWidth, maskHeight, composeMaskedImage } = useMaskCompositor(maskType);

  useEffect(() => {
    sourceImageRef.current = sourceImage;
  }, [sourceImage]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!sourceImage || !maskWidth || !maskHeight) {
      return;
    }

    setTransform(createFitTransform(sourceImage, maskWidth, maskHeight));
  }, [sourceImage, maskWidth, maskHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !maskWidth || !maskHeight) {
      return;
    }

    canvas.width = maskWidth;
    canvas.height = maskHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, maskWidth, maskHeight);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, maskWidth, maskHeight);

    if (sourceImage) {
      context.drawImage(
        sourceImage,
        transform.x,
        transform.y,
        sourceImage.naturalWidth * transform.scale,
        sourceImage.naturalHeight * transform.scale,
      );
    }

    if (maskImage) {
      context.drawImage(maskImage, 0, 0, maskWidth, maskHeight);
    }

    drawWindowLabels(context, maskType);
  }, [maskHeight, maskImage, maskType, maskWidth, sourceImage, transform]);

  const resetTransform = () => {
    const image = sourceImageRef.current;
    if (!image || !maskWidth || !maskHeight) {
      return;
    }

    setTransform(createFitTransform(image, maskWidth, maskHeight));
  };

  const getCanvasPoint = (
    event: PointerEvent<HTMLCanvasElement> | WheelEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const loadSourceFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();

        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error(`Could not load image file: ${file.name}`));
        nextImage.src = objectUrl;
      });

      const previousUrl = objectUrlRef.current;
      objectUrlRef.current = objectUrl;

      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }

      setSourceImage(image);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      console.error('Failed to load dropped image', error);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void loadSourceFile(file);
    }

    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropTarget(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropTarget(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropTarget(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      void loadSourceFile(file);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !sourceImageRef.current) {
      return;
    }

    const point = getCanvasPoint(event);
    dragStateRef.current = {
      pointerId: event.pointerId,
      x: point.x,
      y: point.y,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const point = getCanvasPoint(event);
    const deltaX = point.x - dragState.x;
    const deltaY = point.y - dragState.y;

    dragStateRef.current = {
      ...dragState,
      x: point.x,
      y: point.y,
    };

    setTransform((previous) => ({
      ...previous,
      x: previous.x + deltaX,
      y: previous.y + deltaY,
    }));
  };

  const endDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    if (!sourceImageRef.current) {
      return;
    }

    event.preventDefault();

    const point = getCanvasPoint(event);
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);

    setTransform((previous) => {
      const nextScale = clamp(previous.scale * zoomFactor, MIN_SCALE, MAX_SCALE);
      const relativeX = (point.x - previous.x) / previous.scale;
      const relativeY = (point.y - previous.y) / previous.scale;

      return {
        scale: nextScale,
        x: point.x - relativeX * nextScale,
        y: point.y - relativeY * nextScale,
      };
    });
  };

  const handleScaleChange = (value: number | readonly number[]) => {
    const nextScale = Array.isArray(value) ? value[0] : value;
    if (!sourceImageRef.current || nextScale === undefined || !maskWidth || !maskHeight) {
      return;
    }

    setTransform((previous) => {
      const anchorX = maskWidth / 2;
      const anchorY = maskHeight / 2;
      const relativeX = (anchorX - previous.x) / previous.scale;
      const relativeY = (anchorY - previous.y) / previous.scale;

      return {
        scale: nextScale,
        x: anchorX - relativeX * nextScale,
        y: anchorY - relativeY * nextScale,
      };
    });
  };

  const handleProcess = async () => {
    const image = sourceImageRef.current;
    if (!image) {
      return;
    }

    setIsProcessing(true);

    try {
      const composited = await composeMaskedImage(image, transform);
      onProcess(composited);
    } catch (error) {
      console.error('Failed to compose masked image', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const canvasAspectRatio =
    maskWidth > 0 && maskHeight > 0
      ? `${maskWidth} / ${maskHeight}`
      : maskType === 'skills-only'
        ? '1290 / 1500'
        : '1290 / 2200';

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-md border bg-muted/20',
          isDropTarget && 'border-primary bg-primary/10',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!sourceImageRef.current) {
            fileInputRef.current?.click();
          }
        }}
      >
        <canvas
          ref={canvasRef}
          width={maskWidth || 1}
          height={maskHeight || 1}
          className={cn(
            'block h-auto w-full touch-none select-none',
            sourceImage ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer',
          )}
          style={{ aspectRatio: canvasAspectRatio }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={handleWheel}
        />

        {!sourceImage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="rounded-md border bg-background/90 px-4 py-2 text-center text-sm text-muted-foreground">
              Drop an image here or click to browse
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Scale</span>
          <span>{transform.scale.toFixed(2)}x</span>
        </div>
        <Slider
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={0.01}
          value={[transform.scale]}
          onValueChange={handleScaleChange}
          disabled={!sourceImage}
          aria-label="Canvas image scale"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Browse
        </Button>

        <Button type="button" variant="outline" onClick={resetTransform} disabled={!sourceImage}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>

        <Button
          type="button"
          onClick={handleProcess}
          disabled={!sourceImage || !maskImage || isProcessing || externalBusy}
          className="ml-auto"
        >
          {isProcessing ? 'Processing…' : processLabel}
        </Button>
      </div>
    </div>
  );
}
