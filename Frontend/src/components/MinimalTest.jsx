import React from 'react';

const MinimalTest = () => {
  return (
    <div
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

      {/* Table */}
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
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MinimalTest;
