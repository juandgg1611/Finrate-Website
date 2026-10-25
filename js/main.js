(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Play Store link wiring ----------
     Set the real Play Store URL once, and every button with
     data-store-url gets updated together. Empty string keeps
     the buttons visually ready without navigating anywhere. */
  const PLAY_STORE_URL = "";
  document.querySelectorAll("[data-store-url]").forEach((el) => {
    if (PLAY_STORE_URL) {
      el.setAttribute("href", PLAY_STORE_URL);
    } else {
      el.addEventListener("click", (e) => e.preventDefault());
    }
  });

  /* ---------- Sticky nav background ---------- */
  const nav = document.getElementById("siteNav");
  if (nav) {
    const onScrollNav = () => {
      if (window.scrollY > 20) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    };
    onScrollNav();
    window.addEventListener("scroll", onScrollNav, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  if (navToggle && mobileMenu) {
    const closeMobileMenu = () => {
      navToggle.classList.remove("open");
      mobileMenu.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    navToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("open");
      navToggle.classList.toggle("open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    mobileMenu.querySelectorAll("[data-nav]").forEach((link) => {
      link.addEventListener("click", closeMobileMenu);
    });
  }

  /* ---------- Scroll reveal (sutil) ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  revealEls.forEach((el) => {
    const d = el.getAttribute("data-reveal-delay");
    if (d) el.style.transitionDelay = d + "ms";
  });
  if (prefersReducedMotion) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Teléfono 3D: grosor + parallax con el cursor ---------- */
  const phone = document.getElementById("phone3d");
  if (phone) {
    const body = phone.querySelector(".phone3d-body");
    const back = phone.querySelector(".phone3d-back");
    if (back) back.remove();

    const LAYERS = 14;
    for (let i = LAYERS; i >= 1; i--) {
      const layer = document.createElement("div");
      layer.className = "phone3d-layer";
      layer.style.transform = `translateZ(${-i * 2.2}px)`;
      const shade = Math.round(20 + (LAYERS - i) * 2.4);
      layer.style.background = `linear-gradient(160deg, rgb(${shade + 22},${shade + 26},${shade + 24}), rgb(${shade - 6},${shade - 4},${shade - 5}))`;
      body.insertBefore(layer, body.firstChild);
    }

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const stage = phone.closest(".stage");
    if (fine && stage && !prefersReducedMotion) {
      stage.addEventListener("pointermove", (e) => {
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        body.style.setProperty("--ry", `${px * 14}deg`);
        body.style.setProperty("--rx", `${-py * 10}deg`);
      });
      stage.addEventListener("pointerleave", () => {
        body.style.setProperty("--ry", "0deg");
        body.style.setProperty("--rx", "0deg");
      });
    }
  }

  /* ---------- Tasas en vivo (datos reales vía Supabase, clave pública anon) ---------- */
  const rateEls = document.querySelectorAll("[data-rate]");
  if (rateEls.length) {
    const API = "https://drblvdlixhfccbpjmnmo.supabase.co/rest/v1/rate_state_public?select=usd,eur,usdt,updated_at";
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYmx2ZGxpeGhmY2NicGptbm1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDQzODAsImV4cCI6MjEwODUyMDM4MH0.Rdjg8EgN08Ep7Ub5Qo8Hltl4iknYXWRLPbyaXGkpRy0";
    const note = document.getElementById("liveNote");
    const fmt = (n) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const targets = {};
    let visible = false;

    const animate = (el, to) => {
      if (prefersReducedMotion) { el.textContent = fmt(to); return; }
      const t0 = performance.now();
      const dur = 1300;
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const paint = () => {
      rateEls.forEach((el) => {
        const v = targets[el.dataset.rate];
        if (typeof v === "number") animate(el, v);
      });
    };

    rateEls.forEach((el) => { targets[el.dataset.rate] = parseFloat(el.dataset.fallback); });

    const load = async () => {
      try {
        const res = await fetch(API, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
        if (!res.ok) throw new Error(res.status);
        const rows = await res.json();
        const d = rows && rows[0];
        if (!d) throw new Error("sin datos");
        ["usd", "eur", "usdt"].forEach((k) => { const v = Number(d[k]); if (v > 0) targets[k] = v; });
        if (note && d.updated_at) {
          const mins = Math.max(0, Math.round((Date.now() - new Date(d.updated_at).getTime()) / 60000));
          note.textContent = mins < 1 ? "Actualizado hace instantes" : "Actualizado hace " + mins + " min";
        }
        if (visible) paint();
      } catch (e) {
        if (note) note.textContent = "Valores de referencia";
      }
    };

    const liveSection = document.getElementById("tasas");
    if (liveSection && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { visible = true; paint(); io.disconnect(); }
        });
      }, { threshold: 0.3 });
      io.observe(liveSection);
    } else { visible = true; }

    load();
    setInterval(load, 120000);
  }

  /* ---------- Correo: en escritorio abre Gmail con el destinatario listo ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      const to = a.getAttribute("href").replace("mailto:", "").split("?")[0];
      a.href =
        "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to) +
        "&su=" + encodeURIComponent("Consulta sobre FinRate");
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  /* ---------- Smooth anchor scroll offset for fixed nav ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: y, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  });
})();
