/**
 * OCR Import Dialog - Upload screenshots to extract uma data
 *
 * Note: No useCallback needed - React Compiler handles memoization automatically
 */

import { useRef, useState } from 'react';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ImageIcon,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import {
  useOcrImport,
  type UploadedFile,
} from '@/modules/runners/hooks/useOcrImport';
import type { ExtractedUmaData } from '@/modules/runners/ocr/index';

import icons from '@data/icons.json';

interface OcrImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: ExtractedUmaData) => void;
}

export function OcrImportDialog({
  open,
  onOpenChange,
  onApply,
}: OcrImportDialogProps) {
  const {
    files,
    addFiles,
    removeFile,
    results,
    isProcessing,
    progress,
    currentImageIndex,
    error,
    reset,
  } = useOcrImport();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input value to allow re-selecting same files
    e.target.value = '';
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  // Handle apply
  const handleApply = () => {
    if (results) {
      onApply(results as ExtractedUmaData);
      handleOpenChange(false);
    }
  };

  // Get status icon for file
  const getStatusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const hasResults =
    results &&
    (results.outfitId ||
      results.speed ||
      (results.skills && results.skills.length > 0));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from Screenshots</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4 min-h-[400px]">
          {/* Left Panel - File Upload */}
          <div className="w-1/2 flex flex-col gap-4">
            {/* Drop Zone */}
            <div
              className={`
                flex-1 border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-4
                transition-colors cursor-pointer
                ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-medium">Drag files here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Uploaded Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Uploaded ({files.length}{' '}
                  {files.length === 1 ? 'image' : 'images'}):
                </p>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="relative group w-16 h-16 rounded-md overflow-hidden border"
                    >
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          className="p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                          disabled={isProcessing}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 right-1">
                        {getStatusIcon(file)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Processing image {currentImageIndex + 1} of {files.length}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 flex flex-col gap-4 overflow-y-auto">
            <h3 className="font-medium">Extracted Data</h3>

            {!hasResults && !isProcessing && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ImageIcon className="w-12 h-12" />
                <p>Upload screenshots to extract data</p>
              </div>
            )}

            {(hasResults || isProcessing) && (
              <div className="space-y-4">
                {/* Uma Detected */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Uma Detected
                  </h4>
                  {results?.outfitId ? (
                    <div className="flex items-center gap-3 p-2 border rounded-md">
                      <img
                        src={icons[results.outfitId as keyof typeof icons]}
                        alt={results.umaName}
                        className="w-12 h-12 rounded"
                      />
                      <div>
                        <p className="font-medium">{results.outfitName}</p>
                        <p className="text-sm text-muted-foreground">
                          {results.umaName}
                        </p>
                      </div>
                      {results.umaConfidence < 1 && (
                        <span className="ml-auto text-xs text-yellow-600">
                          {Math.round(results.umaConfidence * 100)}% match
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="p-2 border rounded-md text-muted-foreground text-sm">
                      {isProcessing ? 'Detecting...' : 'Not detected'}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Stats
                  </h4>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    <div className="bg-primary text-primary-foreground rounded-tl p-1 text-xs">
                      SPD
                    </div>
                    <div className="bg-primary text-primary-foreground p-1 text-xs">
                      STA
                    </div>
                    <div className="bg-primary text-primary-foreground p-1 text-xs">
                      POW
                    </div>
                    <div className="bg-primary text-primary-foreground p-1 text-xs">
                      GUT
                    </div>
                    <div className="bg-primary text-primary-foreground rounded-tr p-1 text-xs">
                      WIS
                    </div>
                    <div className="border p-2 rounded-bl font-mono">
                      {results?.speed ?? '-'}
                    </div>
                    <div className="border p-2 font-mono">
                      {results?.stamina ?? '-'}
                    </div>
                    <div className="border p-2 font-mono">
                      {results?.power ?? '-'}
                    </div>
                    <div className="border p-2 font-mono">
                      {results?.guts ?? '-'}
                    </div>
                    <div className="border p-2 rounded-br font-mono">
                      {results?.wisdom ?? '-'}
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Skills ({results?.skills?.length ?? 0} found)
                  </h4>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {results?.skills && results.skills.length > 0 ? (
                      results.skills.map((skill, i) => (
                        <div
                          key={`${skill.id}-${i}`}
                          className="flex items-center justify-between p-2 border rounded text-sm"
                        >
                          <span>{skill.name}</span>
                          <span
                            className={`text-xs ${
                              skill.confidence >= 0.9
                                ? 'text-green-600'
                                : skill.confidence >= 0.8
                                  ? 'text-yellow-600'
                                  : 'text-orange-600'
                            }`}
                          >
                            {Math.round(skill.confidence * 100)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 border rounded text-muted-foreground text-sm">
                        {isProcessing ? 'Detecting...' : 'No skills detected'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Unrecognized */}
                {results?.unrecognized && results.unrecognized.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Unrecognized text ({results.unrecognized.length} lines)
                    </summary>
                    <div className="mt-2 p-2 bg-muted rounded text-xs max-h-[100px] overflow-y-auto">
                      {results.unrecognized.map((line, i) => (
                        <div key={i} className="text-muted-foreground">
                          {line}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!hasResults || isProcessing}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
