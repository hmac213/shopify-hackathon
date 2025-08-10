import {Route, Routes} from 'react-router'

import {Menu} from './pages/Menu'
import {Capture} from './pages/Capture'
import {Loading} from './pages/Loading'
import {Viewer} from './pages/Viewer'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/capture" element={<Capture />} />
      <Route path="/loading" element={<Loading />} />
      <Route path="/viewer" element={<Viewer />} />
    </Routes>
  )
}
