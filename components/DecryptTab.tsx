import React, { useState, useRef } from 'react';

export default function DecryptTab() {
  const [eitxtContent, setEitxtContent] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    try {
      const text = await file.text();
      setEitxtContent(text);
      setError('');
      setSuccess('');
    } catch (err) {
      setError('Failed to read file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDecrypt = async () => {
    if (!eitxtContent || !passphrase) {
      setError('Please provide both the encrypted text and passphrase');
      return;
    }

    setLoading(true);
    setProgress(10);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('eitxt', eitxtContent);
      formData.append('passphrase', passphrase);

      setProgress(30);

      const response = await fetch('/api/decrypt', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Decryption failed');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'decrypted-image';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProgress(100);
      setSuccess('Decryption successful! File downloaded.');

      // Reset form
      setTimeout(() => {
        setEitxtContent('');
        setPassphrase('');
        setProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* EITXT Input */}
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
          Encrypted Text (.eitxt)
        </label>
        <div
          className={`neu-dropzone ${eitxtContent ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: '12px' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".eitxt,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {eitxtContent ? 'File loaded' : 'Click or drag .eitxt file here'}
          </p>
        </div>
        <textarea
          className="neu-input"
          placeholder="Or paste encrypted text here"
          value={eitxtContent}
          onChange={(e) => setEitxtContent(e.target.value)}
          rows={6}
          style={{
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.5',
          }}
        />
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
          placeholder="Enter your passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
      </div>

      {/* Progress */}
      {loading && (
        <div>
          <div className="neu-progress">
            <div className="neu-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Decrypting... {progress}%
          </p>
        </div>
      )}

      {/* Messages */}
      {error && <div className="neu-message error">{error}</div>}
      {success && <div className="neu-message success">{success}</div>}

      {/* Submit Button */}
      <button
        className="neu-button"
        onClick={handleDecrypt}
        disabled={loading || !eitxtContent || !passphrase}
        style={{ width: '100%', fontSize: '16px', padding: '16px' }}
      >
        {loading ? 'Decrypting...' : 'Decrypt Image'}
      </button>
    </div>
  );
}
