export interface FaqDefinition {
  title: string;
  paragraphs: readonly string[];
}

export const tailCopy = {
  heading: "Become a companion to David Whyte's work",
  description: "An online archive of a lifetime's work, talks and films. There will be a pipeline of new material added to the Companion site as they become available.",
  benefitsHeading: 'Subscriber Benefits',
  benefits: [
    {
      title: 'Poetry and essays',
      description: "The complete collection of David's published poetry and essays.",
    },
    {
      title: 'Video and talks',
      description: 'A rich archive of talks and online sessions, including a selection of Three Sundays Series.',
    },
    {
      title: 'Maps',
      description: "An interactive map experience to explore the literary landscapes of David's life.",
    },
  ],
  offers: [
    { indication: 'Annual Offer with One Week Free Trial ', label: 'Subscribe - $75 / year' },
    { indication: 'Gift David Whyte Companion Subscription', label: 'Gift - $75 / year', gift: true },
  ],
  faqHeading: 'Commonly Asked Questions',
  faqs: [
    {
      title: 'Is there a monthly subscription available for the Companion?',
      paragraphs: ['Currently, we only offer annual (12 month) subscriptions to the David Whyte Companion.'],
    },
    {
      title: "I already subscribe to David's Substack - what is the difference between that and the Companion?",
      paragraphs: [
        "David publishes twice weekly on davidwhyte.substack.com, where he selects published work from his archive, and also shares new, newly revised and not yet published poems and essays. In addition to publishing his writing, David offers personal insights into the inspiration for his writing, and will often comment on reader's responses to his posts.",
        'Paid Substack subscribers receive exclusive discounts on new work, Three Sundays Series, and early access to register for events, retreats and walking tours.',
        "While David's Substack publication is a curated collection, the David Whyte Companion portal offers members the ability to explore David's complete published archive of poems and essays on their own. As well, the Companion Library includes a selection of short films, audio talks, recordings of David reading some of his most beloved poems and essays, and a subset of past Three Sundays Series.",
        'Companion members can save their favorite poems, series, and talks, and access them any time in their account.',
      ],
    },
    {
      title: 'Can I gift a Companion membership to someone?',
      paragraphs: [
        'Yes, you can gift a Companion membership to a friend or family member. Gift subscriptions provide a free 12-month membership. Gift subscriptions to do not automatically renew when the subscription period ends.',
        'You can purchase a David Whyte Companion gift subscription {{gift}}:',
      ],
    },
    {
      title: 'When will more Three Sundays Series be added?',
      paragraphs: ['The Three Sundays Series from 2020 – 2022 are now available in the Companion Library. Additional sessions will be added during the coming year.'],
    },
    {
      title: 'I am having trouble with my subscription - who do I contact?',
      paragraphs: ['For any questions on how to become a Companion subscriber, or for help with your account – including email, password and payment questions – contact {{email}} and someone will be happy to assist you.'],
    },
  ] satisfies readonly FaqDefinition[],
  share: 'Share the experience',
  subtitle: 'Companion Portal',
  title: 'David Whyte',
  awards: 'David Whyte Experience by received the Site of the Month on {{awwwards1}} and the Site of the Day on {{awwwards2}}, {{css}} and {{fwa}}.',
} as const;
