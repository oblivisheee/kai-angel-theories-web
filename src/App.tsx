import { FEATURED, THEORIES } from './content'
import { useAmbientWorld } from './lib/world'
import { themeOf } from './data/albums'
import { Header } from './components/Header'
import { HotTheory } from './components/HotTheory'
import { Archive } from './components/Archive'
import { Submit } from './components/Submit'
import { Contacts } from './components/Contacts'
import { Footer } from './components/Footer'

export function App() {
  const runnersUp = THEORIES.filter((t) => t !== FEATURED).slice(0, 2)
  useAmbientWorld()

  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <Header />
      <main>
        {FEATURED && <HotTheory theory={FEATURED} runnersUp={runnersUp} />}
        <Archive theories={THEORIES} />
        <Submit />
        <Contacts />
      </main>
      <Footer theme={themeOf(FEATURED?.album ?? null)} />
    </>
  )
}
