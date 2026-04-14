import ReactDOM from 'react-dom/client'
import App from '@/app'
import '@/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found')
  document.body.innerHTML = '<div id="root"></div>'
}

try {
  ReactDOM.createRoot(rootElement!).render(
    <App />
  )
} catch (error) {
  console.error('React render error:', error)
  document.body.innerHTML = '<div id="root" style="padding: 20px; color: red;"></div>'
  document.querySelector('#root')!.textContent = 'Error: ' + (error as Error).message
}
