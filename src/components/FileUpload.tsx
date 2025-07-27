import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PaperClipIcon, 
  XMarkIcon,
  DocumentIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { UploadedFile } from '../types';

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB
  acceptedTypes?: string[];
}

export default function FileUpload({ 
  onFilesSelected, 
  maxFiles = 5,
  maxSizePerFile = 10,
  acceptedTypes = ['image/*', 'text/*', '.pdf', '.doc', '.docx']
}: FileUploadProps) {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList) => {
    const validFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size
      if (file.size > maxSizePerFile * 1024 * 1024) {
        alert(t('fileUpload.fileTooLarge', { fileName: file.name, maxSize: maxSizePerFile }));
        continue;
      }

      // Check file count
      if (validFiles.length + selectedFiles.length >= maxFiles) {
        alert(t('fileUpload.tooManyFiles', { maxFiles }));
        break;
      }

      try {
        const uploadedFile: UploadedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file)
        };

        // Read text content for text files
        if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
          const content = await readFileAsText(file);
          uploadedFile.content = content;
        }

        validFiles.push(uploadedFile);
      } catch (error) {
        console.error('Error processing file:', error);
        alert(t('fileUpload.fileError', { fileName: file.name }));
      }
    }

    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = selectedFiles.filter(f => f.id !== fileId);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <PhotoIcon className="w-4 h-4" />;
    }
    return <DocumentIcon className="w-4 h-4" />;
  };

  return (
    <div className="file-upload">
      {/* File Input Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="btn-icon"
        title={t('fileUpload.selectFiles')}
      >
        <PaperClipIcon className="w-4 h-4" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Drag and Drop Zone */}
      {dragActive && (
        <div
          className="fixed inset-0 bg-blue-50 bg-opacity-75 z-50 flex items-center justify-center"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="bg-white border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
            <PaperClipIcon className="w-12 h-12 mx-auto text-blue-400 mb-4" />
            <p className="text-lg font-medium text-blue-600">
              {t('fileUpload.dropFiles')}
            </p>
          </div>
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mt-2 space-y-2">
          {selectedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drag Event Listeners */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className="fixed inset-0 pointer-events-none z-40"
      />
    </div>
  );
}