import type { ReactNode } from 'react';

interface FaqItemProps {
  answer: ReactNode;
  title: string;
}

function FaqItem({ answer, title }: FaqItemProps) {
  return (
    <div className="question container" data-component="InternalFaqItem">
      <h3 className="title col-end-4 tb:col-start-4 tb:col-end-14 dk:col-end-11">{title}</h3>
      <div className="content-trigger col-start-4 tb:col-start-17 tb:col-end-19 dk:col-start-14 dk:col-end-16">
        <p className="close">Close</p>
        <p className="view">View</p>
      </div>

      <div className="content-wrapper tb:col-start-4 tb:col-end-15 dk:col-start-14 dk:col-end-21">
        <div className="content">
          <div className="answer">{answer}</div>
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
export function OriginalExperienceTail() {
  return (
    <section className="advantages-section" data-component="Advantages">
      <div className="advantages-wrapper">
        <div className="advantages-header">
          <div>
            <h2 className="a-title">Become a companion to David Whyte&apos;s work</h2>
            <p className="a-description">
              An online archive of a lifetime&apos;s work, talks and films. There will be a pipeline of new material added to the Companion site as they become available.
            </p>
          </div>
        </div>

        <div className="advantages-content">
          <h2 className="a-title">Subscriber Benefits</h2>

          <div className="a-step-wrapper">
            <h3 className="a-step-title">Poetry and essays</h3>
            <h3 className="a-step-informations">The complete collection of David&apos;s published poetry and essays.</h3>
          </div>
          <div className="a-step-wrapper">
            <h3 className="a-step-title">Video and talks</h3>
            <h3 className="a-step-informations">A rich archive of talks and online sessions, including a selection of Three Sundays Series.</h3>
          </div>
          <div className="a-step-wrapper">
            <h3 className="a-step-title">Maps</h3>
            <h3 className="a-step-informations">An interactive map experience to explore the literary landscapes of David&apos;s life.</h3>
          </div>

          <div className="a-cta-wrapper">
            <span className="a-cta-indication">Annual Offer with One Week Free Trial </span>
            <span className="a-cta-button no-history">
              Subscribe - $75 / year
            </span>
          </div>

          <div className="a-cta-wrapper gift-card">
            <span className="a-cta-indication">Gift David Whyte Companion Subscription</span>
            <span className="a-cta-button no-history">
              Gift - $75 / year
            </span>
          </div>
        </div>

        <div className="internal-module faq" data-header="dark" data-maximum={99} data-component="InternalFaq">
          <div className="container">
            <h2 className="title tb:col-start-4 tb:col-end-11" data-animation="title">Commonly Asked Questions</h2>

            <div className="separator tb:col-start-2 tb:col-end-24" />
            <div className="questions" data-animation="revealItems">
              <FaqItem
                title="Is there a monthly subscription available for the Companion?"
                answer={<p>Currently, we only offer annual (12 month) subscriptions to the David Whyte Companion.</p>}
              />
              <FaqItem
                title="I already subscribe to David's Substack - what is the difference between that and the Companion?"
                answer={(
                  <>
                    <p>David publishes twice weekly on davidwhyte.substack.com, where he selects published work from his archive, and also shares new, newly revised and not yet published poems and essays. In addition to publishing his writing, David offers personal insights into the inspiration for his writing, and will often comment on reader&apos;s responses to his posts.</p>
                    <p>Paid Substack subscribers receive exclusive discounts on new work, Three Sundays Series, and early access to register for events, retreats and walking tours.</p>
                    <p>While David&apos;s Substack publication is a curated collection, the David Whyte Companion portal offers members the ability to explore David&apos;s complete published archive of poems and essays on their own. As well, the Companion Library includes a selection of short films, audio talks, recordings of David reading some of his most beloved poems and essays, and a subset of past Three Sundays Series.</p>
                    <p>Companion members can save their favorite poems, series, and talks, and access them any time in their account.</p>
                  </>
                )}
              />
              <FaqItem
                title="Can I gift a Companion membership to someone?"
                answer={(
                  <>
                    <p>Yes, you can gift a Companion membership to a friend or family member. Gift subscriptions provide a free 12-month membership. Gift subscriptions to do not automatically renew when the subscription period ends.</p>
                    <p>You can purchase a David Whyte Companion gift subscription <span className="tail-static-link">here</span>:</p>
                  </>
                )}
              />
              <FaqItem
                title="When will more Three Sundays Series be added?"
                answer={<p>The Three Sundays Series from 2020 – 2022 are now available in the Companion Library. Additional sessions will be added during the coming year.</p>}
              />
              <FaqItem
                title="I am having trouble with my subscription - who do I contact?"
                answer={(
                  <p>
                    For any questions on how to become a Companion subscriber, or for help with your account – including email, password and payment questions – contact <span className="tail-static-link">[email&nbsp;protected]</span> and someone will be happy to assist you.
                  </p>
                )}
              />
            </div>
          </div>
        </div>

        <div className="advantages-footer">
          <div className="a-footer-share">
            <p>Share the experience</p>
            <div>
              <span className="a-footer-shareBttn" aria-hidden="true">
                <i className="icon icon-facebook" />
              </span>
              <span className="a-footer-shareBttn" aria-hidden="true">
                <i className="icon icon-twitter" />
              </span>
            </div>
          </div>

          <div className="a-footer-subtitle">Companion Portal</div>
          <div className="a-footer-title">David Whyte</div>

          <button className="xp-restart" data-hover="2" type="button">
            <span>Restart the experience</span>
          </button>

          <div className="awwards">
            David Whyte Experience by received the Site of the Month on <span className="tail-static-link">Awwwards</span> and the Site of the Day on <span className="tail-static-link">Awwwards</span>, <span className="tail-static-link">CSS</span> and <span className="tail-static-link">FWA</span>.
          </div>
        </div>
      </div>
    </section>
  );
}
