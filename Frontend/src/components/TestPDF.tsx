import React from 'react';
import generatePDF, { Resolution, Margin, Options } from 'react-to-pdf';

const options: Options = {
  filename: 'pashto-test.pdf',
  method: 'save',
  resolution: Resolution.HIGH,
  page: {
    margin: Margin.SMALL,
    format: 'letter',
    orientation: 'portrait',
  },
  canvas: {
    mimeType: 'image/png',
    qualityRatio: 1,
  },
  overrides: {
    pdf: {
      compress: true,
    },
    canvas: {
      useCORS: true,
    },
  },
};

const TestPDF = () => {
  const toPDF = () => {
    generatePDF(() => document.getElementById('pdf-container'), options);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <button
        onClick={toPDF}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1rem',
          marginBottom: '2rem',
        }}
      >
        Download PDF
      </button>

      <div
        id="pdf-container"
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          fontFamily: "'Noto Nastaliq Urdu', Arial, serif",
          direction: 'rtl',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #1f2937', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>ورځنی راپور</h1>
          <p style={{ fontSize: '1.125rem' }}>۱۴۰۳/۱۲/۱۵ څخه ۱۴۰۳/۱۲/۲۰ پورې</p>
        </div>

        {/* Three Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ border: '2px solid #d1d5db', padding: '1rem', borderRadius: '0.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>ټول عواید</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>۱۵۰,۰۰۰ افغانی</p>
          </div>
          <div style={{ border: '2px solid #d1d5db', padding: '1rem', borderRadius: '0.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>ټول پیرودونه</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>۸۵,۰۰۰ افغانی</p>
          </div>
          <div style={{ border: '2px solid #d1d5db', padding: '1rem', borderRadius: '0.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>ټول لګښتونه</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>۲۵,۰۰۰ افغانی</p>
          </div>
        </div>

        {/* First Table - Customers */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #9ca3af', paddingBottom: '0.5rem' }}>
            د پیرودونکو بیلانس
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>نوم</th>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>نغدې</th>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>پور</th>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>بیلانس</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>احمد خان</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۱۵,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۵,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem', fontWeight: 'bold' }}>۱۰,۰۰۰</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>محمد علی</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۲۰,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۸,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem', fontWeight: 'bold' }}>۱۲,۰۰۰</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>عبدالله</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۱۰,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۳,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem', fontWeight: 'bold' }}>۷,۰۰۰</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Second Table - Sales */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #9ca3af', paddingBottom: '0.5rem' }}>
            پلورونه
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>نیټه</th>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>پیرودونکی</th>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>توکي</th>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>ټوله مقدار</th>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>ورکړل شوی</th>
                <th style={{ border: '1px solid #d1d5db', padding: '0.5rem', textAlign: 'right' }}>پاتې</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۱۴۰۳/۱۲/۱۵</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>احمد خان</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۵</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem', fontWeight: 'bold' }}>۲۵,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۲۰,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۵,۰۰۰</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۱۴۰۳/۱۲/۱۶</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>محمد علی</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۳</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem', fontWeight: 'bold' }}>۱۸,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۱۵,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۳,۰۰۰</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۱۴۰۳/۱۲/۱۷</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>عبدالله</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۷</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem', fontWeight: 'bold' }}>۳۵,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۳۰,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۵,۰۰۰</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۱۴۰۳/۱۲/۱۸</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>کریم جان</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۴</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem', fontWeight: 'bold' }}>۲۲,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۲۲,۰۰۰</td>
                <td style={{ border: '1px solid #d1d5db', padding: '0.5rem' }}>۰</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #d1d5db', fontSize: '0.875rem', color: '#6b7280' }}>
          <p>د چاپ نیټه: ۱۴۰۳/۱۲/۲۰</p>
        </div>
      </div>
    </div>
  );
};

export default TestPDF;
