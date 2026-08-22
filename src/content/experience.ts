export interface PoemBlock {
  id: 0 | 1 | 2;
  stanzas: readonly PoemStanza[];
  /**
   * Trusted markup copied from the read-only static baseline.
   * The legacy runtime measures this exact div/p/br structure before it builds
   * the WebGL poem text, so changing it changes both scale and scroll range.
   */
  sourceMarkup: string;
}

export interface PoemStanza {
  lines: readonly string[];
  credit?: string;
}

export interface ExperienceCopy {
  brandName: string;
  loading: string;
  intro: string;
  scrollHint: string;
  back: string;
  restart: string;
  soundOn: string;
  soundOff: string;
  landscapeCta: string;
  poems: readonly PoemBlock[];
}

export const experienceCopy: ExperienceCopy = {
  brandName: 'Verminoble',
  loading: 'Loading',
  intro: "Access David's library to discover his poems, essays, courses and short films",
  scrollHint: 'Scroll to explore',
  back: 'Back',
  restart: 'Restart the experience',
  soundOn: 'Turn sound on',
  soundOff: 'Turn sound off',
  landscapeCta: 'Open the landscape',
  poems: [
    {
      id: 0,
      stanzas: [{
        lines: ['You start', 'with a painter’s hand', 'working up color', 'from a dark palette', 'of remembrance'],
        credit: '(from “The Painter’s Hand”)',
      }],
      sourceMarkup: '<div class="gmail_default">You start<br />with a painter&#8217;s hand<br />working up color<br />from a dark palette<br />of remembrance</div><div class="gmail_default"></div><div class="gmail_default">(from &#8220;The Painter&#8217;s Hand&#8221;)</div>',
    },
    {
      id: 1,
      stanzas: [{ lines: ['What you can plan', 'is too small', 'for you to live.'] }],
      sourceMarkup: '<div class="gmail_default"><p>What you can plan<br />is too small<br />for you to live.</p></div>',
    },
    {
      id: 2,
      stanzas: [
        {
          lines: ['Time to go into the dark', 'where the night has eyes', 'to recognize its own.'],
        },
        {
          lines: ['There you can be sure', 'you are not beyond love.', '', 'The dark will be your home', 'tonight.'],
          credit: '(from “Sweet Darkness”)',
        },
        {
          lines: [
            'Despair takes us in when we',
            'have nowhere else to go;',
            'when we feel the heart',
            'cannot break anymore, when',
            'our world or our loved ones',
            'disappear, when we feel we',
            'cannot be loved or do not',
            'deserve to be loved, when',
            'our God disappoints, or',
            'when our body is carrying',
            'profound pain in a way',
            'that does not seem to go away.',
          ],
          credit: '(from “Despair”)',
        },
      ],
      sourceMarkup: [
        '<div class="gmail_default">Time to go into the dark<br />where the night has eyes<br />to recognize its own.</div>',
        '<div class="gmail_default"></div>',
        '<div class="gmail_default">There you can be sure</div>',
        '<div class="gmail_default">you are not beyond love.</div>',
        '<div class="gmail_default"></div>',
        '<div class="gmail_default">The dark will be your home</div>',
        '<div class="gmail_default">tonight.</div>',
        '<div class="gmail_default"></div>',
        '<div class="gmail_default">(from &#8220;Sweet Darkness&#8221;)</div>',
        '<div></div>',
        '<div>',
        '<p>Despair takes us in when we</p>',
        '<p>have nowhere else to go;</p>',
        '<p>when we feel the heart</p>',
        '<p>cannot break anymore, when</p>',
        '<p>our world or our loved ones</p>',
        '<p>disappear, when we feel we</p>',
        '<p>cannot be loved or do not</p>',
        '<p>deserve to be loved, when</p>',
        '<p>our God disappoints, or</p>',
        '<p>when our body is carrying</p>',
        '<p>profound pain in a way</p>',
        '<p>that does not seem to go away.</p>',
        '<p>(from &#8220;Despair&#8221;)</p>',
        '</div>',
      ].join(''),
    }
  ]
};
