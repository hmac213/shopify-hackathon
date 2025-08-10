import {Route, Routes} from 'react-router'

import {Menu} from './pages/Menu'
import {Capture} from './pages/Capture'
import {Loading} from './pages/Loading'
import {Viewer} from './pages/Viewer'
import {Leaderboard} from './pages/Leaderboard'
import {FullView} from './pages/FullView'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/capture" element={<Capture />} />
      <Route path="/loading" element={<Loading />} />
      <Route path="/viewer" element={<Viewer />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/full" element={<FullView />} />
    </Routes>
  )
}
