import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', background: '#1e293b', color: 'white', minHeight: '100vh' }}>
                    <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                        <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>Click for error details</summary>
                        <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                            <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
                            <p><strong>Stack:</strong></p>
                            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
