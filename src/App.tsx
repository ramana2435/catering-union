import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './lib/i18n'
import ErrorBoundary from './components/common/ErrorBoundary'
import OfflineIndicator from './components/common/OfflineIndicator'
import AppRoutes from './routes'

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <BrowserRouter>
          <OfflineIndicator />
          <AppRoutes />
        </BrowserRouter>
      </I18nProvider>
    </ErrorBoundary>
  )
}
