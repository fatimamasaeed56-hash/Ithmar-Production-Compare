import { type ReactNode, lazy, Suspense } from 'react';
import { useAuth } from '@workspace/replit-auth-web';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import WelcomePage from '@/pages/welcome';
import AccountPage from '@/pages/account';
import { Shell } from '@/components/shell';
import { StoreProvider } from '@/lib/store';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';

const ComparePage = lazy(() => import('@/pages/compare'));
const SourcesPage = lazy(() => import('@/pages/sources'));
const ActivityPage = lazy(() => import('@/pages/activity'));

const queryClient = new QueryClient();

function Router() {
  const auth = useAuth();
  const [location, navigate] = useLocation();
  const welcome = (
    <WelcomePage
      isAuthenticated={auth.isAuthenticated}
      isLoading={auth.isLoading}
      error={auth.error}
      onLogin={() => { auth.retry(); navigate('/home'); }}
      onEnter={() => navigate('/home')}
      onRetry={() => { window.history.replaceState(null, '', window.location.pathname); auth.retry(); }}
    />
  );
  const publicPage = location === '/' || location === '/welcome' || location === '/login' || location === '/signup';
  if (publicPage && !auth.isAuthenticated) return welcome;
  if (auth.isLoading) return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background text-primary">
      <header className="border-b border-t-4 border-t-primary px-4 py-3">
        <div className="mx-auto max-w-6xl">
          <img src={`${import.meta.env.BASE_URL}ithmar-logo-updated.png`} alt="إثمار للصناعات البلاستيكية" width={819} height={331} className="h-auto w-48 sm:w-56" />
        </div>
      </header>
      <div role="status" className="grid flex-1 place-items-center">جارٍ التحقق من جلسة الدخول…</div>
    </div>
  );
  if (!auth.isAuthenticated) return <><Redirect to="/" />{welcome}</>;
  return (
    <StoreProvider key={auth.user?.id} userId={auth.user!.id}>
    {publicPage ? welcome : <Shell onLogout={auth.logout}>
      <RoutedErrorBoundary>
        <Suspense fallback={<div role="status">جارٍ تحميل الصفحة…</div>}>
        <Switch>
          <Route path="/home" component={ComparePage} />
          <Route path="/compare" component={ComparePage} />
          <Route path="/sources" component={SourcesPage} />
          <Route path="/activity">{auth.user && <ActivityPage userId={auth.user.id} />}</Route>
          <Route path="/account">{auth.user && <AccountPage user={auth.user} onLogout={auth.logout} />}</Route>
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
