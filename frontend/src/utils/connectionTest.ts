/**
 * Connection test utilities to help diagnose network issues
 */

export const testConnection = async (): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> => {
  const startTime = Date.now();
  
  try {
    const apiUrl = process.env.REACT_APP_API_URL || (
      process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'
    );
    
    // Test basic connectivity with health endpoint
    const response = await fetch(`${apiUrl.replace('/api', '')}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Use a shorter timeout for connection test
      signal: AbortSignal.timeout(15000)
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return {
        success: true,
        latency
      };
    } else {
      return {
        success: false,
        error: `Server responded with status ${response.status}`
      };
    }
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    return {
      success: false,
      latency,
      error: error.name === 'TimeoutError' 
        ? 'Connection timeout - server may be slow or unreachable'
        : error.message || 'Network connection failed'
    };
  }
};

export const getConnectionStatus = async (): Promise<string> => {
  const result = await testConnection();
  
  if (result.success) {
    const latencyText = result.latency ? ` (${result.latency}ms)` : '';
    return `✅ Connected${latencyText}`;
  } else {
    return `❌ Connection failed: ${result.error}`;
  }
};