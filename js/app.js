(() => {
  document.documentElement.classList.remove("no-js");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasMotionLibraries = window.gsap && window.barba && window.ScrollTrigger;
  let currentScenes = [];
  let progressFrame = false;

  function animateScenes(container = document) {
    currentScenes = [...container.querySelectorAll(".scene")];
    const progressLine = document.getElementById("progress-line");
    const progressLabel = document.getElementById("progress-label");

    if (hasMotionLibraries && !reducedMotion.matches) {
      gsap.registerPlugin(ScrollTrigger);
      currentScenes.forEach((scene, index) => {
        const reveals = scene.querySelectorAll(".reveal");
        const from = index === 0 ? { y: -22 } : index === 1 ? { y: -34 } : index === 2 ? { x: -38 } : { x: 38 };
        gsap.fromTo(reveals,
          { ...from, autoAlpha: 0 },
          {
            x: 0, y: 0, autoAlpha: 1, duration: 1.05, ease: "power2.out",
            stagger: 0.12, clearProps: "transform",
            scrollTrigger: { trigger: scene, start: "top 72%", once: true }
          }
        );
        if (index === 1) {
          const portrait = scene.querySelector(".image-mask img");
          gsap.fromTo(portrait, { clipPath: "inset(0 0 100% 0)" }, {
            clipPath: "inset(0 0 0% 0)", duration: 1.35, ease: "power3.inOut",
            scrollTrigger: { trigger: scene, start: "top 62%", once: true }
          });
        }
      });
    } else if ("IntersectionObserver" in window && !reducedMotion.matches) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (isIntersecting) {
            target.classList.add("is-visible");
            observer.unobserve(target);
          }
        });
      }, { threshold: 0.18 });
      currentScenes.forEach((scene) => observer.observe(scene));
      currentScenes[0]?.classList.add("is-visible");
    } else {
      currentScenes.forEach((scene) => scene.classList.add("is-visible"));
    }

    function updateProgress() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      if (progressLine && hasMotionLibraries) gsap.to(progressLine, { scaleX: ratio, duration: 0.35, overwrite: true });
      else if (progressLine) progressLine.style.transform = `scaleX(${ratio})`;

      if (progressLabel && currentScenes.length) {
        const middle = window.innerHeight * 0.5;
        const active = currentScenes.reduce((best, scene, index) => {
          const distance = Math.abs(scene.getBoundingClientRect().top + scene.offsetHeight / 2 - middle);
          return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Infinity });
        progressLabel.textContent = `${String(active.index + 1).padStart(2, "0")} / ${String(currentScenes.length).padStart(2, "0")}`;
      }
      progressFrame = false;
    }

    window.addEventListener("scroll", () => {
      if (!progressFrame) {
        progressFrame = true;
        window.requestAnimationFrame(updateProgress);
      }
    }, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    updateProgress();
    window.ScrollTrigger?.refresh?.();
  }

  function destinationIndex(href) {
    const hash = new URL(href, window.location.href).hash.slice(1);
    return currentScenes.findIndex((scene) => scene.id === hash);
  }

  if (hasMotionLibraries && !reducedMotion.matches) {
    barba.init({
      prevent: ({ el }) => el?.hasAttribute("data-barba-prevent"),
      transitions: [{
        name: "editorial-scene",
        once({ next }) {
          animateScenes(next.container);
        },
        leave({ current }) {
          return gsap.to(current.container, { autoAlpha: 0, duration: 0.42, ease: "power1.inOut" });
        },
        enter({ next, trigger }) {
          const index = destinationIndex(trigger?.href || window.location.href);
          const start = index === 1 ? { y: -34 } : index === 2 ? { x: -38 } : index === 3 ? { x: 38 } : { y: -18 };
          const target = index >= 0 ? next.container.querySelectorAll(".scene")[index] : null;
          if (target) window.scrollTo(0, target.offsetTop);
          return gsap.fromTo(next.container, { ...start, autoAlpha: 0 }, {
            x: 0, y: 0, autoAlpha: 1, duration: 0.85, ease: "power2.out",
            onComplete: () => target?.scrollIntoView({ behavior: "smooth", block: "start" })
          });
        }
      }]
    });

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href^='#']");
      if (!link || link.hasAttribute("data-barba-prevent")) return;
      const target = document.querySelector(link.getAttribute("href"));
      if (!target || !target.classList.contains("scene")) return;
      event.preventDefault();
      const url = new URL(window.location.href);
      url.searchParams.set("scene", String(currentScenes.indexOf(target) + 1));
      url.hash = target.id;
      barba.go(url.href, link, event);
    });
    barba.hooks.afterEnter(({ next }) => animateScenes(next.container));
    barba.hooks.after(() => window.ScrollTrigger.refresh());
  } else {
    animateScenes();
  }
})();
