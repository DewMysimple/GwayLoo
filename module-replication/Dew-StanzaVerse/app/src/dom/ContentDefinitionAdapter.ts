import { experienceDefinition, type ExperienceDefinition } from "../experience/definition";

type TailDefinition = ExperienceDefinition["tail"];

const TOKEN_LABELS: Record<string, string> = {
  "{{gift}}": "here",
  "{{email}}": "[email protected]",
  "{{awwwards1}}": "Awwwards",
  "{{awwwards2}}": "Awwwards",
  "{{css}}": "CSS",
  "{{fwa}}": "FWA",
};

function setText(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.textContent = value;
  });
}

function setElementText(root: ParentNode, selector: string, value: string): void {
  root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    element.textContent = value;
  });
}

function renderTokens(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  text.split(/({{(?:gift|email|awwwards1|awwwards2|css|fwa)}})/g).forEach((part) => {
    const label = TOKEN_LABELS[part];
    if (!label) {
      fragment.appendChild(document.createTextNode(part));
      return;
    }
    const link = document.createElement("span");
    link.className = "tail-static-link";
    link.textContent = label;
    fragment.appendChild(link);
  });
  return fragment;
}

function renderFaqAnswer(answer: HTMLElement, paragraphs: readonly string[]): void {
  answer.replaceChildren();
  paragraphs.forEach((paragraph) => {
    const element = document.createElement("p");
    element.appendChild(renderTokens(paragraph));
    answer.appendChild(element);
  });
}

function applyPoems(definition: ExperienceDefinition): void {
  const poems = definition.copy.poems;
  document.querySelectorAll<HTMLElement>(".xp-text-w .xp-text, .xp-text-w-inside .xp-text").forEach((element, index) => {
    const poem = poems[index];
    if (!poem) return;
    element.dataset.section = String(poem.id);
    element.innerHTML = poem.sourceMarkup;
    const lineBreak = document.createElement("div");
    lineBreak.className = "line-break";
    element.appendChild(lineBreak);
  });
}

function applyTail(tail: TailDefinition): void {
  setText(".advantages-header .a-title", tail.heading);
  setText(".advantages-header .a-description", tail.description);
  setText(".advantages-content > .a-title", tail.benefitsHeading);

  document.querySelectorAll<HTMLElement>(".a-step-wrapper").forEach((wrapper, index) => {
    const benefit = tail.benefits[index];
    if (!benefit) return;
    setElementText(wrapper, ".a-step-title", benefit.title);
    setElementText(wrapper, ".a-step-informations", benefit.description);
  });

  document.querySelectorAll<HTMLElement>(".a-cta-wrapper").forEach((wrapper, index) => {
    const offer = tail.offers[index];
    if (!offer) return;
    const indication = wrapper.querySelector<HTMLElement>(".a-cta-indication");
    const button = wrapper.querySelector<HTMLElement>(".a-cta-button");
    if (indication) indication.textContent = offer.indication;
    if (button) button.textContent = offer.label;
    wrapper.classList.toggle("gift-card", "gift" in offer && offer.gift === true);
  });

  setText(".faq-title", tail.faqHeading);
  document.querySelectorAll<HTMLElement>(".faq .question").forEach((question, index) => {
    const item = tail.faqs[index];
    if (!item) return;
    setElementText(question, ".q-title", item.title);
    const answer = question.querySelector<HTMLElement>(".answer");
    if (answer) renderFaqAnswer(answer, item.paragraphs);
  });

  setText(".a-footer-share > p", tail.share);
  setText(".a-footer-subtitle", tail.subtitle);
  setText(".a-footer-title", tail.title);
  setText("#restart-btn span", experienceDefinition.copy.restart);
  const awards = document.querySelector<HTMLElement>(".awwards");
  if (awards) {
    awards.replaceChildren(renderTokens(tail.awards));
  }
}

export class ContentDefinitionAdapter {
  apply(definition: ExperienceDefinition = experienceDefinition): void {
    setText(".loading-text", definition.copy.loading);
    setText(".enter-description", definition.copy.intro);
    setText("#fullpaint-back span, #poem-back span", definition.copy.back);
    setText("#scroll-to-explore span", definition.copy.scrollHint);
    setText("#restart-btn span", definition.copy.restart);
    document.getElementById("sound-toggle")?.setAttribute("aria-label", definition.copy.soundOff);
    applyPoems(definition);
    applyTail(definition.tail);
  }
}

export const contentDefinitionAdapter = new ContentDefinitionAdapter();
