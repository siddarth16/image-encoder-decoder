import React, { useState } from 'react';
import Head from 'next/head';
import EncryptTab from '@/components/EncryptTab';
import DecryptTab from '@/components/DecryptTab';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt');

  return (
    <>
      <Head>
        <title>Encrypted Image-to-Text Converter</title>
        <meta name="description" content="Lossless, key-protected image encryption" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ width: '100%', maxWidth: '700px' }}>
        <div className="neu-card">
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 300,
              textAlign: 'center',
              marginBottom: '40px',
              color: 'var(--text-primary)',
              textShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
            }}
          >
            Encrypted Image-to-Text Converter
          </h1>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '32px',
              padding: '8px',
              background: 'var(--bg-base)',
              borderRadius: 'calc(var(--radius) / 2)',
              boxShadow:
                'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)',
            }}
          >
            <button
              className={`neu-tab ${activeTab === 'encrypt' ? 'active' : ''}`}
              onClick={() => setActiveTab('encrypt')}
              style={{ flex: 1 }}
            >
              Encrypt
            </button>
            <button
              className={`neu-tab ${activeTab === 'decrypt' ? 'active' : ''}`}
              onClick={() => setActiveTab('decrypt')}
              style={{ flex: 1 }}
            >
              Decrypt
            </button>
          </div>

          {activeTab === 'encrypt' ? <EncryptTab /> : <DecryptTab />}

          <p
            style={{
              marginTop: '32px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            No files retained by default. All processing happens server-side.
          </p>
        </div>
      </main>
    </>
  );
}
