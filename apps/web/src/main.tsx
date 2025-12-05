import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';

console.log('Starting ChefByte Frontend...');

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        console.error('Root element not found!');
    } else {
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <QueryClientProvider client={queryClient}>
                    <App />
                </QueryClientProvider>
            </React.StrictMode>,
        );
        console.log('React app mounted successfully');
    }
} catch (error) {
    console.error('Failed to mount React app:', error);
}
