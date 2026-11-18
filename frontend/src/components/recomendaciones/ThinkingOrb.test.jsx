import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThinkingOrb } from 'thinking-orbs'
import { Escribiendo } from './Mensajes.jsx'

describe('ThinkingOrb & AI Thinking Indicator', () => {
  test('renders ThinkingOrb with default state and size 64', () => {
    render(<ThinkingOrb state="searching" size={64} />)
    const orb = screen.getByRole('img')
    expect(orb).toBeInTheDocument()
    expect(orb).toHaveAttribute('aria-label', 'Searching…')
    expect(orb).toHaveStyle({ width: '64px', height: '64px' })
  })

  test('renders ThinkingOrb at inline-text size 20', () => {
    render(<ThinkingOrb state="working" size={20} />)
    const orb = screen.getByRole('img')
    expect(orb).toBeInTheDocument()
    expect(orb).toHaveAttribute('aria-label', 'Working…')
    expect(orb).toHaveStyle({ width: '20px', height: '20px' })
  })

  test('renders all 9 thinking states', () => {
    const states = [
      'working',
      'searching',
      'solving',
      'listening',
      'connecting',
      'weaving',
      'composing',
      'breathing',
      'shaping',
    ]

    for (const state of states) {
      const { unmount } = render(<ThinkingOrb state={state} size={64} />)
      expect(screen.getByRole('img')).toBeInTheDocument()
      unmount()
    }
  })

  test('renders Escribiendo component with ThinkingOrb', () => {
    render(<Escribiendo />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.getByText('Buscando recursos…')).toBeInTheDocument()
  })
})
