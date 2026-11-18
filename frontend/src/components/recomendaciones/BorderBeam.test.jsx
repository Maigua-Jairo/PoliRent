import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BorderBeam } from 'border-beam'
import TarjetaRecomendada from './TarjetaRecomendada.jsx'

describe('BorderBeam effect', () => {
  test('renders children wrapped in BorderBeam with default props', () => {
    render(
      <BorderBeam size="md" colorVariant="colorful" strength={0.7}>
        <div data-testid="card">Card content</div>
      </BorderBeam>,
    )

    const card = screen.getByTestId('card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent('Card content')
  })

  test('supports different size, colorVariant, strength, active and theme props', () => {
    const { rerender } = render(
      <BorderBeam size="sm" colorVariant="ocean" strength={0.5} active={true} theme="dark">
        <div data-testid="styled-card">Ocean Glow</div>
      </BorderBeam>,
    )
    expect(screen.getByTestId('styled-card')).toBeInTheDocument()

    rerender(
      <BorderBeam size="pulse-inner" colorVariant="sunset" strength={0.9} active={false} theme="light">
        <div data-testid="styled-card">Sunset Pulse</div>
      </BorderBeam>,
    )
    expect(screen.getByTestId('styled-card')).toBeInTheDocument()
  })

  test('renders TarjetaRecomendada wrapped with BorderBeam when destacado is true', () => {
    const recurso = {
      _id: 'rec-1',
      nombre: 'Osciloscopio Digital',
      descripcion: 'Para laboratorio de electrónica',
      categoria: 'tecnico',
      imagen: '',
    }

    render(
      <MemoryRouter>
        <TarjetaRecomendada recurso={recurso} razon="Recomendado para tu proyecto" destacado={true} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Osciloscopio Digital')).toBeInTheDocument()
    expect(screen.getByText('Recomendado para tu proyecto')).toBeInTheDocument()
  })
})
