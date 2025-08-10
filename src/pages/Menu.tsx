import {useState} from 'react'
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label} from '@shopify/shop-minis-react'
import {useNavigate} from 'react-router'

export function Menu() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')

  const onStart = () => {
    const selected = category.trim()
    if (!selected) return
    navigate('/capture', {state: {category: selected}})
  }

  const onSurprise = () => {
    // Placeholder: backend selection logic can be added later
    navigate('/capture', {state: {category: 'Surprise Me', surprise: true}})
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold">Mini Shop Studio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Turn any room into a personalized store.
        </p>
      </header>

      <main className="px-4 flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Select a shopping category</CardTitle>
            <CardDescription>
              Tap Surprise Me or type your own to generate a virtual shop.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button variant="secondary" size="lg" onClick={onSurprise}>
                Surprise Me
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Type a category</Label>
              <Input
                placeholder="e.g., Office chairs, Coffee makers, Smart lights"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>

            <Button
              className="mt-2"
              size="lg"
              onClick={onStart}
              disabled={category.trim().length === 0}
            >
              Continue
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You can change the category later.
        </p>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        Built with Shopify Shop Minis
      </footer>
    </div>
  )
} 