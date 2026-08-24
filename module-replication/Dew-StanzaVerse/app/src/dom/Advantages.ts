/**
 * 权益区与各 DOM 按钮的交互绑定。
 * - IntersectionObserver 滚动显现（.advantages-header / .a-title / .a-step-wrapper / .a-cta-wrapper 加 .show）
 * - FAQ 手风琴（GSAP 展开 content-wrapper 高度）
 * - Restart 按钮 → 重启体验
 * - Back 按钮 → 退出全幅绘画 / 全屏诗歌
 * - 声音开关 → 静音切换
 */
import gsap from "gsap";
import { bus, EVENTS } from "../core/EventBus";
import { audioManager } from "../experience/audio/AudioManager";
import { experienceManager } from "../experience/ExperienceManager";

export class Advantages {
  init(): void {
    this._setupReveal();
    this._setupFaq();
    this._setupButtons();
  }

  /** 滚动进入视口时显现 */
  private _setupReveal(): void {
    const targets = document.querySelectorAll<HTMLElement>(
      ".advantages-header, .advantages-content .a-title, .a-step-wrapper, .a-cta-wrapper",
    );
    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("show"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    targets.forEach((el) => observer.observe(el));
  }

  /** FAQ 手风琴 */
  private _setupFaq(): void {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll<HTMLElement>(".faq .question").forEach((question) => {
      const trigger = question.querySelector<HTMLElement>(".content-trigger");
      const wrapper = question.querySelector<HTMLElement>(".content-wrapper");
      const content = question.querySelector<HTMLElement>(".content");
      if (!trigger || !wrapper || !content) return;

      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("aria-expanded", "false");

      const toggle = () => {
        const isOpen = question.classList.contains("open");
        if (isOpen) {
          question.classList.remove("open");
          trigger.setAttribute("aria-expanded", "false");
          if (reducedMotion) wrapper.style.height = "0px";
          else gsap.to(wrapper, { height: 0, duration: 0.5, ease: "power2.inOut" });
        } else {
          question.classList.add("open");
          trigger.setAttribute("aria-expanded", "true");
          if (reducedMotion) wrapper.style.height = "auto";
          else gsap.to(wrapper, { height: content.scrollHeight, duration: 0.5, ease: "power2.inOut" });
        }
      };
      trigger.addEventListener("click", toggle);
      trigger.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle();
      });
    });
  }

  /** 按钮：Restart / Back ×2 / 声音开关 */
  private _setupButtons(): void {
    document.getElementById("restart-btn")?.addEventListener("click", () => {
      if (experienceManager.state.started) bus.emit(EVENTS.RESTART_WATERCOLOR);
      else window.scrollTo({ top: 0, behavior: "auto" });
    });

    document.getElementById("fullpaint-back")?.addEventListener("click", () => {
      audioManager.playSfx("over-cta-back");
      experienceManager.hideFullPaint();
    });

    document.getElementById("poem-back")?.addEventListener("click", () => {
      audioManager.playSfx("over-cta-back");
      experienceManager.hideFullscreenPoem();
    });

    const soundToggle = document.getElementById("sound-toggle");
    soundToggle?.addEventListener("click", () => {
      audioManager.setMuted(!audioManager.muted);
    });
  }
}

export const advantages = new Advantages();
