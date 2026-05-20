import { render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import { TemplateSelector } from '../components/TemplateSelector'

const noop = () => {}

afterEach(() => cleanup())

describe('TemplateSelector', () => {
  it('is enabled when transcript is idle and note is idle', () => {
    render(
      <TemplateSelector
        value="gp-note"
        transcript={{ status: 'idle' }}
        note={{ status: 'idle' }}
        onChange={noop}
      />
    )
    expect(screen.getByRole('combobox')).not.toBeDisabled()
  })

  it('is disabled while note is streaming', () => {
    render(
      <TemplateSelector
        value="gp-note"
        transcript={{ status: 'idle' }}
        note={{ status: 'streaming', sections: {} }}
        onChange={noop}
      />
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('is disabled while demo is playing', () => {
    render(
      <TemplateSelector
        value="gp-note"
        transcript={{ status: 'demo-playing', text: 'partial', cursor: 2 }}
        note={{ status: 'idle' }}
        onChange={noop}
      />
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('is enabled after demo finishes', () => {
    render(
      <TemplateSelector
        value="gp-note"
        transcript={{ status: 'done', text: 'full transcript' }}
        note={{ status: 'idle' }}
        onChange={noop}
      />
    )
    expect(screen.getByRole('combobox')).not.toBeDisabled()
  })
})
