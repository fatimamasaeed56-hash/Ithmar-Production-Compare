import { type ReactNode, lazy, Suspense } from 'react';
import { useAuth } from '@workspace/replit-auth-web';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import WelcomePage from '@/pages/welcome';
import { Shell } from '@/components/shell';
import { StoreProvider } from '@/lib/store';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';

const ComparePage = lazy(() => import('@/pages/compare'));
const SourcesPage = lazy(() => import('@/pages/sources'));

const queryClient = new QueryClient();

function Router() {
  const auth = useAuth();
  const [location, navigate] = useLocation();
  const authError = new URLSearchParams(window.location.search).get('authError');
  const welcome = (
    <WelcomePage
      isAuthenticated={auth.isAuthenticated}
      isLoading={auth.isLoading}
      error={auth.error || (authError ? 'لم يكتمل تسجيل الدخول. يمكنك المحاولة مرة أخرى.' : null)}
      onLogin={auth.login}
      onEnter={() => navigate('/compare')}
      onRetry={() => { window.history.replaceState(null, '', window.location.pathname); auth.retry(); }}
    />
  );
  const publicPage = location === '/' || location === '/welcome' || location === '/login';
  if (publicPage && !auth.isAuthenticated) return welcome;
  if (auth.isLoading) return <div dir="rtl" role="status" className="grid min-h-screen place-items-center text-primary">جارٍ التحقق من جلسة الدخول…</div>;
  if (!auth.isAuthenticated) return <><Redirect to="/" />{welcome}</>;
  return (
    <StoreProvider key={auth.user?.id}>
    {publicPage ? welcome : <Shell onLogout={auth.logout} userName={auth.user?.firstName || auth.user?.email || 'المستخدم'}>
      <RoutedErrorBoundary>
        <Suspense fallback={<div role="status">جارٍ تحميل الصفحة…</div>}>
        <Switch>
          <Route path="/compare" component={ComparePage} />
          <Route path="/sources" component={SourcesPage} />
          <Route component={NotFound} />
        </Switch>
        </Suspense>
      </RoutedErrorBoundary>
    </Shell>}
    </StoreProvider>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
