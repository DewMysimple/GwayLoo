import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExperiencePage } from './ExperiencePage';

describe('ExperiencePage', () => {
  it('renders the original immersive experience contract', () => {
    render(<ExperiencePage />);

    expect(screen.getByLabelText('GwayLoo 沉浸体验')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn sound on' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart the experience' })).toBeInTheDocument();
    expect(document.querySelector('#root > .page[data-component="WatercolorExperience"]')).toBeInTheDocument();
    expect(document.querySelector('#header[data-component="Header"]')).toBeInTheDocument();
    expect(document.querySelector('#footer')).toBeInTheDocument();
    expect(document.querySelector('[data-component="Cursor"] .inner-circle')).toBeInTheDocument();
    expect(document.querySelector('[data-component="Cursor"] .outer-circle')).toBeInTheDocument();
    expect(document.querySelector('.xp-text-sizer [data-section="0"] .gmail_default'))
      .toHaveTextContent('You start');
    expect(document.querySelector('.xp-text-sizer [data-section="1"] p'))
      .toHaveTextContent('What you can plan');
    expect(document.querySelector('.xp-section + .advantages-section[data-component="Advantages"]'))
      .toBeInTheDocument();
    expect(screen.getByText('Poetry and essays')).toBeInTheDocument();
    expect(screen.getByText('Commonly Asked Questions')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-component="InternalFaqItem"]')).toHaveLength(5);
    expect(document.querySelectorAll('.advantages-section a')).toHaveLength(0);
    expect(screen.getByText('Subscribe - $75 / year').tagName).toBe('SPAN');
    expect(screen.getByText('Gift - $75 / year').tagName).toBe('SPAN');
    expect(screen.queryByText('从一只手开始')).not.toBeInTheDocument();
  });
});
