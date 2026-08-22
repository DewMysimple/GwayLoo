import {
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type TransitionEvent,
} from 'react';
import { tailCopy, type FaqDefinition } from '../../content/tail';

interface FaqItemProps {
  item: FaqDefinition;
  runtime: 'legacy' | 'react';
}

function renderStaticTokens(text: string): ReactNode[] {
  return text.split(/({{(?:gift|email|awwwards1|awwwards2|css|fwa)}})/g).map((part, index) => {
    const labels: Record<string, string> = {
      '{{gift}}': 'here',
      '{{email}}': '[email\u00a0protected]',
      '{{awwwards1}}': 'Awwwards',
      '{{awwwards2}}': 'Awwwards',
      '{{css}}': 'CSS',
      '{{fwa}}': 'FWA',
    };
    return labels[part]
      ? <span className="tail-static-link" key={`${part}-${index}`}>{labels[part]}</span>
      : part;
  });
}

function FaqItem({ item, runtime }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (runtime === 'legacy' || animating) return;
    const content = contentRef.current;
    if (!content) return;

    setAnimating(true);
    questionRef.current?.style.setProperty('pointer-events', 'none');

    if (open) {
      content.style.height = `${content.scrollHeight}px`;
      content.getBoundingClientRect();
      setOpen(false);
      content.style.height = '0px';
      return;
    }

    setOpen(true);
    content.style.height = '0px';
    content.getBoundingClientRect();
    content.style.height = `${content.scrollHeight}px`;
  };

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== contentRef.current || event.propertyName !== 'height') return;
    if (open && contentRef.current) contentRef.current.style.height = 'auto';
    questionRef.current?.style.removeProperty('pointer-events');
    setAnimating(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={`question container${open ? ' open' : ''}${animating ? ' animate' : ''}`}
      data-component="InternalFaqItem"
      ref={questionRef}
    >
      <h3 className="title col-end-4 tb:col-start-4 tb:col-end-14 dk:col-end-11">{item.title}</h3>
      <div
        aria-expanded={runtime === 'react' ? open : undefined}
        className="content-trigger col-start-4 tb:col-start-17 tb:col-end-19 dk:col-start-14 dk:col-end-16"
        onClick={runtime === 'react' ? toggle : undefined}
        onKeyDown={runtime === 'react' ? onKeyDown : undefined}
        role={runtime === 'react' ? 'button' : undefined}
        tabIndex={runtime === 'react' ? 0 : undefined}
      >
        <p className="close">Close</p>
        <p className="view">View</p>
      </div>

      <div
        className="content-wrapper tb:col-start-4 tb:col-end-15 dk:col-start-14 dk:col-end-21"
        onTransitionEnd={runtime === 'react' ? onTransitionEnd : undefined}
        ref={contentRef}
      >
        <div className="content">
          <div className="answer">
            {item.paragraphs.map((paragraph) => <p key={paragraph}>{renderStaticTokens(paragraph)}</p>)}
          </div>
        </div>
      </div>
      <div className="separator tb:col-start-2 tb:col-end-24" data-animation="line" />
    </div>
  );
}

/**
 * Source-faithful continuation of the read-only static baseline after .xp-section.
 * Keep its DOM classes and copy aligned with the original runtime contract.
 */
export function OriginalExperienceTail({
  onRestart,
  runtime = 'react',
}: {
  onRestart?: () => void;
  runtime?: 'legacy' | 'react';
}) {
  return (
    <section className="advantages-section" data-component="Advantages">
      <div className="advantages-wrapper">
        <div className="advantages-header">
          <div>
            <h2 className="a-title">{tailCopy.heading}</h2>
            <p className="a-description">{tailCopy.description}</p>
          </div>
        </div>

        <div className="advantages-content">
          <h2 className="a-title">{tailCopy.benefitsHeading}</h2>

          {tailCopy.benefits.map((benefit) => (
            <div className="a-step-wrapper" key={benefit.title}>
              <h3 className="a-step-title">{benefit.title}</h3>
              <h3 className="a-step-informations">{benefit.description}</h3>
            </div>
          ))}

          {tailCopy.offers.map((offer) => (
            <div className={`a-cta-wrapper${'gift' in offer && offer.gift ? ' gift-card' : ''}`} key={offer.label}>
              <span className="a-cta-indication">{offer.indication}</span>
              <span className="a-cta-button no-history">{offer.label}</span>
            </div>
          ))}
        </div>

        <div className="internal-module faq" data-header="dark" data-maximum={99} data-component="InternalFaq">
          <div className="container">
            <h2 className="title tb:col-start-4 tb:col-end-11" data-animation="title">{tailCopy.faqHeading}</h2>

            <div className="separator tb:col-start-2 tb:col-end-24" />
            <div className="questions" data-animation="revealItems">
              {tailCopy.faqs.map((item) => <FaqItem item={item} key={item.title} runtime={runtime} />)}
            </div>
          </div>
        </div>

        <div className="advantages-footer">
          <div className="a-footer-share">
            <p>{tailCopy.share}</p>
            <div>
              <span className="a-footer-shareBttn" aria-hidden="true">
                <i className="icon icon-facebook" />
              </span>
              <span className="a-footer-shareBttn" aria-hidden="true">
                <i className="icon icon-twitter" />
              </span>
            </div>
          </div>

          <div className="a-footer-subtitle">{tailCopy.subtitle}</div>
          <div className="a-footer-title">{tailCopy.title}</div>

          <button className="xp-restart" data-hover="2" onClick={onRestart} type="button">
            <span>Restart the experience</span>
          </button>

          <div className="awwards">{renderStaticTokens(tailCopy.awards)}</div>
        </div>
      </div>
    </section>
  );
}
