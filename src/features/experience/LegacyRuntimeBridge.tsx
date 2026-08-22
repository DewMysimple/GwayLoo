import { useEffect, useState } from 'react';
import type { PoemBlock } from '../../content/experience';
import { loadLegacyRuntime } from './legacy-runtime';
import { OriginalExperienceTail } from './OriginalExperienceTail';
import { SourceSoundControl } from './SourceSoundControl';
import type { ExperienceRuntimeProps } from './runtime/contract';

function Poem({ poem }: { poem: PoemBlock }) {
  return (
    <div
      className="xp-text"
      data-section={poem.id}
      dangerouslySetInnerHTML={{ __html: poem.sourceMarkup + '<div class="line-break"></div>' }}
    />
  );
}

export function LegacyRuntimeBridge({ definition }: ExperienceRuntimeProps) {
  const { copy } = definition;
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    void loadLegacyRuntime().catch((error: unknown) => {
      setRuntimeError(error instanceof Error ? error.message : '旧体验运行时加载失败。');
    });
  }, []);

  return (
    <div className="experience-shell" aria-label={`${copy.brandName} 沉浸体验`}>
      <header id="header" className="legacy-header-contract" data-component="Header" aria-hidden="true">
        <div className="home-pages" />
        <div className="three-sundays-pages" />
        <div className="companion-pages">
          <button className="become-member" type="button" tabIndex={-1}>{copy.brandName}</button>
        </div>
        <div className="account-pages"><button className="back" type="button" tabIndex={-1} /></div>
        <div className="course-pages"><a className="back-courses" tabIndex={-1} /></div>
        <div className="cp-course-pages" />
        <div className="cp-talks-pages" />
        <div className="cp-films-pages" />
      </header>

      <div id="global-cursor" data-component="GlobalCursor" aria-hidden="true"><div className="text" /></div>

      <div id="root" className="constent lang-en_US">
      <section className="page unsubscribed-page" data-component="WatercolorExperience" data-header="dark" data-header-props="companion">
        <div className="cursor-w hide-mobile hide-tablet loading" data-component="Cursor" data-fixed="true">
          <svg className="cursor outer-circle" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" width="95" height="95" aria-hidden="true">
            <ellipse className="out-circle circle" rx="16" ry="16" cx="17" cy="17" />
          </svg>
          <svg className="cursor inner-circle" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" width="95" height="95" aria-hidden="true">
            <ellipse className="in-circle circle" rx="1.2" ry="1.2" cx="17" cy="17" strokeWidth="0" />
            <ellipse className="in-circle-down circle" rx="1.2" ry="1.2" cx="17" cy="17" strokeWidth="0" />
          </svg>
          <div className="hover-text"><p><span>See the poems</span></p></div>
        </div>

        <div className="loader-experience" data-fixed="true" data-component="LoaderExperience">
          <div className="center-wrapper">
            <div className="middle-w center"><p className="loading-text center">{copy.loading}</p></div>
            <p className="enter-description center">{copy.intro}</p>
          </div>
        </div>

        <canvas className="xp-canvas" />

        <div className="xp-assets" aria-hidden="true">
          <video className="xp-videoTexture-base" muted loop playsInline />
          <video className="xp-videoTexture-over" muted loop playsInline />
          <audio className="loop-main" preload="none" controls loop><source src="/wp-content/themes/davidwhyte/resources/assets/xp/sounds/loop-main.mp3" type="audio/mpeg" /></audio>
          <audio className="loop-poem" preload="none" controls loop><source src="/wp-content/themes/davidwhyte/resources/assets/xp/sounds/loop-poem.mp3" type="audio/mpeg" /></audio>
          <audio className="loop-painting" preload="none" controls loop><source src="/wp-content/themes/davidwhyte/resources/assets/xp/sounds/loop-painting.mp3" type="audio/mpeg" /></audio>
          <audio className="over-cta-back" preload="none" controls><source src="/wp-content/themes/davidwhyte/resources/assets/xp/sounds/over-cta-back.mp3" type="audio/mpeg" /></audio>
          <audio className="over-cta-painting" preload="none" controls><source src="/wp-content/themes/davidwhyte/resources/assets/xp/sounds/over-cta-painting.mp3" type="audio/mpeg" /></audio>
        </div>

        <section className="xp-section" data-component="Experience" data-hover="2">
          <button className="xp-btn xp-fullpaint-btn" type="button"><span>{copy.back}</span></button>
          <button className="xp-btn xp-poem-btn" type="button"><span>{copy.back}</span></button>
          <div className="xp-text-w">
            <div className="xp-text-sizer">{copy.poems.map((poem) => <Poem key={poem.id} poem={poem} />)}</div>
            <div className="xp-text-w-inside">{copy.poems.map((poem) => <Poem key={poem.id} poem={poem} />)}</div>
          </div>
          <button className="xp-scrollToExplore hidden" type="button"><span>{copy.scrollHint}</span></button>
          <div className="xp-fulltext" />
          <SourceSoundControl hidden soundOffLabel={copy.soundOff} soundOnLabel={copy.soundOn} />
        </section>

        <OriginalExperienceTail runtime="legacy" />
      </section>
      </div>

      <footer id="footer" className="legacy-footer-contract" aria-hidden="true" />
      {runtimeError ? <p className="runtime-error">{runtimeError}</p> : null}
    </div>
  );
}
