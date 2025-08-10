import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import {MinisContainer, MinisRouter} from '@shopify/shop-minis-react'

import {App} from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MinisContainer>
      <MinisRouter>
        <App />
      </MinisRouter>
    </MinisContainer>
  </StrictMode>
)
