import React from 'react';

const TestApp = () => {
    console.log('TestApp rendering!');
    return (
        <div style={{
            backgroundColor: '#020617',
            color: 'white',
            padding: '50px',
            minHeight: '100vh'
        }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>✅ React is Working!</h1>
            <p style={{ fontSize: '24px' }}>If you can see this, React is rendering correctly.</p>
            <p style={{ fontSize: '18px', marginTop: '20px' }}>
                Background color: #020617 (slate-950)
            </p>
        </div>
    );
};

export default TestApp;
