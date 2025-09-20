/**
  App Dev Club People Portal UI
  Copyright (C) 2025  Atheesh Thirumalairajan

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Route, Routes } from 'react-router-dom'
import { UserOnboarding } from './pages/UserOnboarding'
import { Toaster } from 'sonner'
import { CorpDashboard } from './pages/CorpDashboard'
import { ThemeProvider } from './components/fabric/ThemeProvider'
import { ATSDashboard } from './pages/ATSDashboard'

function App() {
  return (
    <ThemeProvider defaultTheme='system' storageKey='ppf-ui-theme'>
      <div className="flex flex-col h-full w-full">
        <Toaster position='top-right' />
        <Routes>
          <Route path="/*" element={<CorpDashboard />} />
          <Route path="/onboard/:onboardId/*" element={<UserOnboarding />} />
          <Route path="/apply/*" element={<ATSDashboard />} />
        </Routes>
      </div>
    </ThemeProvider>
  )
}

export default App
