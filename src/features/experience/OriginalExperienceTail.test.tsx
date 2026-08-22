import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OriginalExperienceTail } from './OriginalExperienceTail';

describe('OriginalExperienceTail FAQ', () => {
  it('reveals and closes the source answer in the React runtime', () => {
    const { container } = render(<OriginalExperienceTail runtime="react" />);
    const item = container.querySelector<HTMLElement>('[data-component="InternalFaqItem"]');
    const trigger = item?.querySelector<HTMLElement>('.content-trigger');
    const wrapper = item?.querySelector<HTMLElement>('.content-wrapper');

    expect(item).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(wrapper).not.toBeNull();
    Object.defineProperty(wrapper, 'scrollHeight', { configurable: true, value: 120 });

    fireEvent.click(trigger!);
    expect(item).toHaveClass('open');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(wrapper).toHaveStyle({ height: '120px' });
    expect(screen.getByText(/Currently, we only offer annual/)).toBeInTheDocument();

    const transitionEnd = new Event('transitionend', { bubbles: true });
    Object.defineProperty(transitionEnd, 'propertyName', { value: 'height' });
    fireEvent(wrapper!, transitionEnd);
    fireEvent.click(trigger!);
    expect(item).not.toHaveClass('open');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(wrapper).toHaveStyle({ height: '0px' });
  });

  it('leaves FAQ ownership to the old source script in legacy mode', () => {
    const { container } = render(<OriginalExperienceTail runtime="legacy" />);
    const item = container.querySelector<HTMLElement>('[data-component="InternalFaqItem"]');
    const trigger = item?.querySelector<HTMLElement>('.content-trigger');

    fireEvent.click(trigger!);
    expect(item).not.toHaveClass('open');
    expect(trigger).not.toHaveAttribute('role');
  });
});
