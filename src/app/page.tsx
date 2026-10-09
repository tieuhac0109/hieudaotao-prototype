'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import { AnalyzeDocumentResult, AnswerabilityState } from '@/lib/ai/types';

const SAMPLE_QUESTIONS = [
  'Theo quy chế này, điều kiện để sinh viên được công nhận tốt nghiệp là gì?',
  'Quy định về việc cảnh báo kết quả học tập và buộc thôi học như thế nào?',
  'Thời gian đào tạo tiêu chuẩn và thời gian tối đa để hoàn thành chương trình là bao lâu?',
];

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSampleLoaded, setIsSampleLoaded] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [result, setResult] = useState<AnalyzeDocumentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Only text-based PDF files are supported.');
        return;
      }
      setSelectedFile(file);
      setIsSampleLoaded(false);
      setErrorMessage(null);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Only text-based PDF files are supported.');
        return;
      }
      setSelectedFile(file);
      setIsSampleLoaded(false);
      setErrorMessage(null);
      setResult(null);
    }
  };

  const handleLoadSamplePdf = async () => {
    try {
      setErrorMessage(null);
      const res = await fetch('/sample-docs/quy-che-dao-tao-mau.pdf');
      if (!res.ok) throw new Error('Could not load sample PDF.');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'quy-che-dao-tao-mau.pdf', { type: 'application/pdf' });
      setSelectedFile(sampleFile);
      setIsSampleLoaded(true);
      setQuestion(SAMPLE_QUESTIONS[0]);
      setResult(null);
    } catch {
      setErrorMessage('Failed to load sample document. Please upload a local PDF file.');
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setIsSampleLoaded(false);
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select or upload a regulation PDF.');
      return;
    }
    if (!question.trim() || question.trim().length < 3) {
      setErrorMessage('Please enter a substantive policy question.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    setCurrentStep(1);

    // Progression animation
    const timer1 = setTimeout(() => setCurrentStep(2), 500);
    const timer2 = setTimeout(() => setCurrentStep(3), 1200);
    const timer3 = setTimeout(() => setCurrentStep(4), 2200);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('question', question.trim());

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze document.');
      }

      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsLoading(false);
    }
  };

  const renderAnswerabilityBadge = (state: AnswerabilityState) => {
    switch (state) {
      case 'supported':
        return (
          <span className="badge badge-supported">
            <span>✓</span> SUPPORTED BY DOCUMENT
          </span>
        );
      case 'partial':
        return (
          <span className="badge badge-partial">
            <span>⚠</span> PARTIALLY SUPPORTED
          </span>
        );
      case 'not_supported':
        return (
          <span className="badge badge-not-supported">
            <span>✕</span> NOT SUPPORTED BY DOCUMENT
          </span>
        );
    }
  };

  return (
    <div className={styles.main}>
      {/* 1. Header */}
      <header className={styles.header}>
        <div className={`container ${styles.navWrap}`}>
          <div className={styles.brandGroup}>
            <a href="#top" className={styles.brandLink} aria-label="HieuDaoTao Prototype">
              <Image
                src="/brand/logo.svg"
                alt="HieuDaoTao"
                width={150}
                height={32}
                className={styles.brandLogo}
                priority
              />
            </a>
            <div className={styles.brandDivider} aria-hidden="true" />
            <span className={styles.subTitle}>Academic Policy Intelligence</span>
          </div>

          <div className={styles.headerActions}>
            <span className="badge badge-prototype">Prototype V1</span>
            <div className={styles.providerBadge} title="Active Provider is configured server-side">
              <span className={styles.dotActive} />
              <span>Provider-Agnostic Core</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Hero Context */}
      <section className={styles.heroIntro}>
        <div className="container">
          <div className={styles.heroEyebrow}>
            <span>◎</span> Higher Education Policy Reasoning
          </div>
          <h1 className={styles.heroTitle}>
            Source-grounded policy intelligence for higher education.
          </h1>
          <p className={styles.heroLead}>
            Analyze Vietnamese academic regulations, extract verified clause-level citations, and review
            AI-synthesized interpretations with verifiable source evidence.
          </p>

          <div className={styles.pipelineStrip}>
            <span className={styles.pipeItem}>Academic regulation PDF</span>
            <span className={styles.pipeArrow}>→</span>
            <span className={styles.pipeItem}>Document extraction</span>
            <span className={styles.pipeArrow}>→</span>
            <span className={styles.pipeItemActive}>AI reasoning</span>
            <span className={styles.pipeArrow}>→</span>
            <span className={styles.pipeItem}>Verified quotes</span>
            <span className={styles.pipeArrow}>→</span>
            <span className={styles.pipeItem}>Human verification</span>
          </div>
        </div>
      </section>

      {/* 3. Main Workspace */}
      <main className={styles.workspaceSection}>
        <div className={`container ${styles.workspaceGrid}`}>
          {/* Left Column: Input Form */}
          <div className={styles.panelCard}>
            {/* Upload Block */}
            <div className={styles.cardBlock}>
              <div className={styles.blockHeader}>
                <label className={styles.blockLabel} htmlFor="pdfFileInput">
                  1. Regulation Document (PDF)
                </label>
                {!selectedFile && (
                  <button
                    type="button"
                    onClick={handleLoadSamplePdf}
                    className={styles.sampleLoadBtn}
                  >
                    Load sample regulation
                  </button>
                )}
              </div>

              <input
                type="file"
                id="pdfFileInput"
                ref={fileInputRef}
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {!selectedFile ? (
                <div
                  className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <div className={styles.dropIcon}>📄</div>
                  <p className={styles.dropText}>Click or drag & drop regulation PDF</p>
                  <p className={styles.dropHint}>Text-based PDF only (max 10MB) · OCR not in V1</p>
                </div>
              ) : (
                <div className={styles.fileActiveCard}>
                  <div className={styles.fileInfo}>
                    <span className={styles.pdfIconBadge}>PDF</span>
                    <div className={styles.fileText}>
                      <span className={styles.fileName}>{selectedFile.name}</span>
                      <span className={styles.fileMeta}>
                        {(selectedFile.size / 1024).toFixed(1)} KB
                        {isSampleLoaded ? ' · Sample Regulation Document' : ' · Ready for analysis'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="btn btn-outline btn-sm"
                    title="Change document"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Question Block */}
            <div className={styles.cardBlock}>
              <div className={styles.blockHeader}>
                <label className={styles.blockLabel} htmlFor="policyQuestion">
                  2. Question
                </label>
              </div>

              <textarea
                id="policyQuestion"
                className={styles.textarea}
                placeholder="Theo quy chế này, điều kiện để sinh viên được công nhận tốt nghiệp là gì?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
              />

              <div className={styles.sampleQueries}>
                <span className={styles.sampleQueriesTitle}>Suggested queries:</span>
                {SAMPLE_QUESTIONS.map((sq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.queryChip}
                    onClick={() => setQuestion(sq)}
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actionRow}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isLoading || !selectedFile || !question.trim()}
                style={{ flex: 1 }}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner} />
                    <span>Analyzing document...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze document</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>

            {/* Data Handling Notice */}
            <div className={styles.dataNotice}>
              <strong>Data handling disclosure:</strong> Uploaded documents are processed in-memory
              by the configured AI provider to generate analysis. Do not upload confidential or sensitive
              documents during this prototype phase.
            </div>
          </div>

          {/* Right Column: Output Presentation */}
          <div className={styles.resultPanel}>
            {/* Error Display */}
            {errorMessage && (
              <div className={styles.errorBox} role="alert">
                <p className={styles.errorTitle}>Analysis Request Failed</p>
                <p className={styles.errorDesc}>{errorMessage}</p>
              </div>
            )}

            {/* Loading Stepper */}
            {isLoading && (
              <div className={styles.stepperCard} aria-live="polite">
                <div className={styles.stepperHead}>
                  <strong style={{ color: 'var(--text-bright)', fontSize: 14 }}>
                    Workflow Execution in Progress
                  </strong>
                  <span className={styles.spinner} />
                </div>
                <div className={styles.stepperSteps}>
                  <div className={styles.stepRow}>
                    <span className={`${styles.stepDot} ${currentStep >= 1 ? styles.stepDotActive : ''}`}>
                      1
                    </span>
                    <span style={{ color: currentStep >= 1 ? 'var(--text-bright)' : 'var(--muted)' }}>
                      Extracting text & preserving page boundaries
                    </span>
                  </div>
                  <div className={styles.stepRow}>
                    <span className={`${styles.stepDot} ${currentStep >= 2 ? styles.stepDotActive : ''}`}>
                      2
                    </span>
                    <span style={{ color: currentStep >= 2 ? 'var(--text-bright)' : 'var(--muted)' }}>
                      Ingesting institutional provisions & article structure
                    </span>
                  </div>
                  <div className={styles.stepRow}>
                    <span className={`${styles.stepDot} ${currentStep >= 3 ? styles.stepDotActive : ''}`}>
                      3
                    </span>
                    <span style={{ color: currentStep >= 3 ? 'var(--text-bright)' : 'var(--muted)' }}>
                      Performing grounded reasoning & citation extraction
                    </span>
                  </div>
                  <div className={styles.stepRow}>
                    <span className={`${styles.stepDot} ${currentStep >= 4 ? styles.stepDotActive : ''}`}>
                      4
                    </span>
                    <span style={{ color: currentStep >= 4 ? 'var(--text-bright)' : 'var(--muted)' }}>
                      Verifying quoted passages against document text
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty Idle State */}
            {!isLoading && !result && !errorMessage && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⚖️</div>
                <h3 className={styles.emptyTitle}>Ready for Policy Analysis</h3>
                <p className={styles.emptyDesc}>
                  Upload an academic regulation PDF and ask a question. The prototype will return a
                  structured answer with clause citations verified against the original text.
                </p>
              </div>
            )}

            {/* Result Presentation */}
            {!isLoading && result && (
              <div className={styles.resultCard}>
                {/* Result Header & Metadata */}
                <div className={styles.resultHeader}>
                  <div className={styles.statusGroup}>
                    {renderAnswerabilityBadge(result.answerability)}
                  </div>

                  <div className={styles.metaGroup}>
                    <span>
                      Provider: <strong>{result.provider === 'vertex' ? 'Vertex AI' : result.provider}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Model: <strong>{result.model}</strong>
                    </span>
                    {result.metadata && (
                      <>
                        <span>·</span>
                        <span>{result.metadata.pageCount} Pages</span>
                        <span>·</span>
                        <span>{(result.metadata.processingTimeMs / 1000).toFixed(2)}s</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 1. Answer */}
                <div className={styles.answerBlock}>
                  <h3 className={styles.sectionHeading}>
                    <span>✦</span> Answer
                  </h3>
                  <div className={styles.answerBody}>{result.answer}</div>

                  {result.warnings && result.warnings.length > 0 && (
                    <div className={styles.warningBox}>
                      <strong>Important notices:</strong>
                      <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                        {result.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 2. Supporting Evidence */}
                <div className={styles.evidenceSection}>
                  <div className={styles.evidenceHeader}>
                    <h3 className={styles.sectionHeading}>
                      <span>§</span> Supporting evidence ({result.evidence.length})
                    </h3>
                    <span className={styles.evidenceSub}>
                      Source passages extracted from regulation pages with automatic server-side
                      quotation verification.
                    </span>
                  </div>

                  {result.evidence.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13, fontStyle: 'italic' }}>
                      No direct supporting evidence items identified by the model.
                    </div>
                  ) : (
                    <div className={styles.evidenceList}>
                      {result.evidence.map((item, idx) => (
                        <div key={idx} className={styles.evidenceCard}>
                          <div className={styles.evidenceCardHead}>
                            <div className={styles.evidenceLocation}>
                              <span className={styles.pageChip}>Page {item.page}</span>
                              {item.section && (
                                <span className={styles.sectionName}>{item.section}</span>
                              )}
                            </div>

                            {item.verified ? (
                              <span className="badge badge-verified" title="Quotation verified verbatim against page text">
                                ✓ Verified against source
                              </span>
                            ) : (
                              <span
                                className="badge badge-unverified"
                                title="Quotation could not be matched verbatim on the specified page"
                              >
                                ⚠ Could not verify quoted passage automatically
                              </span>
                            )}
                          </div>

                          <blockquote
                            className={`${styles.quoteBox} ${
                              !item.verified ? styles.quoteBoxUnverified : ''
                            }`}
                          >
                            &ldquo;{item.quotedText}&rdquo;
                          </blockquote>

                          {item.rationale && (
                            <p className={styles.rationale}>
                              <strong>Rationale:</strong> {item.rationale}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Human Verification Mandatory Notice */}
                <div className={styles.humanVerifyBanner}>
                  <span className={styles.humanVerifyIcon}>⚠️</span>
                  <div>
                    <strong>Human verification notice:</strong> AI-assisted output. Verify all
                    conclusions against the original institutional document before operational use.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className={styles.footer}>
        <div className={`container ${styles.footerGrid}`}>
          <div>
            <strong>HieuDaoTao Prototype</strong> · Academic Policy Intelligence for Higher Education
          </div>
          <div>
            <span>Experimental Prototype · Human-in-the-loop by design</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
