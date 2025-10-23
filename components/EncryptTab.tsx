import React, { useState, useRef } from 'react';

interface EncryptOptions {
  compression: 'gzip' | 'none';
  chunk_bytes?: number;
}

export default function EncryptTab() {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<EncryptOptions>({
    compression: 'gzip',
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setFile(selectedFile);
    setError('');
    setSuccess('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleEncrypt = async () => {
    if (!file || !passphrase) {
      setError('Please provide both a file and passphrase');
      return;
    }

    setLoading(true);
    setProgress(10);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('passphrase', passphrase);
      formData.append('options', JSON.stringify(options));

      setProgress(30);

      const response = await fetch('/api/encrypt', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Encryption failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.eitxt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProgress(100);
      setSuccess('Encryption successful! File downloaded.');

      // Reset form
      setTimeout(() => {
        setFile(null);
        setPassphrase('');
        setProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* File Upload */}
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          Select Image
        </label>
        <div
          className={`neu-dropzone ${file ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          {file ? (
            <div>
              <p style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {file.name}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Click or drag image here
            </p>
          )}
        </div>
      </div>

      {/* Passphrase */}
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          Passphrase
        </label>
        <input
          type="password"
          className="neu-input"
          placeholder="Enter a strong passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
      </div>

      {/* Advanced Options Toggle */}
      <div>
        <button
          className="neu-button"
          onClick={() => setShowOptions(!showOptions)}
          style={{ width: '100%', fontSize: '14px', padding: '12px' }}
        >
          {showOptions ? 'Hide' : 'Show'} Advanced Options
        </button>
      </div>

      {/* Advanced Options */}
      {showOptions && (
        <div
          className="neu-inset"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              Compression
            </label>
            <select
              className="neu-input"
              value={options.compression}
              onChange={(e) =>
                setOptions({ ...options, compression: e.target.value as 'gzip' | 'none' })
              }
              style={{ cursor: 'pointer' }}
            >
              <option value="gzip">Gzip (recommended)</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div>
          <div className="neu-progress">
            <div className="neu-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Encrypting... {progress}%
          </p>
        </div>
      )}

      {/* Messages */}
      {error && <div className="neu-message error">{error}</div>}
      {success && <div className="neu-message success">{success}</div>}

      {/* Submit Button */}
      <button
        className="neu-button"
        onClick={handleEncrypt}
        disabled={loading || !file || !passphrase}
        style={{ width: '100%', fontSize: '16px', padding: '16px' }}
      >
        {loading ? 'Encrypting...' : 'Encrypt Image'}
      </button>
    </div>
  );
}
